// backend/src/services/uitFaqService.js
// Service xử lý câu hỏi FAQ về UIT — kết hợp knowledge base và Gemini AI

import { UIT_KNOWLEDGE, CATEGORY_KEYWORDS } from '../data/uitKnowledge.js';

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

  // ── NGÀNH HỌC CỤ THỂ ──
  if (category === 'nganh_hoc') {
    const { nganh_hoc } = chuong_trinh_dao_tao;

    const map = {
      'khoa học máy tính': 'KHMT',
      khmt: 'KHMT',
      'kỹ thuật phần mềm': 'KTPM',
      ktpm: 'KTPM',
      'kỹ thuật máy tính': 'KTMT',
      ktmt: 'KTMT',
      'mạng máy tính': 'MMT',
      mmt: 'MMT',
      'hệ thống thông tin': 'HTTT',
      httt: 'HTTT',
      'an toàn thông tin': 'ATTT',
      attt: 'ATTT',
      'khoa học dữ liệu': 'KHDL',
      khdl: 'KHDL',
    };

    const viet_tat = Object.entries(map).find(([kw]) => q.includes(kw))?.[1];
    if (viet_tat) {
      const nganh = nganh_hoc.find((n) => n.viet_tat === viet_tat);
      if (nganh) return formatNganh(nganh);
    }

    // Liệt kê tất cả nếu hỏi chung
    let answer = `🎓 **UIT có ${nganh_hoc.length} ngành đào tạo đại học chính quy:**\n\n`;
    nganh_hoc.forEach((n, i) => {
      answer += `**${i + 1}. ${n.ten} (${n.viet_tat})**\n`;
      answer += `   📖 ${n.noi_dung_chinh}\n`;
      answer += `   💼 ${n.viec_lam}\n\n`;
    });
    answer += `\nGõ tên ngành để xem chi tiết hơn!`;
    return answer;
  }

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

  // ── QUY ĐỊNH HỌC VỤ ──
  if (category === 'quy_dinh') {
    const qd = quy_dinh_hoc_vu;

    if (q.includes('tốt nghiệp') || q.includes('điều kiện ra trường')) {
      let answer = `🎓 **Điều kiện tốt nghiệp UIT:**\n\n`;
      qd.dieu_kien_tot_nghiep.forEach((dk, i) => {
        answer += `${i + 1}. ${dk}\n`;
      });
      answer += `\n**📊 Xếp loại tốt nghiệp:**\n`;
      for (const [loai, dk] of Object.entries(qd.xep_loai_tot_nghiep)) {
        answer += `- **${loai}**: ${dk}\n`;
      }
      return answer;
    }

    if (q.includes('cảnh báo') || q.includes('buộc thôi học') || q.includes('đình chỉ')) {
      const cb = qd.canh_bao_hoc_vu;
      return (
        `⚠️ **Quy định cảnh báo học vụ:**\n\n` +
        `**Điều kiện bị cảnh báo:** ${cb.dieu_kien}\n\n` +
        `- 🔴 ${cb.muc_1}\n` +
        `- 🔴 ${cb.muc_2}\n` +
        `- 🔴 ${cb.muc_3}`
      );
    }

    if (q.includes('bảo lưu')) {
      const bl = qd.bao_luu;
      return (
        `📋 **Quy định bảo lưu học tập:**\n\n` +
        `- Tối đa bảo lưu: **${bl.toi_da}**\n` +
        `- Thủ tục: ${bl.thu_tuc}\n` +
        `- Lý do hợp lệ: ${bl.ly_do}`
      );
    }

    if (q.includes('học lại') || q.includes('điểm f')) {
      const hl = qd.hoc_lai;
      return (
        `🔄 **Quy định học lại:**\n\n` +
        `- ${hl.quy_dinh}\n` +
        `- Về điểm: ${hl.diem}\n` +
        `- Về học phí: ${hl.phi}`
      );
    }

    if (q.includes('thang điểm') || q.includes('gpa') || q.includes('xếp loại')) {
      let answer = `📊 **Thang điểm UIT:**\n\n`;
      for (const [loai, info] of Object.entries(qd.thang_diem)) {
        answer += `- **${loai}**: ${info.range} (thang 4: ${info.he4})\n`;
      }
      answer += `\n💡 ${qd.cach_tinh_gpa}`;
      return answer;
    }

    // Tổng hợp quy định
    let answer = `📋 **Quy định học vụ UIT (tóm tắt):**\n\n`;
    answer += `**Thang điểm:**\n`;
    for (const [loai, info] of Object.entries(qd.thang_diem)) {
      answer += `- ${loai}: ${info.range}\n`;
    }
    answer += `\n**Tín chỉ mỗi học kỳ:** Tối thiểu ${qd.so_tin_chi_toi_thieu} | Tối đa ${qd.so_tin_chi_toi_da}\n\n`;
    answer += `**Điều kiện tốt nghiệp:** ${qd.dieu_kien_tot_nghiep[0]}, ${qd.dieu_kien_tot_nghiep[1]}\n\n`;
    answer += `⚠️ **Cảnh báo học vụ:** ${qd.canh_bao_hoc_vu.dieu_kien}`;
    return answer;
  }

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

  // ── TUYỂN SINH ──
  if (category === 'tuyen_sinh') {
    const ts = tuyen_sinh;
    let answer = `🎯 **Tuyển sinh UIT 2024:**\n\n`;
    answer += `**Phương thức xét tuyển:**\n`;
    ts.phuong_thuc_2024.forEach((pm) => {
      answer += `- ${pm}\n`;
    });
    answer += `\n**Tổ hợp xét tuyển:** ${ts.to_hop_xet_tuyen.join(' | ')}\n\n`;
    answer += `**📊 Điểm chuẩn 2023 (tham khảo):**\n`;
    for (const [nganh, diem] of Object.entries(ts.diem_chuan_2023)) {
      answer += `- ${nganh}: **${diem}**\n`;
    }
    answer += `\n🌐 Thông tin chi tiết: ${ts.thong_tin_tuyen_sinh}`;
    return answer;
  }

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

  const prompt = `Bạn là trợ lý AI chính thức của Trường Đại học Công nghệ Thông tin UIT (ĐHQG-HCM).

Nhiệm vụ: Trả lời các câu hỏi về UIT bao gồm học phí, môn học, chương trình đào tạo, quy định học vụ, tuyển sinh, học bổng.

Dữ liệu tham khảo:
${JSON.stringify(UIT_KNOWLEDGE, null, 2)}

Quy tắc:
1. Trả lời bằng tiếng Việt có dấu đầy đủ
2. Ngắn gọn, rõ ràng, dùng bullet points và emoji khi phù hợp
3. KHÔNG bịa thông tin không có trong dữ liệu trên
4. Nếu không chắc, hướng dẫn liên hệ: daotao@uit.edu.vn hoặc portal.uit.edu.vn
5. Bắt đầu câu trả lời bằng emoji phù hợp

${historyContext ? `Lịch sử hội thoại:\n${historyContext}\n\n` : ''}Câu hỏi hiện tại: ${question}`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 800 },
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

  // 1. Thử tìm trong knowledge base trước (nhanh, chính xác)
  const kbAnswer = searchKnowledgeBase(question, category);
  if (kbAnswer) {
    return {
      answer: kbAnswer,
      source: 'knowledge_base',
      category,
    };
  }

  // 2. Kiểm tra câu hỏi thường gặp
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

  // 3. Gọi Gemini AI cho câu hỏi phức tạp hơn
  const aiAnswer = await askGeminiAboutUIT(question, conversationHistory);
  return {
    answer: aiAnswer,
    source: 'gemini_ai',
    category,
  };
}
