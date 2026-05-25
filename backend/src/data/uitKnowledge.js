// backend/src/data/uitKnowledge.js
// Cơ sở tri thức về Trường Đại học Công nghệ Thông tin UIT

export const UIT_KNOWLEDGE = {
  truong: {
    ten: 'Trường Đại học Công nghệ Thông tin (UIT)',
    ten_day_du: 'Trường Đại học Công nghệ Thông tin - Đại học Quốc gia TP. Hồ Chí Minh',
    ten_tieng_anh: 'University of Information Technology - Vietnam National University Ho Chi Minh City',
    viet_tat: 'UIT',
    thanh_lap: '2006',
    dia_chi: 'Khu phố 6, Phường Linh Trung, Thành phố Thủ Đức, TP.HCM',
    website: 'https://www.uit.edu.vn',
    portal_sv: 'https://portal.uit.edu.vn',
    dang_ky_tin_chi: 'https://portal.uit.edu.vn',
    dien_thoai: '(028) 37251997',
    email: 'dhcntt@uit.edu.vn',
    gio_lam_viec: 'Thứ 2 – Thứ 6: 7:30 – 11:30 và 13:30 – 16:30 (trừ ngày lễ)',
    mo_ta: 'UIT là trường đại học thành viên của ĐHQG-HCM, chuyên đào tạo về Công nghệ Thông tin, là một trong những cơ sở đào tạo CNTT hàng đầu Việt Nam.',
  },

  hoc_phi: {
    chinh_sach_chung: 'UIT áp dụng hình thức thu học phí theo tín chỉ. Sinh viên đóng học phí dựa trên số tín chỉ đăng ký mỗi học kỳ, không phải theo năm học.',
    muc_thu_2024_2025: {
      'Khoa học máy tính': '550.000 đ/tín chỉ',
      'Kỹ thuật máy tính': '550.000 đ/tín chỉ',
      'Kỹ thuật phần mềm': '550.000 đ/tín chỉ',
      'Mạng máy tính và truyền thông dữ liệu': '550.000 đ/tín chỉ',
      'Hệ thống thông tin': '550.000 đ/tín chỉ',
      'An toàn thông tin': '550.000 đ/tín chỉ',
      'Khoa học dữ liệu': '550.000 đ/tín chỉ',
    },
    vi_du_tinh: 'Ví dụ: Học kỳ đăng ký 20 tín chỉ → học phí = 20 × 550.000 = 11.000.000 đ',
    mien_giam: [
      'Sinh viên hộ nghèo: miễn 100% học phí (theo quy định Nhà nước)',
      'Sinh viên hộ cận nghèo: giảm 50% học phí',
      'Sinh viên đang hưởng chính sách xã hội khác: xem xét theo từng trường hợp',
      'Học bổng khuyến khích học tập: theo quyết định từng học kỳ (không miễn học phí, nhưng nhận tiền thưởng)',
    ],
    ho_so_mien_giam: [
      'Đơn xin miễn giảm học phí (theo mẫu của Phòng CTSV)',
      'Giấy chứng nhận hộ nghèo / cận nghèo (còn hiệu lực)',
      'Sổ hộ khẩu hoặc giấy tờ liên quan',
      'Nộp trong tuần đầu mỗi học kỳ tại Phòng Công tác Sinh viên',
    ],
    ky_dong: 'Học kỳ 1: Tháng 9 | Học kỳ 2: Tháng 2 | Học kỳ Hè: Tháng 7',
    phuong_thuc: 'Đóng học phí qua tài khoản ngân hàng hoặc tại quầy thu học phí của trường. Kiểm tra thông báo trên portal.uit.edu.vn.',
    luu_y: 'Mức học phí có thể thay đổi hàng năm theo quy định của ĐHQG-HCM. Sinh viên nên kiểm tra thông báo chính thức trên portal.uit.edu.vn để có thông tin cập nhật nhất.',
  },

  chuong_trinh_dao_tao: {
    he_dao_tao: 'Đào tạo theo hệ thống tín chỉ (CDIO)',
    thoi_gian_chuan: '4 năm (8 học kỳ)',
    tong_tin_chi: '142 tín chỉ (không kể GDQP và GDTC)',
    dai_cuong: {
      mo_ta: 'Chương trình đại cương (học kỳ 1-2) bao gồm các môn nền tảng chung cho toàn trường và các môn cơ sở ngành.',
      cac_mon_chinh: [
        'Toán cao cấp A1 (4 TC)',
        'Toán cao cấp A2 (4 TC)',
        'Xác suất thống kê (3 TC)',
        'Đại số tuyến tính (3 TC)',
        'Vật lý đại cương (3 TC)',
        'Tiếng Anh 1, 2, 3, 4 (tổng 8 TC)',
        'Triết học Mác – Lênin (3 TC)',
        'Kinh tế chính trị Mác – Lênin (2 TC)',
        'Chủ nghĩa xã hội khoa học (2 TC)',
        'Lịch sử Đảng Cộng sản Việt Nam (2 TC)',
        'Tư tưởng Hồ Chí Minh (2 TC)',
        'Giáo dục thể chất (5 TC – không tính vào tổng 142 TC)',
        'Giáo dục quốc phòng - an ninh (165 tiết – không tính vào tổng 142 TC)',
        'Nhập môn lập trình (3 TC)',
        'Cấu trúc dữ liệu và giải thuật (4 TC)',
        'Lập trình hướng đối tượng (3 TC)',
        'Cơ sở dữ liệu (3 TC)',
      ],
    },
    nganh_hoc: [
      {
        ten: 'Khoa học máy tính',
        viet_tat: 'KHMT',
        ma_nganh: '7480101',
        so_tin_chi: 142,
        thoi_gian: '4 năm',
        chi_tieu_2024: 350,
        chuan_dau_ra_ngoai_ngu: 'TOEIC 550 hoặc tương đương (B2)',
        noi_dung_chinh: 'Thuật toán nâng cao, Trí tuệ nhân tạo, Học máy, Thị giác máy tính, Xử lý ngôn ngữ tự nhiên, Lý thuyết tính toán, Mật mã học',
        viec_lam: 'Kỹ sư AI/ML, Nhà nghiên cứu, Kỹ sư phần mềm, Data Scientist',
        hoc_bong: 'Có học bổng Ngoại ngữ Anh văn, học bổng doanh nghiệp (Samsung, FPT, VNPT...)',
      },
      {
        ten: 'Kỹ thuật phần mềm',
        viet_tat: 'KTPM',
        ma_nganh: '7480103',
        so_tin_chi: 142,
        thoi_gian: '4 năm',
        chi_tieu_2024: 350,
        chuan_dau_ra_ngoai_ngu: 'TOEIC 550 hoặc tương đương (B2)',
        noi_dung_chinh: 'Công nghệ phần mềm, Kiểm thử phần mềm, Thiết kế hệ thống, Quản lý dự án CNTT, Phát triển ứng dụng Web/Mobile, DevOps',
        viec_lam: 'Lập trình viên, Kỹ sư kiểm thử, Quản lý dự án, Technical Lead',
        hoc_bong: 'Học bổng FPT Software, TMA Solutions, Axon Active...',
      },
      {
        ten: 'Kỹ thuật máy tính',
        viet_tat: 'KTMT',
        ma_nganh: '7480106',
        so_tin_chi: 142,
        thoi_gian: '4 năm',
        chi_tieu_2024: 200,
        chuan_dau_ra_ngoai_ngu: 'TOEIC 500 hoặc tương đương',
        noi_dung_chinh: 'Kiến trúc máy tính, Hệ thống nhúng, IoT, FPGA, Lập trình hệ thống, Vi điều khiển, Thiết kế chip',
        viec_lam: 'Kỹ sư phần cứng, Kỹ sư nhúng, Kỹ sư IoT, Thiết kế vi mạch',
        hoc_bong: 'Học bổng Intel, Renesas...',
      },
      {
        ten: 'Mạng máy tính và truyền thông dữ liệu',
        viet_tat: 'MMT',
        ma_nganh: '7480102',
        so_tin_chi: 142,
        thoi_gian: '4 năm',
        chi_tieu_2024: 200,
        chuan_dau_ra_ngoai_ngu: 'TOEIC 500 hoặc tương đương',
        noi_dung_chinh: 'Hệ thống mạng, Giao thức mạng, Bảo mật mạng, Điện toán đám mây, SDN, 5G/6G, Network Engineering',
        viec_lam: 'Kỹ sư mạng, Cloud Engineer, Network Security Engineer, SysAdmin',
        hoc_bong: 'Học bổng Cisco, Juniper...',
      },
      {
        ten: 'Hệ thống thông tin',
        viet_tat: 'HTTT',
        ma_nganh: '7480104',
        so_tin_chi: 142,
        thoi_gian: '4 năm',
        chi_tieu_2024: 200,
        chuan_dau_ra_ngoai_ngu: 'TOEIC 500 hoặc tương đương',
        noi_dung_chinh: 'Phân tích thiết kế hệ thống, ERP, Quản trị cơ sở dữ liệu, Thương mại điện tử, Business Intelligence',
        viec_lam: 'Phân tích hệ thống, DBA, Business Analyst, ERP Consultant',
      },
      {
        ten: 'An toàn thông tin',
        viet_tat: 'ATTT',
        ma_nganh: '7480202',
        so_tin_chi: 142,
        thoi_gian: '4 năm',
        chi_tieu_2024: 200,
        chuan_dau_ra_ngoai_ngu: 'TOEIC 550 hoặc tương đương',
        noi_dung_chinh: 'Mật mã học, Bảo mật hệ thống, An ninh mạng, Phân tích mã độc, Kiểm thử xâm nhập (Pentesting), Forensics',
        viec_lam: 'Chuyên gia bảo mật, Pentester, SOC Analyst, CISO',
      },
      {
        ten: 'Khoa học dữ liệu',
        viet_tat: 'KHDL',
        ma_nganh: '7480120',
        so_tin_chi: 142,
        thoi_gian: '4 năm',
        chi_tieu_2024: 200,
        chuan_dau_ra_ngoai_ngu: 'TOEIC 550 hoặc tương đương',
        noi_dung_chinh: 'Phân tích dữ liệu, Machine Learning, Deep Learning, Data Engineering, Big Data, Visualization',
        viec_lam: 'Data Scientist, Data Engineer, ML Engineer, Data Analyst',
      },
    ],
  },

  mon_hoc_pho_bien: [
    { ma: 'IT001', ten: 'Nhập môn lập trình', tc: 4, mo_ta: 'Nhập môn lập trình với ngôn ngữ C. Kiến thức cơ bản về biến, vòng lặp, hàm, mảng.' },
    { ma: 'IT002', ten: 'Lập trình hướng đối tượng', tc: 4, mo_ta: 'OOP với Java/C++. Kế thừa, đa hình, đóng gói, abstraction.' },
    { ma: 'IT003', ten: 'Cấu trúc dữ liệu và giải thuật', tc: 4, mo_ta: 'Stack, Queue, Tree, Graph, các thuật toán sắp xếp và tìm kiếm.' },
    { ma: 'IT004', ten: 'Cơ sở dữ liệu', tc: 3, mo_ta: 'Mô hình quan hệ, SQL, thiết kế CSDL, chuẩn hóa.' },
    { ma: 'IT005', ten: 'Mạng máy tính', tc: 3, mo_ta: 'Mô hình OSI/TCP-IP, giao thức mạng, routing, switching.' },
    { ma: 'IT006', ten: 'Hệ điều hành', tc: 3, mo_ta: 'Quản lý tiến trình, bộ nhớ, file system, Linux.' },
    { ma: 'SE104', ten: 'Nhập môn Công nghệ phần mềm', tc: 3, mo_ta: 'SDLC, mô hình phát triển phần mềm, UML, Agile/Scrum.' },
    { ma: 'CS114', ten: 'Học máy', tc: 3, mo_ta: 'Các thuật toán Machine Learning cơ bản: Regression, Classification, Clustering.' },
    { ma: 'IS207', ten: 'Phát triển ứng dụng Web', tc: 4, mo_ta: 'HTML/CSS/JS, React/Vue, Node.js, REST API.' },
    { ma: 'NT101', ten: 'An toàn mạng máy tính', tc: 3, mo_ta: 'Bảo mật mạng, tường lửa, VPN, phát hiện xâm nhập.' },
  ],

  quy_dinh_hoc_vu: {
    thang_diem: {
      'A (Giỏi)': { range: '8.5 – 10.0', he4: '4.0' },
      'B (Khá)': { range: '7.0 – 8.4', he4: '3.0' },
      'C (Trung bình)': { range: '5.5 – 6.9', he4: '2.0' },
      'D (Trung bình yếu)': { range: '4.0 – 5.4', he4: '1.0' },
      'F (Không đạt)': { range: 'Dưới 4.0', he4: '0.0' },
    },
    cach_tinh_gpa: 'GPA = Tổng (Điểm × Số tín chỉ môn) / Tổng số tín chỉ đã tích lũy',
    dieu_kien_tot_nghiep: [
      'Tích lũy đủ 142 tín chỉ bắt buộc (không tính GDQP, GDTC)',
      'GPA tích lũy ≥ 2.0/4.0',
      'Không bị kỷ luật ở mức đình chỉ học tập',
      'Đạt chuẩn đầu ra ngoại ngữ (TOEIC 500 hoặc tương đương)',
      'Hoàn thành Giáo dục quốc phòng và Giáo dục thể chất',
      'Nộp và được duyệt đơn xét tốt nghiệp trong thời gian quy định',
    ],
    xep_loai_tot_nghiep: {
      'Xuất sắc': 'GPA ≥ 3.6/4.0 và không có môn F, không học lại',
      'Giỏi': 'GPA ≥ 3.2/4.0 và không có môn F',
      'Khá': 'GPA ≥ 2.5/4.0',
      'Trung bình khá': 'GPA ≥ 2.0/4.0',
      'Trung bình': 'GPA < 2.0/4.0 (vẫn tốt nghiệp nếu đủ điều kiện khác)',
    },
    canh_bao_hoc_vu: {
      dieu_kien: 'GPA học kỳ < 1.2 hoặc GPA tích lũy < 2.0 hoặc nợ quá nhiều tín chỉ',
      muc_1: 'Cảnh báo lần 1: Nhắc nhở, bắt buộc gặp cố vấn học vụ',
      muc_2: 'Cảnh báo lần 2: Đình chỉ học 1 học kỳ',
      muc_3: 'Cảnh báo lần 3: Buộc thôi học (có thể xét hoàn cảnh đặc biệt)',
    },
    hoc_lai: {
      quy_dinh: 'Sinh viên bị điểm F được phép đăng ký học lại trong học kỳ tiếp theo.',
      diem: 'Điểm thi lại cao nhất sẽ thay thế điểm cũ trong bảng điểm.',
      phi: 'Học lại phải đóng học phí bình thường theo số tín chỉ.',
    },
    bao_luu: {
      toi_da: 'Tối đa 2 học kỳ trong suốt khóa học (không tính học kỳ đầu tiên)',
      thu_tuc: 'Nộp đơn xin bảo lưu tại Phòng Đào tạo trước khi học kỳ bắt đầu',
      ly_do: 'Lý do hợp lệ: bệnh nặng có giấy của bệnh viện, hoàn cảnh gia đình đặc biệt, nghĩa vụ quân sự...',
    },
    so_tin_chi_toi_thieu: 'Mỗi học kỳ đăng ký tối thiểu 14 tín chỉ (trừ học kỳ cuối)',
    so_tin_chi_toi_da: 'Mỗi học kỳ đăng ký tối đa 26 tín chỉ (sinh viên giỏi có thể xin đăng ký thêm)',
  },

  lich_hoc: {
    hoc_ky_1: { thoi_gian: 'Tháng 8 – Tháng 12', dang_ky: 'Tháng 7 – Tháng 8' },
    hoc_ky_2: { thoi_gian: 'Tháng 1 – Tháng 6', dang_ky: 'Tháng 12 – Tháng 1' },
    hoc_ky_he: {
      thoi_gian: 'Tháng 6 – Tháng 8',
      bat_buoc: false,
      mo_ta: 'Học kỳ hè không bắt buộc, sinh viên tự nguyện đăng ký để học nhanh hơn hoặc học lại môn F.',
    },
    quy_trinh_dang_ky: [
      'Bước 1: Xem kế hoạch học tập cá nhân trên portal.uit.edu.vn',
      'Bước 2: Mở hệ thống đăng ký tín chỉ trong thời gian quy định',
      'Bước 3: Đăng ký các học phần mong muốn (có thể bị trùng giờ → hệ thống báo)',
      'Bước 4: Xác nhận đăng ký và kiểm tra kết quả',
      'Bước 5: Đóng học phí theo thông báo của phòng Tài chính',
    ],
    thi_cuoi_ky: 'Thường diễn ra vào tháng 12 (HK1) và tháng 6 (HK2). Lịch thi chi tiết được đăng trên portal.uit.edu.vn trước 2 tuần.',
    thi_lai: 'Không có thi lại – sinh viên phải đăng ký học lại ở học kỳ sau nếu bị F.',
  },

  co_so_vat_chat: {
    khu_hoc: 'Khu A (Giảng đường, Hội trường), Khu B (Phòng thí nghiệm, Thư viện), Khu Ký túc xá',
    phong_thi_nghiem: [
      'Phòng lab Mạng máy tính',
      'Phòng lab Phần mềm (150+ máy tính)',
      'Phòng lab Phần cứng và IoT',
      'Phòng lab Bảo mật thông tin',
      'Phòng lab Data Science & AI',
    ],
    thu_vien: 'Thư viện UIT với hơn 30.000 đầu sách, tài liệu số IEEE Xplore, Springer...',
    ky_tuc_xa: {
      vi_tri: 'Trong khuôn viên trường',
      phi: 'Khoảng 400.000 – 600.000 đ/tháng',
      suc_chua: 'Khoảng 1.200 sinh viên',
      uu_tien: 'Sinh viên tỉnh xa, hộ nghèo, sinh viên năm 1',
    },
  },

  lien_he: {
    phong_dao_tao: {
      ten: 'Phòng Đào tạo Đại học',
      email: 'daotao@uit.edu.vn',
      dien_thoai: '(028) 37251997 - Ext: 103',
      gio_tiep: 'Thứ 2 – Thứ 6: 7:30 – 11:30 và 13:30 – 16:30',
      chuc_nang: 'Xử lý các vấn đề về đăng ký học phần, học vụ, chương trình đào tạo, tốt nghiệp',
    },
    phong_cong_tac_sv: {
      ten: 'Phòng Công tác Sinh viên',
      email: 'ctsv@uit.edu.vn',
      dien_thoai: '(028) 37251997 - Ext: 104',
      chuc_nang: 'Học bổng, kỷ luật sinh viên, hoạt động ngoại khóa, ký túc xá, hỗ trợ sinh viên',
    },
    phong_tai_chinh: {
      ten: 'Phòng Tài chính – Kế toán',
      email: 'taichinhketoan@uit.edu.vn',
      chuc_nang: 'Thu học phí, hoàn trả học phí, chính sách miễn giảm tài chính',
    },
    phong_khao_thi: {
      ten: 'Phòng Khảo thí và Đảm bảo chất lượng',
      email: 'khaothi@uit.edu.vn',
      chuc_nang: 'Lịch thi, phúc khảo điểm, chứng nhận điểm số',
    },
    cac_khoa: [
      { ten: 'Khoa Khoa học máy tính', email: 'khmt@uit.edu.vn' },
      { ten: 'Khoa Kỹ thuật phần mềm', email: 'ktpm@uit.edu.vn' },
      { ten: 'Khoa Kỹ thuật máy tính', email: 'ktmt@uit.edu.vn' },
      { ten: 'Khoa Mạng máy tính & TTDL', email: 'mmt@uit.edu.vn' },
      { ten: 'Khoa Hệ thống thông tin', email: 'httt@uit.edu.vn' },
      { ten: 'Khoa An toàn thông tin', email: 'attt@uit.edu.vn' },
      { ten: 'Khoa Khoa học và Kỹ thuật Thông tin', email: 'kstn@uit.edu.vn' },
    ],
  },

  hoc_bong: {
    loai: [
      {
        ten: 'Học bổng khuyến khích học tập',
        dieu_kien: 'GPA học kỳ ≥ 3.6/4.0, không bị kỷ luật, không có môn F',
        muc: 'Loại A: 3.000.000 đ/HK | Loại B: 2.000.000 đ/HK | Loại C: 1.000.000 đ/HK',
        thoi_diem: 'Xét và phát mỗi học kỳ',
      },
      {
        ten: 'Học bổng chính sách (miễn học phí)',
        dieu_kien: 'Sinh viên thuộc diện chính sách: hộ nghèo, con liệt sĩ, thương binh...',
        muc: 'Miễn toàn bộ hoặc một phần học phí theo quy định Nhà nước',
      },
      {
        ten: 'Học bổng doanh nghiệp',
        dieu_kien: 'Tuỳ theo yêu cầu của từng doanh nghiệp (thường GPA ≥ 3.0, kỹ năng chuyên môn)',
        cac_cty: 'Samsung, FPT Software, TMA Solutions, Axon Active, Renesas, Tiki, Momo, VNG...',
        muc: 'Từ 5.000.000 đ đến 30.000.000 đ/năm',
      },
      {
        ten: 'Học bổng VIED (Chương trình học bổng cấp Nhà nước)',
        mo_ta: 'Học bổng sau đại học, du học nước ngoài cho sinh viên xuất sắc',
      },
    ],
    ho_so_kkkht: [
      'Đơn xin học bổng (theo mẫu)',
      'Bảng điểm học kỳ có xác nhận của Phòng Đào tạo',
      'Không cần nộp hồ sơ riêng – hệ thống tự động xét dựa trên kết quả học tập',
    ],
  },

  tuyen_sinh: {
    phuong_thuc_2024: [
      'Phương thức 1: Xét điểm thi THPT Quốc gia (Toán, Vật lý/Hóa học, Tiếng Anh hoặc Toán, Lý, Hóa)',
      'Phương thức 2: Xét kết quả kỳ thi đánh giá năng lực ĐHQG-HCM',
      'Phương thức 3: Xét học bạ THPT (điểm trung bình môn Toán + 2 môn xét tuyển ≥ 22.5)',
      'Phương thức 4: Xét tuyển thẳng theo quy định của Bộ GD&ĐT',
    ],
    to_hop_xet_tuyen: ['A00 (Toán, Vật lý, Hóa học)', 'A01 (Toán, Vật lý, Tiếng Anh)', 'D01 (Toán, Ngữ văn, Tiếng Anh)'],
    diem_chuan_2023: {
      'KHMT': '25.5 (A00/A01)',
      'KTPM': '25.0 (A00/A01)',
      'KTMT': '23.5 (A00/A01)',
      'MMT': '23.0 (A00/A01)',
      'HTTT': '23.0 (A00/A01)',
      'ATTT': '25.0 (A00/A01)',
      'KHDL': '25.5 (A00/A01)',
    },
    thong_tin_tuyen_sinh: 'Xem chi tiết tại: https://tuyensinh.uit.edu.vn',
  },

  hoat_dong_sinh_vien: {
    clb: [
      'CLB Lập trình UIT (ITSC)',
      'CLB Trí tuệ nhân tạo (AI Club UIT)',
      'CLB Bảo mật thông tin (UIT CyberSec)',
      'CLB IoT & Robotics',
      'CLB Khởi nghiệp (UIT Startup)',
      'CLB Tiếng Anh (UIT English)',
      'CLB Nhiếp ảnh, Văn nghệ, Thể thao...',
    ],
    su_kien: [
      'UIT Hackathon (hàng năm)',
      'IT Fair UIT (triển lãm dự án sinh viên)',
      'Code Tour (lập trình thi đấu)',
      'CTF Competition (bảo mật)',
      'Career Day (ngày hội việc làm)',
    ],
    chuong_trinh_trao_doi: 'UIT có chương trình trao đổi sinh viên với các trường ĐH tại Nhật Bản, Hàn Quốc, Đài Loan, Pháp...',
  },

  cau_hoi_thuong_gap: [
    {
      hoi: 'UIT có mấy ngành đào tạo đại học?',
      tra_loi: 'UIT hiện có 7 ngành đào tạo đại học chính quy: Khoa học máy tính, Kỹ thuật phần mềm, Kỹ thuật máy tính, Mạng máy tính và truyền thông dữ liệu, Hệ thống thông tin, An toàn thông tin, Khoa học dữ liệu.',
    },
    {
      hoi: 'Học phí UIT bao nhiêu một tháng?',
      tra_loi: 'UIT thu học phí theo tín chỉ (khoảng 550.000 đ/tín chỉ năm 2024-2025), không tính theo tháng. Mỗi học kỳ (5 tháng) sinh viên đóng 1 lần dựa trên số tín chỉ đăng ký.',
    },
    {
      hoi: 'Điều kiện để tốt nghiệp UIT là gì?',
      tra_loi: 'Cần: (1) tích lũy đủ 142 tín chỉ, (2) GPA ≥ 2.0/4.0, (3) đạt chuẩn ngoại ngữ (TOEIC 500+), (4) hoàn thành GDQP và GDTC, (5) không có kỷ luật đình chỉ.',
    },
    {
      hoi: 'Sinh viên UIT học mấy năm?',
      tra_loi: 'Chương trình chuẩn là 4 năm (8 học kỳ). Sinh viên học tốt có thể rút ngắn còn 3.5 năm. Tối đa 6 năm để hoàn thành chương trình.',
    },
    {
      hoi: 'UIT ở đâu?',
      tra_loi: 'UIT tọa lạc tại Khu phố 6, Phường Linh Trung, Thành phố Thủ Đức, TP.HCM (gần Đại học Quốc gia TP.HCM).',
    },
  ],
};

// Từ khóa để phân loại câu hỏi
export const CATEGORY_KEYWORDS = {
  thong_tin_truong: [
    'nằm ở đâu', 'ở đâu', 'địa điểm', 'tọa lạc', 'vị trí', 'trường ở', 'đường nào',
    'quận nào', 'thủ đức', 'linh trung', 'uit là gì', 'uit là trường', 'giới thiệu',
    'thành lập', 'năm thành lập', 'trường nào', 'website', 'portal',
    'giờ làm việc', 'giờ mở cửa', 'trường cntt', 'đhqg', 'đại học quốc gia',
  ],
  hoc_phi: [
    'học phí', 'tiền học', 'đóng tiền', 'chi phí', 'học phí mỗi tín', 'mức thu',
    'miễn giảm', 'học bổng tài chính', 'tín chỉ bao nhiêu', 'mấy tiền', 'bao nhiêu tiền',
    'học phí theo', 'đóng học', 'thu học phí',
  ],
  chuong_trinh: [
    'chương trình', 'ngành học', 'ngành', 'chuyên ngành', 'tín chỉ', 'môn học bắt buộc',
    'đào tạo', 'khung chương trình', 'học những gì', 'kế hoạch học', 'lộ trình', 'học gì',
  ],
  nganh_hoc: [
    'khoa học máy tính', 'kỹ thuật phần mềm', 'kỹ thuật máy tính', 'mạng máy tính',
    'hệ thống thông tin', 'an toàn thông tin', 'khoa học dữ liệu', 'khmt', 'ktpm',
    'ktmt', 'mmt', 'httt', 'attt', 'khdl', 'ngành nào', 'bao nhiêu ngành',
  ],
  mon_hoc: [
    'môn', 'học phần', 'môn học', 'tín chỉ môn', 'tiên quyết', 'it001', 'it002',
    'it003', 'it004', 'se104', 'cs114', 'lập trình', 'cấu trúc dữ liệu', 'cơ sở dữ liệu',
  ],
  quy_dinh: [
    'quy định', 'cảnh báo', 'bảo lưu', 'học lại', 'tốt nghiệp', 'điều kiện tốt nghiệp',
    'gpa', 'điểm trung bình', 'xếp loại', 'xuất sắc', 'giỏi', 'khá', 'trung bình',
    'buộc thôi học', 'đình chỉ', 'thang điểm', 'điểm f',
  ],
  lien_he: [
    'liên hệ', 'email', 'số điện thoại', 'điện thoại', 'địa chỉ', 'phòng ban',
    'văn phòng', 'phòng đào tạo', 'phòng ctsv', 'phòng tài chính', 'gặp ai', 'hỏi ai',
  ],
  lich_hoc: [
    'lịch', 'thời khóa biểu', 'học kỳ', 'đăng ký môn', 'thời gian', 'khi nào',
    'lịch thi', 'thi khi nào', 'học kỳ hè', 'học mấy tháng',
  ],
  hoc_bong: [
    'học bổng', 'khuyến khích', 'hỗ trợ tài chính', 'doanh nghiệp tài trợ', 'tiêu chí học bổng',
  ],
  tuyen_sinh: [
    'tuyển sinh', 'điểm chuẩn', 'xét tuyển', 'đăng ký thi', 'hồ sơ nhập học',
    'điểm đầu vào', 'học bạ', 'đánh giá năng lực',
  ],
  co_so_vat_chat: [
    'ký túc xá', 'ktx', 'thư viện', 'phòng lab', 'phòng máy', 'cơ sở', 'khuôn viên',
    'phòng thí nghiệm',
  ],
  hoat_dong: [
    'câu lạc bộ', 'clb', 'hoạt động', 'ngoại khóa', 'hackathon', 'sự kiện', 'trao đổi',
    'du học', 'thi đấu', 'it fair', 'itsc', 'ai club', 'startup',
  ],
};

