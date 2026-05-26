// backend/src/services/ragService.js
// RAG Service — In-Memory Vector Search
// Dùng HuggingFace Inference API để embed query (miễn phí, cùng model với Colab)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// ─── Model phải khớp với Colab ────────────────────────────────────────────────
const HF_MODEL = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2';
const HF_API_URL = `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_MODEL}`;

// ─── Tải dữ liệu vector vào bộ nhớ (RAM) ──────────────────────────────────────
let vectorDB = [];
try {
  const filePath = path.join(__dirname, '../../scripts/chunks_with_embeddings.json');
  if (fs.existsSync(filePath)) {
    vectorDB = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`[ragService] ✅ Đã tải ${vectorDB.length} chunks vào bộ nhớ (dim=${vectorDB[0]?.embedding?.length})`);
  }
} catch (e) {
  console.log('[ragService] Chưa có chunks_with_embeddings.json, RAG chưa sẵn sàng.');
}

export async function isRagReady() {
  return vectorDB.length > 0;
}

// ─── Thuật toán Cosine Similarity ─────────────────────────────────────────────
function cosineSimilarity(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ─── Cache đơn giản trong memory ─────────────────────────────────────────────
const memoryCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// ─── Bước 1: Embed query bằng HuggingFace (cùng model với Colab) ──────────────
// Trả về null nếu thất bại (không throw) — hệ thống tự dùng Gemini thuần
async function embedQuery(question) {
  // HuggingFace Inference API — timeout 8s để tránh treo chatbox
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: question, options: { wait_for_model: false } }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      // Xử lý các định dạng response khác nhau của HF
      if (Array.isArray(data)) {
        const vec = Array.isArray(data[0]) ? (Array.isArray(data[0][0]) ? data[0][0] : data[0]) : data;
        if (Array.isArray(vec) && vec.length > 10) return vec;
      }
    }
    // 503 = model đang load → trả về null, không throw
    console.warn(`[ragService] HuggingFace status ${response.status} — dùng Gemini thuần`);
  } catch (err) {
    console.warn('[ragService] HuggingFace timeout/error:', err.message);
  }

  // Thử Gemini embedding làm fallback
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (apiKey) {
    for (const model of ['text-embedding-004', 'embedding-001']) {
      try {
        const url = `${GEMINI_BASE}/${model}:embedContent?key=${apiKey}`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: `models/${model}`,
            content: { parts: [{ text: question }] },
            taskType: 'RETRIEVAL_QUERY',
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          const values = data?.embedding?.values;
          if (values?.length > 0) return values;
        }
      } catch (_) { /* thử model tiếp theo */ }
    }
  }

  return null; // Không throw — cho phép Gemini trả lời thuần
}

// ─── Bước 2: Tìm chunks liên quan ─────────────────────────────────────────────
function retrieveRelevantChunks(queryEmbedding, topK = 5) {
  if (!queryEmbedding || vectorDB.length === 0) return [];
  if (queryEmbedding.length !== vectorDB[0].embedding.length) {
    console.warn(`[ragService] Vector dim mismatch: query=${queryEmbedding.length}, db=${vectorDB[0].embedding.length}`);
    return [];
  }
  return vectorDB
    .map(chunk => ({ ...chunk, similarity: cosineSimilarity(queryEmbedding, chunk.embedding) }))
    .filter(c => c.similarity > 0.3)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

// ─── Bước 3: Tạo câu trả lời bằng Gemini với RAG context ─────────────────────
async function generateAnswerWithContext(question, relevantChunks, conversationHistory = []) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return { text: 'GEMINI_API_KEY chưa được cấu hình. Liên hệ daotao@uit.edu.vn.', model: 'no_key' };

  const historyText = conversationHistory.slice(-6)
    .map(m => `${m.role === 'user' ? 'Người dùng' : 'Trợ lý'}: ${m.content}`)
    .join('\n');

  const contextText = relevantChunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n');

  const prompt = `Bạn là trợ lý AI học vụ của Trường Đại học Công nghệ Thông tin (UIT).
Dựa vào các THÔNG TIN TRÍCH XUẤT dưới đây, hãy trả lời câu hỏi của người dùng.
Lưu ý: "Công nghệ phần mềm" và "Kỹ thuật phần mềm" là một.
Nội dung của bạn phải:
1. Chính xác, ngắn gọn, thân thiện (có emoji).
2. Nếu thông tin trích xuất không đủ chi tiết nhưng bạn có thể suy luận được từ ngữ cảnh (ví dụ tóm tắt những gì sẽ được học), hãy cố gắng trả lời một cách khái quát.
3. CHỈ khi nào hoàn toàn không có bất kỳ thông tin nào liên quan, bạn mới dùng câu trả lời: "Để biết chi tiết về nội dung này, bạn vui lòng truy cập portal.uit.edu.vn hoặc liên hệ daotao@uit.edu.vn để được hỗ trợ nhé."

${relevantChunks.length > 0 ? `THÔNG TIN TRÍCH XUẤT:\n${contextText}\n` : ''}
${historyText ? `\nLỊCH SỬ HỘI THOẠI:\n${historyText}` : ''}
CÂU HỎI HIỆN TẠI: ${question}`;

  const models = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];
  for (const model of models) {
    try {
      const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
        }),
      });
      if (response.status === 429) {
        console.warn(`[ragService] Model ${model} bị rate limit (429). Đang thử model khác...`);
        continue; // Thử model tiếp theo thay vì dừng hẳn
      }
      if (!response.ok) {
        const errData = await response.text();
        console.warn(`[ragService] Model ${model} failed (${response.status}):`, errData);
        continue;
      }
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) return { text, model };
    } catch (err) {
      console.warn(`[ragService] Model ${model} error:`, err.message);
    }
  }

  return { text: 'Xin lỗi, hệ thống AI đang quá tải. Xin bạn vui lòng thử lại sau 1 phút.', model: 'fallback' };
}

// ─── Hàm chính: RAG Pipeline (không bao giờ throw) ───────────────────────────
export async function ragChat(question, conversationHistory = []) {
  const cacheKey = simpleHash(question.toLowerCase().trim());

  const cached = memoryCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return { ...cached.data, fromCache: true };
  }

  // Embed query (trả null nếu thất bại, không throw)
  const queryEmbedding = await embedQuery(question);

  // Tìm chunks (trả [] nếu embedding null)
  const relevantChunks = retrieveRelevantChunks(queryEmbedding);
  console.log(`[ragService] embedding=${queryEmbedding ? 'OK' : 'null'}, chunks=${relevantChunks.length}`);

  // Luôn tạo được câu trả lời (kể cả khi không có RAG context)
  const { text: answer, model } = await generateAnswerWithContext(question, relevantChunks, conversationHistory);

  const sources = relevantChunks.map(c => ({
    id: c.id, category: c.category, similarity: Math.round(c.similarity * 100),
  }));

  const result = { answer, sources, model, fromCache: false };
  memoryCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

