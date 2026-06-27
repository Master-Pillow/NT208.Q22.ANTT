# 📋 KẾ HOẠCH 5 NGÀY — THÊM TÍNH NĂNG THEO YÊU CẦU CỦA THẦY

> Dự án **AdvisorHub** (NT208.Q22.ANTT). Stack: React+TS+Vite (FE) · Node+Express (BE) · PostgreSQL (Neon) · Socket.IO · Recharts · Gemini.
> Nhóm 3 người: **Trương** (Data/Python) · **Trung** (Backend) · **Trường Hồ** (Frontend).
> Chốt: scraper cào **cổng SV UIT thật bằng cookie**; email qua **Gmail SMTP (App Password)**.

---

## 1. SÁU NHÓM TÍNH NĂNG (phát biểu lại)

| # | Tính năng | Mô tả & yêu cầu chi tiết |
|---|-----------|--------------------------|
| **A** | **Python cào điểm bằng cookie** | Đăng nhập cổng SV UIT bằng cookie phiên (né SSO/captcha). Nhập danh sách MSSV → cào bảng điểm từng SV → xuất JSON đúng schema → gọi API import. Batch ~1000 MSSV, rate-limit, log lỗi, retry. |
| **B** | **Xu hướng điểm theo kỳ** | GPA từng học kỳ; phát hiện kỳ **tụt điểm** (giảm so kỳ trước); **điểm TB tích lũy**; đường xu hướng. |
| **C** | **Tuyên dương SV tiến bộ** | GPA kỳ tăng / vượt đỉnh cũ → nhãn "Tiến bộ / Tuyên dương". |
| **D** | **Phân tích lớp + biểu đồ** | Vào quản lý lớp hiện ngay: **tỷ lệ rớt**, **GPA TB lớp**, **phân bố điểm**; biểu đồ **to/rộng hơn**, responsive. |
| **E** | **Gửi thông báo qua email** | Tạo cảnh báo/nhắn tin → email tới gmail SV (nodemailer + Gmail SMTP). Đảm bảo `students.email` đầy đủ. |
| **F** | **Lý lịch SV + trạng thái "bỏ thi"** | Trang lý lịch học tập đầy đủ hơn; thêm trạng thái **Bỏ thi/Vắng thi** trong dữ liệu & bảng điểm. |

---

## 2. PHÂN VAI & SỞ HỮU

- **Trương — Data/Python:** A (scraper) + phần dữ liệu của F (bỏ thi) + chạy batch 1000.
- **Trung — Backend:** API import (A), analytics SQL (B/C/D), email (E), migration DB (F).
- **Trường Hồ — Frontend:** biểu đồ & UI (B/C/D), lý lịch (F-UI), insight panel.

---

## 3. HỢP ĐỒNG DỮ LIỆU (chốt NGÀY 1 — khoá để 3 người chạy song song)

**3.1. JSON scraper → API import** (`POST /admin/import/grades`, role ADMIN):
```json
{
  "source": "uit-portal",
  "scraped_at": "2026-06-23T10:00:00Z",
  "students": [
    {
      "mssv": "21520001",
      "full_name": "Nguyen Van A",
      "courses": [
        {
          "code": "NT208",
          "name": "An toan he thong thong tin",
          "credits": 4,
          "semester": "HK2-2024",
          "letter_grade": "A",        // A|B|C|D|F | null
          "numeric_grade": 9.0,        // 0-10 | null
          "status": "GRADED"           // GRADED | ABSENT(bỏ thi) | IN_PROGRESS
        }
      ]
    }
  ]
}
```
> `numeric_grade` thang 10 → BE quy đổi `gpa_points` (thang 4). `status=ABSENT` = bỏ thi.

**3.2. API metrics — GOM SỐ LIỆU CHO BIỂU ĐỒ** (BE → FE). Mỗi scope trả về **đủ data để vẽ mọi chart của scope đó** trong 1 lần gọi (tránh N request):

- `GET /metrics/student/:mssv` (ADMIN/ADVISOR-lớp-mình/chính SV đó):
```json
{
  "scope": "student",
  "cumulative_gpa": 3.12,
  "by_semester": [{ "semester":"HK1-2023","gpa":3.4,"avg_numeric":7.8,"credits_earned":18,"credits_debt":0,"failed":0,"absent":0 }],
  "grade_distribution": { "A":12,"B":8,"C":3,"D":1,"F":2,"ABSENT":1 },
  "dropped_semesters": ["HK2-2024"],
  "improving": true,
  "vs_class_gpa": [{ "semester":"HK1-2023","student":3.4,"class_avg":2.9 }]
}
```
- `GET /metrics/class/:code` (ADMIN + ADVISOR lớp mình): `{ avg_gpa, fail_rate, grade_distribution, gpa_by_semester:[...], failrate_by_course:[{code,name,fail_rate}], failrate_by_semester:[...], gpa_histogram:[{bucket:"<2.0",count}], top_improving:[...], top_declining:[...], at_risk_count, total_students }`
- `GET /metrics/cohort/:cohort` (ADMIN): `{ avg_gpa, gpa_by_year:[{year,gpa}], failrate_by_year:[...], classes_compare:[{class_code,avg_gpa,fail_rate}], grade_distribution }`
- `GET /metrics/system` (ADMIN): `{ status_distribution:{ACTIVE,AT_RISK,...}, gpa_trend_by_semester:[...], anomalies_by_type:[...], cohorts_compare:[...] }`

> Mọi endpoint hỗ trợ query `?from=HK1-2023&to=HK2-2024` để lọc theo kỳ/năm. Số liệu tính bằng SQL `GROUP BY`, không tính ở FE.

**3.2bis. API AI phân tích** (xem mục 8):
- `POST /ai/grade-insight` body `{ scope:"student|class|cohort|system", id, refresh?:bool }` → `{ summary_md, headline, trend, highlights:[...], risks:[...], commendations:[...], actions:[...], generated_at }`

**3.3. Migration F:** thêm `grades.status VARCHAR(20) DEFAULT 'GRADED' CHECK (status IN ('GRADED','ABSENT','IN_PROGRESS'))`; cho phép `letter_grade/gpa_points NULL` khi `ABSENT`.

---

## 3bis. CATALOG BIỂU ĐỒ (mọi số liệu đều xem được bằng chart)

Dùng **Recharts ^3.8.1** (đã cài). Mỗi chart bọc `<ResponsiveContainer width="100%">` để **rộng/co giãn**. FE viết component dùng lại theo loại, rồi nạp data từ API metrics mục 3.2.

### Cấp 1 — SINH VIÊN (trang Xem điểm / Lý lịch)
| # | Biểu đồ | Loại | Trục/giá trị |
|---|---------|------|--------------|
| S1 | **GPA theo từng kỳ** | Line/Area | x=kỳ, y=GPA(0–4); chấm đỏ kỳ tụt |
| S2 | Điểm TB (thang 10) theo kỳ | Line | x=kỳ, y=avg_numeric |
| S3 | Phân bố điểm chữ của SV | Pie/Bar | A/B/C/D/F/Bỏ thi |
| S4 | Tín chỉ tích lũy & nợ theo kỳ | Stacked Bar | đạt vs nợ |
| S5 | Số môn rớt theo kỳ | Bar | x=kỳ, y=số môn F |
| S6 | GPA của SV vs GPA TB lớp | Multi-line | 2 đường so sánh |

### Cấp 2 — LỚP (trang Quản lý lớp)
| # | Biểu đồ | Loại | Ghi chú |
|---|---------|------|---------|
| C1 | GPA TB lớp theo kỳ | Line | xu hướng lớp |
| C2 | Phân bố điểm chữ toàn lớp | Bar/Pie | A→F + bỏ thi |
| C3 | Tỷ lệ rớt theo môn (top khó) | Horizontal Bar | sắp giảm dần |
| C4 | Tỷ lệ rớt theo kỳ | Line | % F theo kỳ |
| C5 | Histogram phân bố GPA SV | Bar | bucket <2.0 / 2–2.5 / 2.5–3 / 3–3.5 / >3.5 |
| C6 | Top SV tiến bộ / tụt | Bar | xanh tăng, đỏ giảm |

### Cấp 3 — KHOÁ / NĂM (admin)
| # | Biểu đồ | Loại |
|---|---------|------|
| K1 | GPA TB theo năm học | Line |
| K2 | Tỷ lệ rớt theo năm | Line |
| K3 | So sánh các lớp cùng khoá (GPA + tỷ lệ rớt) | Grouped Bar |
| K4 | Phân bố điểm toàn khoá | Bar |

### Cấp 4 — TOÀN TRƯỜNG (admin dashboard)
| # | Biểu đồ | Loại |
|---|---------|------|
| T1 | Phân bố trạng thái SV (ACTIVE/AT_RISK/…) | Pie |
| T2 | Xu hướng GPA toàn trường theo kỳ | Line |
| T3 | Số cảnh báo theo loại anomaly | Bar |
| T4 | So sánh các khoá | Grouped Bar |

> **Tương tác:** mỗi trang có bộ lọc kỳ/năm (`from`/`to`), chuyển kỳ → mọi chart cập nhật. Tooltip + legend tiếng Việt có dấu. Nút "Xuất ảnh/PNG" (optional).

---

## 8. TẦNG AI PHÂN TÍCH CHỈ SỐ (điểm nhấn)

**Ý tưởng:** sau khi API metrics đã tính ra số liệu, gửi **bản tóm tắt số liệu (không gửi dữ liệu thô)** cho Gemini để sinh nhận định bằng tiếng Việt. Tái dùng pattern gọi Gemini (`gemini-1.5-flash:generateContent`) và guard `assertAiAccess`/`assertClassAccess` đã có trong `aiBriefService.js`.

**Service mới:** `backend/src/services/gradeInsightService.js`
- Input: scope + id → gọi nội bộ hàm metrics (mục 3.2) → đóng gói thành prompt súc tích (GPA theo kỳ, kỳ tụt, tỷ lệ rớt, top môn khó, SV tiến bộ/cần lưu ý).
- Gọi Gemini với **structured prompt** yêu cầu trả JSON: `headline, trend, highlights[], risks[], commendations[], actions[], summary_md`.
- **Cache** kết quả vào bảng `ai_briefs` (hoặc bảng mới `ai_grade_insights`) theo `(scope,id,hash_metrics)`; chỉ gọi lại Gemini khi `refresh=true` hoặc số liệu đổi → tiết kiệm quota.
- Fallback **rule-based** (không cần Gemini): nếu hết quota, tự sinh nhận định theo luật (GPA giảm ≥0.5 → cảnh báo; tăng → tuyên dương; tỷ lệ rớt > X% → lưu ý môn).

**Endpoint:** `POST /ai/grade-insight` — ADMIN/ADVISOR (lớp mình); SV chỉ xem scope của chính mình. Qua `verifyToken` + role check.

**Frontend:** cạnh mỗi nhóm biểu đồ có panel **"🤖 AI phân tích"** với nút *Phân tích*. Render `summary_md` + các bullet (điểm sáng / rủi ro / tuyên dương / đề xuất hành động). Loading skeleton; nút *Làm mới phân tích*.

**Ví dụ output AI mong muốn (class scope):**
> *"GPA trung bình lớp KHMT2021 giảm từ 3.1 (HK1-2023) xuống 2.7 (HK2-2024), chủ yếu do tỷ lệ rớt môn **Giải tích 2** tăng lên 24%. 3 SV cần lưu ý: … Có 5 SV tiến bộ rõ rệt nên tuyên dương: … Đề xuất: mở nhóm phụ đạo Giải tích, hẹn tư vấn 3 SV nguy cơ."*

---

## 4. KẾ HOẠCH THEO NGÀY

### NGÀY 1 — Thiết kế & khung (mọi người unblock nhau)
- **Cả nhóm (sáng):** chốt hợp đồng dữ liệu mục 3 (JSON import + 4 endpoint metrics + endpoint AI) + migration. Tạo nhánh `feature/grades-v2`.
- **Trương:** dựng `scraper/` (`requirements.txt`: requests, beautifulsoup4, lxml, python-dotenv). Đăng nhập cổng SV bằng **cookie thủ công** (copy từ trình duyệt → `.env`), tải **1 trang điểm** thật, in HTML, xác định selector. Output: cào 1 SV ra dict.
- **Trung:** chạy migration mục 3.3; scaffold `POST /admin/import/grades` (verifyToken + ADMIN, validate, chưa ghi DB); cấu hình nodemailer + gửi 1 email test qua Gmail SMTP.
- **Trường Hồ:** dựng **bộ component chart tái dùng** trong `components/charts/`: `LineTrend`, `BarDist`, `StackedBar`, `PieDist`, `HBar`, `Histogram` — đều bọc `ResponsiveContainer`, nhận props `{data, x, series, color}`. Nạp **mock data** đúng shape mục 3.2. Dựng khung bộ lọc kỳ/năm.

### NGÀY 2 — Lõi: import + metrics SQL + chart SV
- **Trương:** loop danh sách MSSV (`mssv.txt`), parse robust, map JSON mục 3.1, xử lý **bỏ thi**/môn chưa điểm, rate-limit + retry, log SV lỗi. Test 10–20 MSSV.
- **Trung:** **upsert** import trong transaction (`$1,$2` chống SQLi), quy đổi thang10→GPA4. Hiện thực `GET /metrics/student/:mssv` (đủ data S1–S6).
- **Trường Hồ:** ráp **6 chart cấp SINH VIÊN (S1–S6)** vào trang Xem điểm + Lý lịch, nối `GET /metrics/student`. Đánh dấu kỳ tụt; nhãn "Tuyên dương" khi `improving`.

### NGÀY 3 — Metrics lớp/khoá + chart cấp 2–4
- **Trung:** `GET /metrics/class/:code` (C1–C6) + `GET /metrics/cohort/:cohort` (K1–K4) + `GET /metrics/system` (T1–T4); rule tuyên dương / tụt; lọc `from`/`to`.
- **Trường Hồ:** ráp **chart cấp LỚP (C1–C6)** vào Quản lý lớp; **cấp KHOÁ (K1–K4)** + **TOÀN TRƯỜNG (T1–T4)** vào admin dashboard. Bộ lọc kỳ/năm hoạt động trên mọi chart.
- **Trương:** chạy `scraper → import` end-to-end với Trung; sửa lệch schema; verify số liệu khớp DB.

### NGÀY 4 — Tầng AI phân tích + email + batch 1000
- **Trung:** `gradeInsightService.js` + `POST /ai/grade-insight` (tái dùng Gemini của `aiBriefService.js`), cache + fallback rule-based; email khi at-risk/GPA tụt (notification + gmail SV, tiếng Việt **có dấu**, throttle).
- **Trường Hồ:** panel **"🤖 AI phân tích"** cạnh mỗi nhóm chart (SV / lớp / khoá / hệ thống), render `summary_md` + bullet (điểm sáng/rủi ro/tuyên dương/hành động); nút *Làm mới*. Rà mọi chart cho **rộng & responsive mobile**.
- **Trương:** chạy **batch ~1000 MSSV**, kiểm tra toàn vẹn (trùng/thiếu/bỏ thi), xuất báo cáo cào được/lỗi.

### NGÀY 5 — Test, bảo mật, đóng gói, demo
- **Cả nhóm:** test end-to-end; sửa bug; kiểm tra mọi chart hiển thị đúng số liệu thật sau import.
- **Bảo mật (AGENTS.md):** mọi API mới qua `verifyToken` + role check; STUDENT gọi API admin/AI → 403; SV chỉ xem metrics của chính mình; query tham số hoá; **không commit** cookie/`.env`/app password/API key.
- **Đóng gói:** `scraper/README.md` (lấy cookie, chạy, import); cập nhật `.env.example` (SMTP, GEMINI_API_KEY); ghi chú deploy.
- **Demo:** cào 1 batch → import → chart GPA theo kỳ/lớp/khoá → bấm **AI phân tích** → tỷ lệ rớt + tuyên dương → cảnh báo gửi email. Cập nhật `THUYET_TRINH.md`.

---

## 5. TIÊU CHÍ NGHIỆM THU
- [ ] Scraper đăng nhập bằng cookie, nhập danh sách MSSV, cào & xuất JSON đúng schema; chạy được batch ~1000, có log lỗi.
- [ ] `POST /admin/import/grades` import idempotent (chạy lại không nhân đôi), trong transaction.
- [ ] **Cấp SV:** đủ 6 chart S1–S6 (GPA/kỳ, điểm TB/kỳ, phân bố điểm, tín chỉ, môn rớt, SV-vs-lớp); đánh dấu kỳ tụt; điểm TB tích lũy.
- [ ] **Cấp lớp:** đủ C1–C6 (GPA lớp/kỳ, phân bố, tỷ lệ rớt theo môn & kỳ, histogram GPA, top tiến bộ/tụt).
- [ ] **Cấp khoá/năm + toàn trường:** K1–K4 & T1–T4 hiển thị; bộ lọc kỳ/năm cập nhật mọi chart.
- [ ] Mọi chart **responsive/rộng** (`ResponsiveContainer`), tooltip/legend tiếng Việt có dấu.
- [ ] **AI phân tích:** `POST /ai/grade-insight` chạy được cho cả 4 scope; có cache + fallback rule-based; panel FE render nhận định + bullet.
- [ ] SV tiến bộ có nhãn tuyên dương; trạng thái **bỏ thi** hiển thị trong bảng điểm & lý lịch.
- [ ] Cảnh báo at-risk gửi được email tới gmail SV (tiếng Việt có dấu).
- [ ] Mọi API mới có role check (SV chỉ xem dữ liệu của mình); không lộ secret.

## 6. RỦI RO & DỰ PHÒNG
| Rủi ro | Dự phòng |
|--------|----------|
| Cổng UIT đổi HTML/cookie hết hạn | Tách layer parse riêng; lưu HTML mẫu để test offline; hướng dẫn lấy lại cookie. |
| Captcha/khoá IP khi cào 1000 | Rate-limit + sleep ngẫu nhiên + chạy theo lô nhỏ; chấp nhận demo lô vài chục SV. |
| Gmail chặn app password / giới hạn gửi | Throttle, gửi gộp; dự phòng log/preview nếu bị chặn. |
| Lệch schema scraper↔import | Khoá hợp đồng dữ liệu NGÀY 1; có validate trả lỗi rõ. |
| Mất đồng bộ 3 người | Daily 15' đầu giờ; mock data để FE/BE không chờ scraper. |
