# AdvisorHub UIT

> Đồ án môn **NT208.Q22.ANTT — Lập trình Web** · Trường Đại học Công nghệ Thông tin (UIT)

**AdvisorHub UIT** là một nền tảng web quản lý **cố vấn học vụ** dành cho trường đại học,
được xây dựng theo mô hình thực tế của UIT. Hệ thống số hóa toàn bộ quy trình theo dõi
kết quả học tập, phát hiện sớm sinh viên có nguy cơ học vụ, kết nối sinh viên với cố vấn,
và hỗ trợ nhà trường ra quyết định bằng các công cụ phân tích dữ liệu và AI học vụ.

---

## Mục lục

1. [Web này là gì?](#1-web-này-là-gì)
2. [Web này giúp ích gì cho mọi người?](#2-web-này-giúp-ích-gì-cho-mọi-người)
3. [Danh sách tính năng đầy đủ](#3-danh-sách-tính-năng-đầy-đủ)
4. [Công nghệ sử dụng](#4-công-nghệ-sử-dụng)
5. [Hướng dẫn sử dụng theo từng vai trò](#5-hướng-dẫn-sử-dụng-theo-từng-vai-trò)
6. [Hướng dẫn cài đặt CHI TIẾT (dành cho người chạy local / VPS)](#6-hướng-dẫn-cài-đặt-chi-tiết-dành-cho-người-chạy-local--vps)
7. [Tài khoản demo](#7-tài-khoản-demo)
8. [Đăng nhập bằng cookie DAA](#8-đăng-nhập-bằng-cookie-daa)
9. [Cấu hình tùy chọn (Gemini AI & Email)](#9-cấu-hình-tùy-chọn-gemini-ai--email)
10. [Kiểm tra hệ thống & xử lý lỗi thường gặp](#10-kiểm-tra-hệ-thống--xử-lý-lỗi-thường-gặp)
11. [Bảo mật](#11-bảo-mật)
12. [Thành viên & tỷ lệ đóng góp](#12-thành-viên--tỷ-lệ-đóng-góp)

---

## 1. Web này là gì?

AdvisorHub UIT là một **ứng dụng web quản lý cố vấn học vụ (Academic Advising)**. Trong
một trường đại học, mỗi sinh viên đều có một **cố vấn học tập** chịu trách nhiệm theo dõi
tình hình học tập, nhắc nhở khi có nguy cơ rớt môn, cảnh báo học vụ, và tư vấn lộ trình.
Quy trình này ở nhiều nơi vẫn làm thủ công bằng Excel, email rời rạc, rất khó tổng hợp và
phát hiện sớm sinh viên gặp khó khăn.

AdvisorHub giải quyết vấn đề đó bằng cách đưa tất cả lên một nền tảng web thống nhất:

- **Tự động lấy & phân tích bảng điểm** của sinh viên (đồng bộ từ cổng DAA của UIT).
- **Tính toán GPA, tín chỉ tích lũy, môn rớt, môn vắng thi, xu hướng theo học kỳ.**
- **Phát hiện sớm sinh viên có nguy cơ học vụ** bằng bộ luật cảnh báo + AI.
- **Kết nối realtime** giữa sinh viên ↔ cố vấn ↔ nhà trường (nhắn tin, lịch hẹn, thông báo).
- **Phân quyền 3 vai trò rõ ràng**: Quản trị viên (ADMIN), Cố vấn (ADVISOR), Sinh viên (STUDENT).

Nói ngắn gọn: **AdvisorHub là “trung tâm điều khiển học vụ” cho cả nhà trường, cố vấn và sinh viên.**

---

## 2. Web này giúp ích gì cho mọi người?

| Đối tượng | Lợi ích cụ thể |
|---|---|
| **Sinh viên** | Xem điểm, GPA, tín chỉ và xu hướng học tập của chính mình ở một nơi; nhận cảnh báo sớm khi có nguy cơ rớt/đuối; đặt lịch hẹn và nhắn tin trực tiếp với cố vấn thay vì chờ email. |
| **Cố vấn học tập** | Có cái nhìn tổng quan toàn bộ lớp được phân công; biết ngay sinh viên nào đang gặp nguy cơ (GPA thấp, nhiều môn F, GPA tụt dốc…); dùng AI tóm tắt tình hình lớp; quản lý lịch hẹn và trao đổi tập trung. |
| **Quản trị viên / Nhà trường** | Quản lý toàn bộ lớp, cố vấn, sinh viên và môn học; theo dõi bức tranh học vụ toàn hệ thống; dùng AI để hỏi đáp dữ liệu (Chat-to-Data), phát hiện bất thường, khai phá mẫu (pattern mining). |
| **Phụ huynh / Phòng đào tạo (gián tiếp)** | Nhờ cảnh báo sớm và email tự động, sinh viên có nguy cơ được can thiệp kịp thời, giảm tỷ lệ buộc thôi học. |

**Giá trị cốt lõi:** chuyển công tác cố vấn học vụ từ *bị động* (phát hiện khi đã quá muộn)
sang *chủ động* (cảnh báo sớm, dựa trên dữ liệu).

---

## 3. Danh sách tính năng đầy đủ

### Quản lý & phân quyền
- Hệ thống **3 vai trò**: `ADMIN`, `ADVISOR`, `STUDENT`, mỗi vai trò có menu và quyền riêng.
- Xác thực bằng **JWT + bcrypt**; mọi API riêng tư đều kiểm tra token và role.
- **Cố vấn chỉ thấy lớp được phân công** (giới hạn theo bảng `advisor_class`).

### Dữ liệu học tập
- **Đồng bộ bảng điểm từ cổng DAA UIT** bằng cookie phiên của sinh viên.
- Tính **GPA, tín chỉ tích lũy, số môn rớt, số môn vắng thi, xu hướng GPA theo học kỳ**.
- Bảng điểm chi tiết theo từng môn, từng học kỳ.

### Cảnh báo học vụ (rule-based)
| Luật | Điều kiện | Mức độ |
|---|---|---|
| GPA thấp | GPA < 2.0 | HIGH (kèm môn F) / MEDIUM |
| Nhiều môn rớt | ≥ 2 môn F | HIGH |
| Rớt môn | điểm chữ = F hoặc điểm số < 4.0 | HIGH/MEDIUM |
| GPA tụt dốc | GPA học kỳ giảm ≥ 0.5 | HIGH (≥1.0) / MEDIUM |
| Tín chỉ tích lũy thấp | < 75% trung bình lớp | HIGH/MEDIUM |

### Trợ lý AI học vụ (chỉ ADMIN & ADVISOR)
- **AI Anomaly** — phát hiện sinh viên bất thường/nguy cơ.
- **AI Brief** — sinh báo cáo tóm tắt tình hình lớp/sinh viên bằng ngôn ngữ tự nhiên.
- **Chat-to-Data** — hỏi đáp dữ liệu học vụ bằng tiếng Việt (text-to-SQL).
- **Pattern Mining** — khai phá mẫu/quy luật trong dữ liệu học tập.

### Tương tác & kết nối
- **Nhắn tin realtime** giữa sinh viên và cố vấn (Socket.IO).
- **Đặt & quản lý lịch hẹn** tư vấn.
- **Thông báo trong ứng dụng** và **email cảnh báo tự động** (tùy chọn).
- **Hồ sơ cá nhân** (avatar, ảnh bìa, tiểu sử).

### Phân tích & trực quan hóa
- Dashboard tổng quan theo từng vai trò.
- Biểu đồ GPA, phân bố điểm, xu hướng học kỳ (Recharts).

---

## 4. Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Frontend | React + TypeScript + Vite (port **5173**) |
| Backend | Node.js + Express.js (port **4000**) |
| Database | PostgreSQL |
| Realtime | Socket.IO |
| Biểu đồ | Recharts |
| AI | Google Gemini API (AI Brief / Chat-to-Data) + rule-based (Anomaly) |
| Xác thực | JWT + bcrypt |

---

## 5. Hướng dẫn sử dụng theo từng vai trò

> Sau khi cài đặt xong (xem [mục 6](#6-hướng-dẫn-cài-đặt-chi-tiết-dành-cho-người-chạy-local--vps)),
> mở trình duyệt vào **http://localhost:5173** và đăng nhập bằng [tài khoản demo](#7-tài-khoản-demo).

> ⚠️ **Lưu ý quan trọng:** Không đăng nhập 2 vai trò khác nhau trên 2 tab của **cùng một trình duyệt**,
> vì các tab cùng `localhost:5173` dùng chung phiên đăng nhập. Hãy dùng **cửa sổ ẩn danh** hoặc
> **trình duyệt khác** để thử nhiều vai trò cùng lúc.

### 👤 Vai trò SINH VIÊN (STUDENT)

Mục tiêu: theo dõi kết quả học tập của bản thân và kết nối với cố vấn.

1. **Đăng nhập** bằng tài khoản demo `24521001@gm.uit.edu.vn` / `password123`,
   hoặc bằng [cookie DAA](#8-đăng-nhập-bằng-cookie-daa) để lấy điểm thật.
2. Vào **Hồ sơ học tập** → xem GPA, tín chỉ tích lũy, tình trạng học vụ.
3. Vào **Xem điểm** → xem bảng điểm chi tiết theo từng môn/học kỳ và biểu đồ xu hướng.
4. Vào **Lịch hẹn** → đặt lịch gặp cố vấn.
5. Vào **Nhắn tin** → trao đổi trực tiếp với cố vấn (realtime).
6. Vào **Thông báo** → xem cảnh báo học vụ và các thông báo từ hệ thống.

> Sinh viên **không** có quyền dùng các tính năng AI (sẽ nhận lỗi 403 nếu cố gọi).

### 🧑‍🏫 Vai trò CỐ VẤN (ADVISOR)

Mục tiêu: theo dõi và hỗ trợ các lớp được phân công.

1. **Đăng nhập** bằng `thornea@uit.edu.vn` / `password123` (hoặc `minhnv@uit.edu.vn`).
2. Vào **Tổng quan** → xem nhanh tình hình các lớp mình phụ trách.
3. Vào **Sinh viên** → xem danh sách sinh viên **chỉ trong lớp được phân công**, lọc sinh viên có nguy cơ.
4. Vào **AI: Cảnh báo** → chạy/đọc phát hiện bất thường cho lớp mình.
5. Vào **AI: Brief** → sinh báo cáo tóm tắt tình hình lớp.
6. Vào **Lịch hẹn** → duyệt và quản lý lịch hẹn với sinh viên.
7. Vào **Nhắn tin** → trao đổi với sinh viên.

> Cố vấn **chỉ thấy dữ liệu lớp của mình**, không thấy toàn hệ thống.

### 🛠️ Vai trò QUẢN TRỊ VIÊN (ADMIN)

Mục tiêu: quản lý toàn hệ thống và phân tích dữ liệu toàn trường.

1. **Đăng nhập** bằng `admin@uit.edu.vn` / `password123`.
2. Vào **Dashboard** → xem tổng quan toàn hệ thống.
3. Vào **Sinh viên** → nhập một MSSV và chọn **Tạo sinh viên test** để mở quyền đăng nhập DAA cho sinh viên đó (thay cho cách import CSV trước đây).
4. Vẫn ở **Sinh viên** → tìm theo MSSV, xem GPA và bảng điểm đã đồng bộ (có phân trang, tìm kiếm).
5. Vào **Lớp học / Cố vấn / Môn học** → quản lý (thêm/sửa) và **gán cố vấn cho lớp**.
6. Vào **AI Hub**:
   - **AI: Phát hiện bất thường** — quét toàn hệ thống.
   - **AI: Sinh Brief** — báo cáo tóm tắt.
   - **AI: Chat-to-Data** — hỏi đáp dữ liệu bằng tiếng Việt.
   - **AI: Pattern Mining** — khai phá mẫu/quy luật.

---

## 6. Hướng dẫn cài đặt CHI TIẾT (dành cho người chạy local / VPS)

> 📌 Phần này được viết **từng bước một** cho người lần đầu cài dự án, kể cả khi chạy trên
> **máy ảo / VPS riêng**. Dự án xử lý dữ liệu học vụ nhạy cảm nên **khuyến nghị chạy local**
> (không public ra Internet). Toàn bộ lệnh dưới đây dùng cho **Windows (PowerShell)**; phần cuối
> có ghi chú cho **Linux/Ubuntu VPS**.

### 6.0. Yêu cầu hệ thống (cài trước)

| Phần mềm | Phiên bản tối thiểu | Link tải |
|---|---|---|
| **Node.js** | 20 trở lên (kèm npm 10+) | https://nodejs.org/ (chọn bản LTS) |
| **PostgreSQL** | 14 trở lên | https://www.postgresql.org/download/ |
| **Git** | bản mới nhất | https://git-scm.com/downloads |

> Gemini API và Gmail SMTP là **tùy chọn**. Không có 2 dịch vụ này, hệ thống vẫn chạy đầy đủ
> các chức năng quản lý, dữ liệu demo và cảnh báo rule-based.

#### Kiểm tra đã cài đúng chưa

Mở **PowerShell** và chạy:

```powershell
node -v      # ví dụ: v20.x.x trở lên
npm -v       # ví dụ: 10.x.x trở lên
git --version
psql --version   # ví dụ: psql (PostgreSQL) 14.x trở lên
```

Nếu một trong các lệnh báo "không nhận diện được lệnh", hãy cài lại phần mềm tương ứng và
**khởi động lại PowerShell** (hoặc đăng xuất/đăng nhập lại Windows) để cập nhật biến môi trường PATH.

> 💡 Khi cài PostgreSQL, **ghi nhớ mật khẩu** bạn đặt cho user `postgres` — sẽ cần ở bước cấu hình.

---

### 6.1. Bước 1 — Lấy mã nguồn về máy

```powershell
git clone https://github.com/Master-Pillow/NT208.Q22.ANTT.git
cd NT208.Q22.ANTT
```

Sau lệnh này, bạn đang đứng ở **thư mục gốc** của dự án (chứa file `package.json` và 2 thư mục
`backend/`, `frontend/`). **Tất cả lệnh `npm` ở các bước sau đều chạy tại thư mục gốc này**, trừ khi
có ghi chú khác.

---

### 6.2. Bước 2 — Tạo database PostgreSQL trống

Tạo một database tên `LTWeb`. Có 2 cách:

**Cách A — dùng dòng lệnh `psql`:**

```powershell
psql -U postgres -c "CREATE DATABASE \"LTWeb\";"
```

(Nhập mật khẩu user `postgres` khi được hỏi.)

**Cách B — dùng pgAdmin (giao diện):** chuột phải vào *Databases* → *Create* → *Database…* →
đặt tên `LTWeb` → *Save*.

> ⚠️ Nếu database `LTWeb` đã tồn tại thì **bỏ qua bước này**, không tạo lại.

---

### 6.3. Bước 3 — Cấu hình backend (file `.env`)

Tạo file `backend/.env` (copy từ mẫu [backend/.env.example](backend/.env.example)) với nội dung tối thiểu:

```env
# Thay YOUR_PASSWORD bằng mật khẩu user postgres của bạn
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/LTWeb

# Chuỗi bí mật ngẫu nhiên, dài hơn 32 ký tự
JWT_SECRET=replace_with_a_random_string_longer_than_32_chars

# Cho phép frontend gọi backend
ALLOWED_ORIGINS=http://localhost:5173

# Tắt email cảnh báo khi chạy demo local
ALERT_EMAIL_ENABLED=false

# === Tùy chọn (có thể để trống) ===
GEMINI_API_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

Cách tạo nhanh file `.env` từ mẫu bằng PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
```

Sau đó **mở `backend/.env` và sửa lại `DATABASE_URL` và `JWT_SECRET`** cho đúng.

> 🔒 **Tuyệt đối không commit** file `.env`, API key, App Password hay cookie DAA lên GitHub.

---

### 6.4. Bước 4 — Cài đặt thư viện & tạo dữ liệu demo

Tại thư mục gốc, chạy một lệnh duy nhất:

```powershell
npm run setup
```

Lệnh này sẽ tự động:

1. Cài dependency cho **cả backend và frontend**.
2. Kiểm tra kết nối tới PostgreSQL.
3. Tạo schema (bảng) và **dữ liệu demo cơ bản**.
4. Tự dừng an toàn nếu phát hiện database đã có bảng `students` (tránh ghi đè).

**(Tùy chọn) Nạp bộ dữ liệu demo lớn** (hơn 1000 sinh viên, ~11.000 bản ghi điểm) để demo phong phú hơn:

```powershell
npm run db:large
```

> ⚠️ **Cảnh báo:** `npm run db:large` sẽ **reset toàn bộ schema `public`** của database trong
> `DATABASE_URL`. Chỉ dùng cho database demo, **không bao giờ** chạy trên dữ liệu thật.

Các file SQL chính (tham khảo):
- `database/schema_demo.sql` — schema và seed cơ bản.
- `database/grade_daa_sync.sql` — bảng/cột phục vụ đồng bộ DAA.
- `backend/sql/large_demo_seed_uit_700_plus.sql` — dữ liệu demo lớn.

---

### 6.5. Bước 5 — Chạy hệ thống

Tại thư mục gốc:

```powershell
npm run dev
```

Lệnh này chạy **đồng thời** backend và frontend:

- Backend: **http://localhost:4000**
- Frontend: **http://localhost:5173**

Hoặc chạy riêng bằng **hai cửa sổ PowerShell**:

```powershell
# Cửa sổ 1 — Backend
cd backend
npm run dev
# Kỳ vọng log: "Backend & Socket.io running on http://localhost:4000" + "DB connected"
```

```powershell
# Cửa sổ 2 — Frontend
cd frontend
npm run dev
# Mở: http://localhost:5173
```

**Kiểm tra backend sống chưa:** mở trình duyệt vào `http://localhost:4000/health`, kết quả đúng là:

```json
{"ok":true}
```

Sau đó mở **http://localhost:5173** và đăng nhập bằng [tài khoản demo](#7-tài-khoản-demo). 🎉

---

### 6.6. Ghi chú khi chạy trên VPS / máy ảo Linux (Ubuntu)

Nếu chạy trên VPS Ubuntu thay vì Windows, các bước tương tự, chỉ khác cách cài phần mềm nền:

```bash
# Cài Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Cài PostgreSQL & Git
sudo apt-get install -y postgresql git

# Tạo database
sudo -u postgres psql -c 'CREATE DATABASE "LTWeb";'
# (Đặt mật khẩu cho user postgres nếu cần)
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'YOUR_PASSWORD';"
```

Các bước clone, tạo `backend/.env`, `npm run setup`, `npm run dev` **giữ nguyên** như Windows
(dùng lệnh `cp` thay cho `Copy-Item`).

> 🔒 **Vì dự án xử lý dữ liệu học vụ nhạy cảm, khuyến nghị chỉ chạy local / trong mạng nội bộ.**
> Nếu bắt buộc mở ra ngoài, hãy đặt sau reverse proxy (Nginx) có HTTPS, đổi `JWT_SECRET` mạnh,
> giới hạn `ALLOWED_ORIGINS`, và **không** dùng dữ liệu thật trên server công khai.

---

## 7. Tài khoản demo

Mật khẩu chung cho tất cả tài khoản demo: **`password123`**

| Vai trò | Tài khoản |
|---|---|
| Admin | `admin@uit.edu.vn` |
| Advisor | `thornea@uit.edu.vn` |
| Advisor | `minhnv@uit.edu.vn` |
| Student | `24521001@gm.uit.edu.vn` |

---

## 8. Đăng nhập bằng cookie DAA

Luồng này dành cho **sinh viên** muốn lấy bảng điểm thật từ cổng DAA của UIT:

1. Admin đã tạo sẵn hồ sơ sinh viên trong AdvisorHub (bằng **Tạo sinh viên test** từ MSSV).
2. Sinh viên đăng nhập `https://daa.uit.edu.vn`.
3. Mở **DevTools → Network → chọn request loại `Doc`**.
4. Trong `Request Headers`, sao chép **toàn bộ** giá trị `Cookie`.
5. Tại trang đăng nhập AdvisorHub, chọn **Cookie DAA**.
6. Nhập **MSSV** và **dán cookie**.
7. AdvisorHub xác minh phiên, lấy bảng điểm, cập nhật database và cấp JWT.

> 🔒 Cookie chỉ được dùng trong request hiện tại, **không lưu database** và **không ghi log**.
> Không gửi cookie qua chat, ảnh chụp, email hay GitHub. Nếu lộ cookie, đăng xuất DAA và đăng nhập
> lại để hủy phiên cũ.

URL bảng điểm có thể cấu hình trong `.env`:

```env
DAA_GRADE_URL_TEMPLATE=https://daa.uit.edu.vn/print/sinhvien/kqhoctap/?sid={mssv}
```

---

## 9. Cấu hình tùy chọn (Gemini AI & Email)

### Gemini (cho AI Brief / Chat-to-Data)

```env
GEMINI_API_KEY=your_key
```

### Gmail SMTP (cho email cảnh báo tự động)

```env
ALERT_EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_account@gmail.com
SMTP_PASS=your_google_app_password
SMTP_FROM=AdvisorHub <your_account@gmail.com>
```

> Phải dùng **Google App Password**, không dùng mật khẩu Gmail chính.

---

## 10. Kiểm tra hệ thống & xử lý lỗi thường gặp

### Smoke test (khi backend đang chạy)

```powershell
npm run smoke
```

Smoke test kiểm tra: health check, đăng nhập 3 vai trò, Admin đọc danh sách sinh viên, Advisor đọc
đúng phạm vi, và Student **bị chặn** khỏi API Admin và API AI.

### Kiểm tra TypeScript & production build

```powershell
npm run check
```

### Lỗi thường gặp

| Triệu chứng | Cách xử lý |
|---|---|
| **`Network Error`** | Kiểm tra backend chạy ở cổng `4000`; mở `http://localhost:4000/health`; kiểm tra `ALLOWED_ORIGINS=http://localhost:5173`. |
| **Không thấy `DB connected`** | Kiểm tra PostgreSQL đang chạy; kiểm tra `DATABASE_URL`; đảm bảo database đã tạo. |
| **`column avatar_url does not exist`** | Khởi động lại backend — backend tự bổ sung cột `bio`, `avatar_url`, `cover_url`. |
| **Cookie DAA hết hạn** | Đăng xuất DAA, đăng nhập lại, sao chép cookie mới. |
| **Bị chuyển sang `/unauthorized`** | Kiểm tra đúng vai trò; không dùng 2 tài khoản trong 2 tab cùng trình duyệt; tải lại bằng `Ctrl + F5`. |
| **Port 4000 bị chiếm** | Chạy `netstat -ano \| findstr :4000` rồi `taskkill /PID <PID> /F` (Windows). |

---

## 11. Bảo mật

- Mọi API riêng tư đều dùng **JWT** và kiểm tra **role**.
- Cố vấn bị giới hạn theo `advisor_class` (chỉ lớp của mình).
- Sinh viên **không** được dùng API AI.
- Mọi query database đều dùng **tham số hóa** (chống SQL injection).
- **Không lưu, không log** cookie DAA.
- **Không commit** `.env` hay bất kỳ khóa bí mật nào.

---

## 12. Thành viên & tỷ lệ đóng góp

| STT | Họ và tên | Vai trò | Tỷ lệ đóng góp |
|:---:|---|---|:---:|
| 1 | Hồ Lê Anh Trường | Thành viên | **33.34%** |
| 2 | Nguyễn Xuân Trung | Thành viên | **33.33%** |
| 3 | Nguyễn Quốc Trường | Thành viên | **33.33%** |
| | | **Tổng cộng** | **100%** |

> Cả ba thành viên đóng góp ngang nhau trong suốt quá trình thực hiện đồ án.

---

> **Chúng em đã biết làm web và hiểu hệ thống web hoạt động như thế nào.**
