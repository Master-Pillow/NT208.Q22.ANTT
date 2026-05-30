// backend/scripts/generateChunks.js
// Chạy: node backend/scripts/generateChunks.js
// Kết quả: backend/scripts/chunks.json (upload lên Google Colab)

import { UIT_KNOWLEDGE } from '../src/data/uitKnowledge.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const chunks = [];

function addChunk(id, category, content) {
  if (content && content.trim().length > 20) {
    chunks.push({ id, category, content: content.trim() });
  }
}

// ── THÔNG TIN TRƯỜNG ─────────────────────────────────────────────────────────
const t = UIT_KNOWLEDGE.truong;
addChunk('truong_tong_quan', 'thong_tin_truong',
  `Trường Đại học Công nghệ Thông tin (UIT) là trường đại học thành viên của ĐHQG-HCM, thành lập năm ${t.thanh_lap}. ` +
  `Địa chỉ: ${t.dia_chi}. Website: ${t.website}. Portal sinh viên: ${t.portal_sv}. ` +
  `Điện thoại: ${t.dien_thoai}. Email: ${t.email}. Giờ làm việc: ${t.gio_lam_viec}. ${t.mo_ta}`
);

// ── HỌC PHÍ ──────────────────────────────────────────────────────────────────
const hp = UIT_KNOWLEDGE.hoc_phi;
addChunk('hoc_phi_chinh_sach', 'hoc_phi',
  `${hp.chinh_sach_chung} ` +
  `Năm học 2024-2025, mức thu là 550.000 đồng/tín chỉ áp dụng cho tất cả các ngành: ` +
  Object.entries(hp.muc_thu_2024_2025).map(([n, p]) => `${n}: ${p}`).join(', ') + `. ` +
  `${hp.vi_du_tinh}. Kỳ đóng học phí: ${hp.ky_dong}. Phương thức: ${hp.phuong_thuc}. ` +
  `Lưu ý: ${hp.luu_y}`
);
addChunk('hoc_phi_mien_giam', 'hoc_phi',
  `Chính sách miễn giảm học phí UIT: ${hp.mien_giam.join('; ')}. ` +
  `Hồ sơ cần nộp để được miễn giảm: ${hp.ho_so_mien_giam.join('; ')}.`
);

// ── CHƯƠNG TRÌNH ĐÀO TẠO ─────────────────────────────────────────────────────
const ct = UIT_KNOWLEDGE.chuong_trinh_dao_tao;
addChunk('chuong_trinh_tong_quat', 'chuong_trinh',
  `UIT đào tạo theo hệ thống tín chỉ (CDIO). Thời gian chuẩn: ${ct.thoi_gian_chuan}. ` +
  `Tổng số tín chỉ: ${ct.tong_tin_chi}. Chương trình đại cương học kỳ 1-2 gồm các môn: ` +
  ct.dai_cuong.cac_mon_chinh.join(', ') + '.'
);

ct.nganh_hoc.forEach(n => {
  addChunk(`nganh_${n.viet_tat.toLowerCase()}`, 'nganh_hoc',
    `Ngành ${n.ten} (viết tắt: ${n.viet_tat}, mã ngành: ${n.ma_nganh}). ` +
    `Tổng tín chỉ: ${n.so_tin_chi}. Thời gian: ${n.thoi_gian}. ` +
    `Chỉ tiêu 2024: ${n.chi_tieu_2024 || 'chưa công bố'} sinh viên. ` +
    `Chuẩn đầu ra ngoại ngữ: ${n.chuan_dau_ra_ngoai_ngu}. ` +
    `Nội dung chính: ${n.noi_dung_chinh}. ` +
    `Việc làm sau tốt nghiệp: ${n.viec_lam}. ` +
    (n.hoc_bong ? `Học bổng: ${n.hoc_bong}.` : '')
  );
});

// ── QUY ĐỊNH HỌC VỤ ──────────────────────────────────────────────────────────
const qd = UIT_KNOWLEDGE.quy_dinh_hoc_vu;
addChunk('quy_dinh_thang_diem', 'quy_dinh',
  `Thang điểm tại UIT: A (Giỏi): 8.5-10.0 điểm, quy đổi 4.0/4.0. ` +
  `B (Khá): 7.0-8.4 điểm, quy đổi 3.0/4.0. C (Trung bình): 5.5-6.9 điểm, quy đổi 2.0/4.0. ` +
  `D (Trung bình yếu): 4.0-5.4 điểm, quy đổi 1.0/4.0. F (Không đạt): dưới 4.0 điểm, quy đổi 0.0/4.0. ` +
  `Công thức tính GPA: ${qd.cach_tinh_gpa}.`
);
addChunk('quy_dinh_tot_nghiep', 'quy_dinh',
  `Điều kiện tốt nghiệp UIT: ${qd.dieu_kien_tot_nghiep.join('; ')}. ` +
  `Xếp loại tốt nghiệp: Xuất sắc - ${qd.xep_loai_tot_nghiep['Xuất sắc']}; ` +
  `Giỏi - ${qd.xep_loai_tot_nghiep['Giỏi']}; Khá - ${qd.xep_loai_tot_nghiep['Khá']}; ` +
  `Trung bình khá - ${qd.xep_loai_tot_nghiep['Trung bình khá']}.`
);
addChunk('quy_dinh_canh_bao', 'quy_dinh',
  `Quy định cảnh báo học vụ UIT: Điều kiện bị cảnh báo - ${qd.canh_bao_hoc_vu.dieu_kien}. ` +
  `${qd.canh_bao_hoc_vu.muc_1}. ${qd.canh_bao_hoc_vu.muc_2}. ${qd.canh_bao_hoc_vu.muc_3}.`
);
addChunk('quy_dinh_hoc_lai', 'quy_dinh',
  `Quy định học lại: ${qd.hoc_lai.quy_dinh} ${qd.hoc_lai.diem} ${qd.hoc_lai.phi}. ` +
  `Số tín chỉ đăng ký: tối thiểu ${qd.so_tin_chi_toi_thieu}, tối đa ${qd.so_tin_chi_toi_da}.`
);
addChunk('quy_dinh_bao_luu', 'quy_dinh',
  `Quy định bảo lưu học tập tại UIT: Tối đa ${qd.bao_luu.toi_da}. ` +
  `Thủ tục: ${qd.bao_luu.thu_tuc}. Lý do hợp lệ: ${qd.bao_luu.ly_do}.`
);

// ── LỊCH HỌC / ĐĂNG KÝ ───────────────────────────────────────────────────────
const lh = UIT_KNOWLEDGE.lich_hoc;
addChunk('lich_hoc_dang_ky', 'lich_hoc',
  `Lịch học tại UIT: Học kỳ 1 diễn ra ${lh.hoc_ky_1.thoi_gian}, đăng ký ${lh.hoc_ky_1.dang_ky}. ` +
  `Học kỳ 2 diễn ra ${lh.hoc_ky_2.thoi_gian}, đăng ký ${lh.hoc_ky_2.dang_ky}. ` +
  `Học kỳ hè: ${lh.hoc_ky_he.thoi_gian}, không bắt buộc - ${lh.hoc_ky_he.mo_ta}. ` +
  `Quy trình đăng ký: ${lh.quy_trinh_dang_ky.join(' → ')}. ` +
  `Thi cuối kỳ: ${lh.thi_cuoi_ky}. Lưu ý: ${lh.thi_lai}.`
);

// ── HỌC BỔNG ─────────────────────────────────────────────────────────────────
UIT_KNOWLEDGE.hoc_bong.loai.forEach((hb, i) => {
  addChunk(`hoc_bong_${i}`, 'hoc_bong',
    `Học bổng ${hb.ten} tại UIT: Điều kiện - ${hb.dieu_kien}. ` +
    `Mức học bổng: ${hb.muc || 'theo quy định'}. ` +
    (hb.cac_cty ? `Doanh nghiệp tài trợ: ${hb.cac_cty}.` : '') +
    (hb.mo_ta ? hb.mo_ta : '')
  );
});

// ── LIÊN HỆ ──────────────────────────────────────────────────────────────────
const lk = UIT_KNOWLEDGE.lien_he;
addChunk('lien_he_phong_ban', 'lien_he',
  `Liên hệ các phòng ban UIT: ` +
  `Phòng Đào tạo (học vụ, đăng ký, tốt nghiệp): email ${lk.phong_dao_tao.email}, ` +
  `điện thoại ${lk.phong_dao_tao.dien_thoai}, giờ tiếp: ${lk.phong_dao_tao.gio_tiep}. ` +
  `Phòng Công tác Sinh viên (học bổng, ngoại khóa): email ${lk.phong_cong_tac_sv.email}, ` +
  `điện thoại ${lk.phong_cong_tac_sv.dien_thoai}. ` +
  `Phòng Tài chính: email ${lk.phong_tai_chinh.email}. ` +
  `Phòng Khảo thí: email ${lk.phong_khao_thi.email}.`
);
addChunk('lien_he_khoa', 'lien_he',
  `Email các khoa tại UIT: ` +
  lk.cac_khoa.map(k => `${k.ten}: ${k.email}`).join('; ') + '.'
);

// ── CƠ SỞ VẬT CHẤT ────────────────────────────────────────────────────────────
const cs = UIT_KNOWLEDGE.co_so_vat_chat;
addChunk('co_so_vat_chat', 'co_so_vat_chat',
  `Cơ sở vật chất UIT: ${cs.khu_hoc}. ` +
  `Phòng thí nghiệm: ${cs.phong_thi_nghiem.join(', ')}. ${cs.thu_vien}.`
);
addChunk('ky_tuc_xa', 'co_so_vat_chat',
  `Ký túc xá UIT: Vị trí ${cs.ky_tuc_xa.vi_tri}. ` +
  `Phí: ${cs.ky_tuc_xa.phi}. Sức chứa: ${cs.ky_tuc_xa.suc_chua}. ` +
  `Ưu tiên cho: ${cs.ky_tuc_xa.uu_tien}.`
);

// ── TUYỂN SINH ────────────────────────────────────────────────────────────────
const ts = UIT_KNOWLEDGE.tuyen_sinh;
addChunk('tuyen_sinh_phuong_thuc', 'tuyen_sinh',
  `Phương thức tuyển sinh UIT 2024: ${ts.phuong_thuc_2024.join('; ')}. ` +
  `Tổ hợp xét tuyển: ${ts.to_hop_xet_tuyen.join(', ')}. ` +
  `Thông tin tuyển sinh: ${ts.thong_tin_tuyen_sinh}.`
);
addChunk('tuyen_sinh_diem_chuan', 'tuyen_sinh',
  `Điểm chuẩn UIT 2023 (thang điểm 30): ` +
  Object.entries(ts.diem_chuan_2023).map(([n, d]) => `${n}: ${d}`).join(', ') + '.'
);

// ── HOẠT ĐỘNG SINH VIÊN ───────────────────────────────────────────────────────
const hd = UIT_KNOWLEDGE.hoat_dong_sinh_vien;
addChunk('hoat_dong_clb', 'hoat_dong',
  `Câu lạc bộ tại UIT: ${hd.clb.join(', ')}. ` +
  `Sự kiện nổi bật: ${hd.su_kien.join(', ')}. ${hd.chuong_trinh_trao_doi}.`
);

// ── MÔN HỌC PHỔ BIẾN ──────────────────────────────────────────────────────────
UIT_KNOWLEDGE.mon_hoc_pho_bien.forEach(m => {
  addChunk(`mon_${m.ma.toLowerCase()}`, 'mon_hoc',
    `Môn học ${m.ten} (mã: ${m.ma}): ${m.tc} tín chỉ. ${m.mo_ta}`
  );
});

// ── CÂU HỎI THƯỜNG GẶP ───────────────────────────────────────────────────────
UIT_KNOWLEDGE.cau_hoi_thuong_gap.forEach((faq, i) => {
  addChunk(`faq_${i}`, 'general',
    `Câu hỏi: ${faq.hoi} Trả lời: ${faq.tra_loi}`
  );
});

// ── DỮ LIỆU TỪ WEBSITE (scrapedKnowledge.json) ────────────────────────────────
try {
  const scrapedPath = path.join(__dirname, '../src/data/scrapedKnowledge.json');
  if (fs.existsSync(scrapedPath)) {
    const scrapedData = JSON.parse(fs.readFileSync(scrapedPath, 'utf-8'));
    scrapedData.forEach((item, index) => {
      // Chia nhỏ nội dung thành từng đoạn để AI dễ tìm kiếm (mỗi đoạn dài hơn 50 ký tự)
      const paragraphs = item.content.split('\n').filter(p => p.trim().length > 50);
      paragraphs.forEach((p, pIndex) => {
        addChunk(`scraped_${index}_${pIndex}`, 'website_data', 
          `Trích từ bài viết: ${item.title} (Nguồn: ${item.url}). Nội dung chi tiết: ${p.trim()}`
        );
      });
    });
    console.log(`✅ Đã nạp thêm dữ liệu từ website (scrapedKnowledge.json)`);
  }
} catch (err) {
  console.log('⚠️ Không tìm thấy hoặc lỗi khi đọc scrapedKnowledge.json:', err.message);
}

// ─── Xuất file ────────────────────────────────────────────────────────────────
const outputPath = path.join(__dirname, 'chunks.json');
fs.writeFileSync(outputPath, JSON.stringify(chunks, null, 2), 'utf-8');
console.log(`✅ Đã tạo tổng cộng ${chunks.length} chunks → ${outputPath}`);
console.log(`✅ Đã tạo ${chunks.length} chunks → ${outputPath}`);
chunks.forEach(c => console.log(`  [${c.category}] ${c.id}: ${c.content.slice(0, 60)}...`));
