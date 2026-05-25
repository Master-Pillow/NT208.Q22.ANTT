// backend/src/services/uitFaqService.js
// Service xử lý câu hỏi FAQ về UIT — kết hợp knowledge base và Gemini AI

import { UIT_KNOWLEDGE, CATEGORY_KEYWORDS } from '../data/uitKnowledge.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load dữ liệu cào từ web UIT (nếu có)
let scrapedKnowledge = [];
try {
  const _p = path.join(__dirname, '../data/scrapedKnowledge.json');
  if (fs.existsSync(_p)) {
    scrapedKnowledge = JSON.parse(fs.readFileSync(_p, 'utf-8'));
    console.log(`[uitFaqService] Loaded ${scrapedKnowledge.length} scraped articles.`);
  }
} catch (e) {
  console.log('[uitFaqService] scrapedKnowledge load error:', e.message);
}


const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Danh sách model thử theo thứ tự ưu tiên (nếu model đầu fail thì thử tiếp)
const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
];

// ─── Phân loại câu hỏi ───────────────────────────────────────────────────────
function classifyQuestion(question) {
  const q = question.toLowerCase().normalize('NFC');
  const scores = {};

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[category] = keywords.filter((kw) => q.includes(kw)).length;
  }

  // Trả về category có điểm cao nhất
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : 'general';
}

// ─── Helpers format ───────────────────────────────────────────────────────────
function formatNganh(nganh) {
  return (
    `**${nganh.ten}** (${nganh.viet_tat})\n\n` +
    `- 🏷️ Mã ngành: ${nganh.ma_nganh}\n` +
    `- 📚 Tổng tín chỉ: ${nganh.so_tin_chi} tín chỉ\n` +
    `- ⏱️ Thời gian: ${nganh.thoi_gian}\n` +
    `- 🌍 Ngoại ngữ đầu ra: ${nganh.chuan_dau_ra_ngoai_ngu}\n` +
    `- 📖 Nội dung chính: ${nganh.noi_dung_chinh}\n` +
    `- 💼 Việc làm sau tốt nghiệp: ${nganh.viec_lam}\n` +
    (nganh.chi_tieu_2024 ? `- 🎯 Chỉ tiêu 2024: ${nganh.chi_tieu_2024} SV\n` : '')
  );
}

// ─── Tìm trong Knowledge Base ─────────────────────────────────────────────────
function searchKnowledgeBase(question, category) {
  const q = question.toLowerCase().normalize('NFC');
  const { hoc_phi, chuong_trinh_dao_tao, quy_dinh_hoc_vu, lien_he, lich_hoc, hoc_bong, tuyen_sinh, truong, hoat_dong_sinh_vien } = UIT_KNOWLEDGE;

  // ── THÔNG TIN TRƯỜNG / VỊ TRÍ ──
  if (category === 'thong_tin_truong') {
    return (
      `🏫 **Trường Đại học Công nghệ Thông tin (UIT)**\n\n` +
      `- 📍 **Địa chỉ:** ${truong.dia_chi}\n` +
      `- 📅 **Thành lập:** Năm ${truong.thanh_lap}\n` +
      `- 🌐 **Website:** ${truong.website}\n` +
      `- 🎓 **Portal SV:** ${truong.portal_sv}\n` +
      `- 📞 **Điện thoại:** ${truong.dien_thoai}\n` +
      `- 📧 **Email:** ${truong.email}\n` +
      `- 🕐 **Giờ làm việc:** ${truong.gio_lam_viec}\n\n` +
      `💡 ${truong.mo_ta}`
    );
  }

  // ── HOẠT ĐỘNG SINH VIÊN ──
  if (category === 'hoat_dong') {
    const hd = hoat_dong_sinh_vien;
    return (
      `🎉 **Hoạt động sinh viên UIT:**\n\n` +
      `**Câu lạc bộ:**\n` +
      hd.clb.map((c) => `- ${c}`).join('\n') +
      `\n\n**Sự kiện nổi bật:**\n` +
      hd.su_kien.map((s) => `- ${s}`).join('\n') +
      `\n\n🌏 ${hd.chuong_trinh_trao_doi}`
    );
  }

  // ── HỌC PHÍ ──
  if (category === 'hoc_phi') {
    let answer = `💰 **Học phí tại UIT (năm học 2024–2025)**\n\n`;
    answer += `📌 ${hoc_phi.chinh_sach_chung}\n\n`;

    answer += `**Mức học phí theo ngành:**\n`;
    for (const [nganh, phi] of Object.entries(hoc_phi.muc_thu_2024_2025)) {
      answer += `- ${nganh}: **${phi}**\n`;
    }

    answer += `\n💡 ${hoc_phi.vi_du_tinh}\n\n`;

    answer += `**🗓️ Kỳ đóng học phí:**\n${hoc_phi.ky_dong}\n\n`;

    answer += `**🎁 Chính sách miễn giảm:**\n`;
    hoc_phi.mien_giam.forEach((item) => {
      answer += `- ${item}\n`;
    });

    answer += `\n**📋 Hồ sơ miễn giảm cần nộp:**\n`;
    hoc_phi.ho_so_mien_giam.forEach((item) => {
      answer += `- ${item}\n`;
    });

    answer += `\n⚠️ *${hoc_phi.luu_y}*`;
    return answer;
  }

  // ── NGÀNH HỌC, QUY ĐỊNH, TUYỂN SINH được chuyển qua AI xử lý với data cào ──

  // ── CHƯƠNG TRÌNH ĐÀO TẠO ──
  if (category === 'chuong_trinh') {
    const { dai_cuong, nganh_hoc } = chuong_trinh_dao_tao;
    let answer = `📚 **Chương trình đào tạo UIT**\n\n`;
    answer += `- Hệ đào tạo: ${UIT_KNOWLEDGE.chuong_trinh_dao_tao.he_dao_tao}\n`;
    answer += `- Thời gian chuẩn: ${UIT_KNOWLEDGE.chuong_trinh_dao_tao.thoi_gian_chuan}\n`;
    answer += `- Tổng tín chỉ: **${UIT_KNOWLEDGE.chuong_trinh_dao_tao.tong_tin_chi}**\n\n`;

    answer += `**📖 Các môn đại cương chính (năm 1–2):**\n`;
    dai_cuong.cac_mon_chinh.slice(0, 8).forEach((mon) => {
      answer += `- ${mon}\n`;
    });
    answer += `- _(và nhiều môn khác...)_\n\n`;

    answer += `**🎓 Các ngành đào tạo:** ${nganh_hoc.map((n) => n.ten).join(', ')}`;
    return answer;
  }

  // (Quy định học vụ do AI RAG xử lý để lấy từ file quy chế mới nhất)

  // ── LIÊN HỆ ──
  if (category === 'lien_he') {
    const { phong_dao_tao, phong_cong_tac_sv, phong_tai_chinh, phong_khao_thi } = lien_he;
    return (
      `📞 **Thông tin liên hệ UIT:**\n\n` +
      `🏫 **Phòng Đào tạo** (học vụ, đăng ký, tốt nghiệp)\n` +
      `   📧 ${phong_dao_tao.email} | 📱 ${phong_dao_tao.dien_thoai}\n` +
      `   🕐 ${phong_dao_tao.gio_tiep}\n\n` +
      `👨‍🎓 **Phòng Công tác Sinh viên** (học bổng, kỷ luật, ngoại khóa)\n` +
      `   📧 ${phong_cong_tac_sv.email} | 📱 ${phong_cong_tac_sv.dien_thoai}\n\n` +
      `💰 **Phòng Tài chính – Kế toán** (học phí, hoàn phí)\n` +
      `   📧 ${phong_tai_chinh.email}\n\n` +
      `📝 **Phòng Khảo thí** (lịch thi, phúc khảo)\n` +
      `   📧 ${phong_khao_thi.email}\n\n` +
      `📍 **Địa chỉ:** ${UIT_KNOWLEDGE.truong.dia_chi}\n` +
      `🌐 **Website:** ${UIT_KNOWLEDGE.truong.website}\n` +
      `🎓 **Portal SV:** ${UIT_KNOWLEDGE.truong.portal_sv}`
    );
  }

  // ── LỊCH HỌC ──
  if (category === 'lich_hoc') {
    const lh = lich_hoc;

    if (q.includes('học kỳ hè') || q.includes('hè')) {
      return (
        `☀️ **Học kỳ Hè tại UIT:**\n\n` +
        `- Thời gian: ${lh.hoc_ky_he.thoi_gian}\n` +
        `- ${lh.hoc_ky_he.mo_ta}\n\n` +
        `Học kỳ hè thường mở cho các môn học phổ biến. Sinh viên nên theo dõi thông báo trên portal.uit.edu.vn.`
      );
    }

    let answer = `🗓️ **Lịch học tại UIT:**\n\n`;
    answer += `**Học kỳ 1:** ${lh.hoc_ky_1.thoi_gian} (Đăng ký: ${lh.hoc_ky_1.dang_ky})\n`;
    answer += `**Học kỳ 2:** ${lh.hoc_ky_2.thoi_gian} (Đăng ký: ${lh.hoc_ky_2.dang_ky})\n`;
    answer += `**Học kỳ Hè:** ${lh.hoc_ky_he.thoi_gian} (Không bắt buộc)\n\n`;
    answer += `**📝 Quy trình đăng ký môn học:**\n`;
    lh.quy_trinh_dang_ky.forEach((step) => {
      answer += `${step}\n`;
    });
    answer += `\n**🔗 Đăng ký tại:** ${UIT_KNOWLEDGE.truong.dang_ky_tin_chi}`;
    return answer;
  }

  // ── HỌC BỔNG ──
  if (category === 'hoc_bong') {
    const hb = hoc_bong;
    let answer = `🏆 **Học bổng tại UIT:**\n\n`;
    hb.loai.forEach((loai, i) => {
      answer += `**${i + 1}. ${loai.ten}**\n`;
      answer += `   - Điều kiện: ${loai.dieu_kien}\n`;
      answer += `   - Mức: ${loai.muc}\n`;
      if (loai.cac_cty) answer += `   - Doanh nghiệp: ${loai.cac_cty}\n`;
      answer += '\n';
    });
    answer += `\n💡 *Học bổng KKHT được xét tự động dựa trên kết quả học tập mỗi học kỳ.*`;
    return answer;
  }

  // (Tuyển sinh do AI RAG xử lý dựa trên bài viết tuyển sinh mới nhất)

  // ── CƠ SỞ VẬT CHẤT / KTX ──
  if (category === 'co_so_vat_chat') {
    const cs = UIT_KNOWLEDGE.co_so_vat_chat;

    if (q.includes('ký túc xá') || q.includes('ktx')) {
      const ktx = cs.ky_tuc_xa;
      return (
        `🏠 **Ký túc xá UIT:**\n\n` +
        `- Vị trí: ${ktx.vi_tri}\n` +
        `- Phí: ${ktx.phi}\n` +
        `- Sức chứa: ${ktx.suc_chua}\n` +
        `- Ưu tiên: ${ktx.uu_tien}\n\n` +
        `📋 Đăng ký KTX tại Phòng Công tác Sinh viên hoặc qua portal.`
      );
    }

    let answer = `🏫 **Cơ sở vật chất UIT:**\n\n`;
    answer += `**Phòng thí nghiệm:**\n`;
    cs.phong_thi_nghiem.forEach((ptg) => {
      answer += `- ${ptg}\n`;
    });
    answer += `\n📚 ${cs.thu_vien}\n`;
    answer += `\n🏠 **Ký túc xá:** ${cs.ky_tuc_xa.phi}/tháng, sức chứa ${cs.ky_tuc_xa.suc_chua} sinh viên.`;
    return answer;
  }

  // Không tìm thấy category phù hợp → fallback AI
  return null;
}

// ─── Gọi Gemini AI (tự thử lần lượt các model) ────────────────────────────────
async function askGeminiAboutUIT(question, conversationHistory = []) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return 'Xin lỗi, tôi chưa được cấu hình AI. Vui lòng liên hệ phòng đào tạo tại daotao@uit.edu.vn để được hỗ trợ.';
  }

  // Xây dựng context từ history (tối đa 6 lượt gần nhất)
  const historyContext = conversationHistory
    .slice(-6)
    .map((msg) => `${msg.role === 'user' ? 'Người dùng' : 'Trợ lý'}: ${msg.content}`)
    .join('\n');

  // ─── TỐI ƯU RAG: Tìm Top 3 tài liệu liên quan nhất ───
  let extraContext = '';
  const qLower = question.toLowerCase().normalize('NFC');
  const stopWords = ['các', 'những', 'của', 'với', 'trong', 'cho', 'hay', 'như', 'nào', 'gì', 'làm', 'sao', 'để', 'có', 'không'];
  const words = qLower.split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w));

  const scoredDocs = scrapedKnowledge.map(item => {
    let score = 0;
    const text = (item.title + ' ' + item.content).toLowerCase().normalize('NFC');
    
    // Thưởng điểm cao nếu câu hỏi chứa nguyên cụm tiêu đề (ví dụ: "an toàn thông tin", "quy chế đào tạo")
    if (qLower.includes(item.title.toLowerCase().normalize('NFC'))) score += 50;
    
    // Thưởng điểm nếu chứa cụm từ ghép liền kề
    if (words.length >= 2 && text.includes(words.join(' '))) score += 10;
    
    // Tính điểm đếm tần suất từ khóa
    for (const w of words) {
      if (text.includes(w)) score += 1;
    }
    
    return { ...item, score };
  });

  // Lấy Top 3 tài liệu có liên quan nhất (điểm > 0)
  const topDocs = scoredDocs.filter(d => d.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  if (topDocs.length > 0) {
    extraContext = topDocs.map((d, i) => `[Tài liệu ${i + 1}] Tiêu đề: ${d.title}\nTrích xuất: ${d.content.slice(0, 200000)}...`).join('\n\n');
  }

  const prompt = `Bạn là trợ lý AI chính thức của Trường Đại học Công nghệ Thông tin UIT (ĐHQG-HCM).

NHIỆM VỤ: Trả lời ĐÚNG TRỌNG TÂM, NGẮN GỌN, VÀ TRỰC TIẾP vào câu hỏi của người dùng.

${extraContext ? `✨ TÀI LIỆU THAM KHẢO TỪ WEB UIT (Căn cứ chính xác nhất):\n${extraContext}\n────────────────────────────────\n` : ''}ℹ️ Knowledge Base cơ bản:
${JSON.stringify({ truong: UIT_KNOWLEDGE.truong, lien_he: UIT_KNOWLEDGE.lien_he })}

QUY TẮC BẮT BUỘC:
1. CHỈ trả lời những gì người dùng hỏi. KHÔNG lan man, KHÔNG kể lể thêm thông tin thừa.
2. Dùng **bullet points** và emoji hợp lý để câu trả lời súc tích, dễ đọc.
3. Nếu dựa vào TÀI LIỆU THAM KHẢO, hãy tổng hợp lại thật tinh gọn, KHÔNG copy-paste nguyên văn dài dòng.
4. Nếu thông tin không có trong tài liệu, hướng dẫn liên hệ: daotao@uit.edu.vn.
5. Nếu câu hỏi yêu cầu so sánh hoặc liệt kê, hãy dùng định dạng danh sách.
6. Luôn giữ thái độ thân thiện, chuyên nghiệp.

${historyContext ? `Lịch sử hội thoại:\n${historyContext}\n\n` : ''}Câu hỏi hiện tại: ${question}`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 1600 },
  });

  // Thử lần lượt từng model cho đến khi thành công
  for (const model of GEMINI_MODELS) {
    const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (response.status === 404) {
        console.warn(`[uitFaqService] Model ${model} not found, trying next...`);
        continue; // Thử model tiếp theo
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.warn(`[uitFaqService] Model ${model} failed ${response.status}:`, errText.slice(0, 200));
        continue;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) {
        console.log(`[uitFaqService] Success with model: ${model}`);
        return text;
      }
    } catch (err) {
      console.warn(`[uitFaqService] Model ${model} error:`, err.message);
    }
  }

  // Tất cả models đều fail → fallback thân thiện
  console.error('[uitFaqService] All Gemini models failed.');
  return (
    'Xin lỗi, tôi đang gặp sự cố kết nối AI. Bạn có thể:\n\n' +
    '- 🌐 Truy cập: https://www.uit.edu.vn\n' +
    '- 📧 Email: daotao@uit.edu.vn\n' +
    '- 📱 Điện thoại: (028) 37251997\n' +
    '- 🎓 Portal SV: https://portal.uit.edu.vn'
  );
}



// ─── Hàm chính ────────────────────────────────────────────────────────────────
export async function processUitFaq(question, conversationHistory = []) {
  if (!question || !question.trim()) {
    throw Object.assign(new Error('Vui lòng nhập câu hỏi.'), { status: 400 });
  }

  const category = classifyQuestion(question);
  const q = question.toLowerCase().normalize('NFC');

  // Bỏ qua bước trả dữ liệu thô (raw data) ra cho người dùng.
  // Nhờ AI đọc và tự tóm tắt lại cho gọn.

  // 2. Thử tìm trong knowledge base (nhanh, chính xác)
  const kbAnswer = searchKnowledgeBase(question, category);
  if (kbAnswer) {
    return {
      answer: kbAnswer,
      source: 'knowledge_base',
      category,
    };
  }

  // 3. Kiểm tra câu hỏi thường gặp
  const faq = UIT_KNOWLEDGE.cau_hoi_thuong_gap.find((item) =>
    question.toLowerCase().includes(item.hoi.toLowerCase().split(' ').slice(1, 4).join(' '))
  );
  if (faq) {
    return {
      answer: `💡 ${faq.tra_loi}`,
      source: 'faq',
      category,
    };
  }

  // 4. Gọi Gemini AI cho câu hỏi phức tạp hơn
  const aiAnswer = await askGeminiAboutUIT(question, conversationHistory);
  return {
    answer: aiAnswer,
    source: 'gemini_ai',
    category,
  };
}

