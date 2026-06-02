// backend/src/services/ragService.js
// RAG Service — Keyword Search + Gemini Generation

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// ─── Tải dữ liệu raw vào RAM khi khởi động ────────────────────────────────────
let rawDB = [];
try {
  const filePath = path.join(__dirname, '../../scripts/chunks.json');
  if (fs.existsSync(filePath)) {
    rawDB = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`[ragService] ✅ Đã tải ${rawDB.length} chunks vào RAM`);
  } else {
    console.warn('[ragService] ⚠️  Không tìm thấy chunks.json');
  }
} catch (e) {
  console.error('[ragService] Lỗi khi tải chunks.json:', e.message);
}

export async function isRagReady() {
  return rawDB.length > 0;
}

// ─── Cache query ───────────────────────────────────────────────────────────────
const memoryCache = new Map();
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 giờ

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// ─── Chuẩn hóa text tiếng Việt cho tìm kiếm ──────────────────────────────────
function normalize(str) {
  return str
    .toLowerCase()
    // bỏ dấu cơ bản nhất định
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^\w\s]/g, ' ')
    .trim();
}

// ─── Bảng alias viết tắt phổ biến UIT ────────────────────────────────────────
const ALIASES = {
  attt: ['an toan thong tin', 'an toàn thông tin', 'information security', 'nt101', 'nt140', 'nganh attt', 'khoa attt'],
  cnpm: ['cong nghe phan mem', 'công nghệ phần mềm', 'software engineering', 'ky thuat phan mem', 'kỹ thuật phần mềm', 'ktpm', 'se104'],
  httt: ['he thong thong tin', 'hệ thống thông tin', 'information systems', 'is207'],
  khmt: ['khoa hoc may tinh', 'khoa học máy tính', 'computer science'],
  ktmt: ['ky thuat may tinh', 'kỹ thuật máy tính', 'computer engineering'],
  mmvttd: ['mang may tinh va truyen thong du lieu', 'mạng máy tính'],
  khdt: ['khoa hoc du lieu', 'khoa học dữ liệu', 'data science'],
  cq: ['chinh quy', 'chính quy'],
  vlvh: ['vua lam vua hoc', 'vừa làm vừa học'],
  // Mở rộng câu hỏi về môn học/chương trình đào tạo ATTT
  'mon hoc': ['hoc phan', 'mon thi', 'nt101', 'nt140', 'is101', 'noi dung hoc'],
  'chuong trinh': ['khung chuong trinh', 'ke hoach dao tao', 'tin chi', 'hoc ky'],
};

// Stop words tieng Viet
const STOP_WORDS = new Set(['va','cua','cho','voi','trong','co','la','duoc','cac','nhung','khong','nay','do','de','theo','hay','gi','tu','can','muon','bao','nhieu','the','nao','nhu','thi','ma','mot','se','ve','khi','tai','len','hoi','xem','ban','toi','minh']);

// ─── Tìm kiếm Keyword (TF-normalized) ────────────────────────────────────────
function retrieveRelevantChunks(question, topK = 10) {
  if (rawDB.length === 0) return [];

  const qRaw = question.toLowerCase().trim();
  const qNorm = normalize(qRaw);

  // Tách từ khóa, bỏ stop words
  const keywords = qNorm.split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w));

  // Mở rộng từ khóa từ alias
  const expandedKeywords = [...keywords];
  for (const [abbr, expansions] of Object.entries(ALIASES)) {
    if (qRaw.includes(abbr) || qNorm.includes(abbr)) {
      for (const exp of expansions) {
        expandedKeywords.push(...normalize(exp).split(/\s+/).filter(w => !STOP_WORDS.has(w)));
      }
    }
  }
  const uniqueKw = [...new Set(expandedKeywords)].filter(w => w.length > 1);

  const scoredChunks = rawDB.map(chunk => {
    const raw = chunk.content.toLowerCase();
    const norm = normalize(chunk.content);
    const chunkLen = Math.max(norm.length, 1);
    let score = 0;

    // Khớp cụm từ nguyên văn → bonus cao nhất
    if (raw.includes(qRaw)) score += 100;
    else if (norm.includes(qNorm)) score += 60;

    // TF-normalized: tần suất / độ dài chunk
    // → chunk ngắn và chuyên biệt được ưu tiên hơn PDF dài
    for (const kw of uniqueKw) {
      const re = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const count = (norm.match(re) || []).length;
      if (count > 0) {
        const tf = (count / chunkLen) * 1000;
        score += tf * (1 + kw.length * 0.15);
      }
    }

    // Bonus neu chunk co ma mon hoc (chu + so) va tu khoa lien quan
    if (/[A-Z]{2,4}\d{3}/.test(chunk.content)) {
      score += 15;
    }

    if (chunk.category) {
      const cat = normalize(chunk.category);
      for (const kw of uniqueKw) {
        if (cat.includes(kw)) score += 20;
      }
    }

    return { ...chunk, similarity: score };
  });

  const results = scoredChunks
    .filter(c => c.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  console.log(`[ragService] Keyword search: "${question}" -> ${results.length} chunks, top: ${results.slice(0,3).map(r=>r.id+':'+r.similarity.toFixed(1)).join(', ')}`);
  return results;
}

// ─── Tạo câu trả lời với Gemini ──────────────────────────────────────────────
async function generateAnswerWithContext(question, relevantChunks, conversationHistory = []) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return { text: 'GEMINI_API_KEY chưa được cấu hình. Liên hệ daotao@uit.edu.vn.', model: 'no_key' };

  // Lấy tối đa 4 turn gần nhất, mỗi turn tối đa 300 ký tự
  const historyText = conversationHistory
    .slice(-4)
    .map(m => `${m.role === 'user' ? 'Người dùng' : 'Trợ lý'}: ${String(m.content).slice(0, 300)}`)
    .join('\n');

  // Giới hạn mỗi chunk tối đa 800 ký tự để không làm prompt quá dài.
  // Kèm category (nếu có) để mô hình bám sát đúng chủ đề, tăng độ chính xác.
  const contextText = relevantChunks
    .map((c, i) => `[${i + 1}]${c.category ? ` (${c.category})` : ''} ${String(c.content).slice(0, 800)}`)
    .join('\n\n');

  const systemPrompt = `Bạn là trợ lý AI học vụ của Trường Đại học Công nghệ Thông tin UIT (ĐHQG-HCM).
Nhiệm vụ: Trả lời hữu ích, đúng trọng tâm câu hỏi của người dùng.
Quy tắc:
- Ngắn gọn, thân thiện, dùng emoji phù hợp; trình bày gạch đầu dòng nếu có nhiều ý.
- "Công nghệ phần mềm" = "Kỹ thuật phần mềm" (cùng một ngành).
- ƯU TIÊN dùng TÀI LIỆU THAM KHẢO bên dưới khi nó có thông tin → trả lời trực tiếp, KHÔNG bảo người dùng tra thêm.
- NẾU TÀI LIỆU KHÔNG CÓ hoặc không đủ thông tin: hãy DÙNG CÔNG CỤ TÌM KIẾM GOOGLE để tra cứu thông tin mới nhất (ưu tiên nguồn chính thức như uit.edu.vn, tuyensinh.uit.edu.vn, portal.uit.edu.vn), rồi tổng hợp lại trả lời. Mở đầu bằng "ℹ️ Theo thông tin tra cứu:" và nếu có thể thì nêu nguồn.
- KHÔNG bịa các con số chính xác (học phí, chỉ tiêu, mốc thời gian, điểm chuẩn) nếu không chắc — hãy tra cứu, hoặc nói rõ số liệu có thể thay đổi và cần kiểm chứng tại portal.uit.edu.vn / daotao@uit.edu.vn.
- Chỉ từ chối khi câu hỏi hoàn toàn không liên quan đến học tập/UIT (tán gẫu, chính trị, đời tư...).
- Trả lời hoàn chỉnh, KHÔNG bị cắt ngang.`;

  const userPrompt = `${relevantChunks.length > 0 ? `TÀI LIỆU THAM KHẢO:\n${contextText}\n\n` : ''}${historyText ? `LỊCH SỬ HỘI THOẠI:\n${historyText}\n\n` : ''}CÂU HỎI: ${question}`;

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  for (const model of models) {
    try {
      const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          // Cho phép Gemini tự tra Google khi tài liệu không có thông tin (grounding).
          tools: [{ google_search: {} }],
          generationConfig: {
            temperature: 0.15,
            maxOutputTokens: 4000,  // Tăng lên để không bị cắt
          },
        }),
      });

      if (response.status === 429) {
        console.warn(`[ragService] ${model} rate limit 429 → thử model tiếp`);
        continue;
      }
      if (!response.ok) {
        const err = await response.text();
        console.warn(`[ragService] ${model} failed (${response.status}):`, err);
        continue;
      }

      const data = await response.json();
      const finishReason = data?.candidates?.[0]?.finishReason;
      // Gộp text từ MỌI part (câu trả lời có grounding có thể bị tách nhiều phần)
      const text = (data?.candidates?.[0]?.content?.parts || [])
        .map(p => p?.text).filter(Boolean).join('').trim();

      if (finishReason === 'MAX_TOKENS') {
        console.warn(`[ragService] ${model} bị cắt do MAX_TOKENS — thêm dấu "..." cho người dùng biết`);
        return { text: (text || '') + '\n\n*(Câu trả lời bị cắt do quá dài. Bạn thử hỏi cụ thể hơn nhé!)*', model };
      }

      if (text) return { text, model };
    } catch (err) {
      console.warn(`[ragService] ${model} error:`, err.message);
    }
  }

  return { text: 'Xin lỗi, hệ thống AI đang quá tải. Vui lòng thử lại sau ít phút nhé! 🙏', model: 'fallback' };
}

// ─── Hàm chính: RAG Pipeline ─────────────────────────────────────────────────
export async function ragChat(question, conversationHistory = []) {
  const cacheKey = simpleHash(question.toLowerCase().trim());

  const cached = memoryCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log(`[ragService] Cache hit: "${question}"`);
    return { ...cached.data, fromCache: true };
  }

  const relevantChunks = retrieveRelevantChunks(question);
  const { text: answer, model } = await generateAnswerWithContext(question, relevantChunks, conversationHistory);

  const sources = relevantChunks.map(c => ({
    id: c.id, category: c.category, similarity: Math.round(c.similarity),
  }));

  const result = { answer, sources, model, fromCache: false };

  // KHÔNG cache các câu trả lời lỗi/tạm thời (key sai, quá tải, fallback) —
  // nếu cache, người dùng sẽ nhận lại câu lỗi suốt 12h dù lỗi đã được khắc phục.
  const TRANSIENT_MODELS = new Set(['no_key', 'fallback']);
  if (!TRANSIENT_MODELS.has(model)) {
    memoryCache.set(cacheKey, { data: result, timestamp: Date.now() });
  }
  return result;
}
