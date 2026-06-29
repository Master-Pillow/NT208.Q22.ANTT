# AdvisorHub UIT

Website quản lý cố vấn học vụ UIT, hỗ trợ quản lý lớp, sinh viên, lịch hẹn,
nhắn tin, phân tích kết quả học tập và cảnh báo học vụ.

## Chức năng chính

- Ba vai trò: `ADMIN`, `ADVISOR`, `STUDENT`.
- Admin quản lý lớp, cố vấn, sinh viên và xem bảng điểm toàn hệ thống.
- Advisor chỉ xem lớp được phân công trong `advisor_class`.
- Student đăng nhập bằng tài khoản demo hoặc cookie phiên DAA.
- Đăng nhập DAA đồng thời lấy và cập nhật bảng điểm của sinh viên.
- Phân tích GPA, tín chỉ, môn rớt/vắng thi và xu hướng theo học kỳ.
- AI Anomaly, AI Brief, Chat-to-Data và trợ lý học vụ UIT.
- Nhắn tin realtime, lịch hẹn, thông báo và email.

## Yêu cầu

- Node.js 20 trở lên.
- npm 10 trở lên.
- PostgreSQL 14 trở lên.
- Git.

Gemini và Gmail SMTP là tùy chọn. Không cấu hình hai dịch vụ này vẫn chạy được
các chức năng quản lý và dữ liệu demo.

## 1. Lấy mã nguồn

```powershell
git clone https://github.com/Master-Pillow/NT208.Q22.ANTT.git
cd NT208.Q22.ANTT
```

## 2. Tạo database

Tạo một database PostgreSQL trống tên `LTWeb` bằng pgAdmin hoặc lệnh:

```sql
CREATE DATABASE "LTWeb";
```

Không chạy lệnh trên nếu database đã tồn tại.

## 3. Cấu hình backend

Tạo `backend/.env` dựa trên [backend/.env.example](backend/.env.example):

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/LTWeb
JWT_SECRET=replace_with_a_random_string_longer_than_32_chars
ALLOWED_ORIGINS=http://localhost:5173
ALERT_EMAIL_ENABLED=false

# Tùy chọn
GEMINI_API_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

Không commit `.env`, API key, App Password hoặc cookie DAA lên GitHub.

## 4. Cài đặt và tạo dữ liệu demo

Tại thư mục gốc:

```powershell
npm run setup
```

Lệnh này:

1. Cài dependency cho backend và frontend.
2. Kiểm tra kết nối PostgreSQL.
3. Tạo schema và dữ liệu demo cơ bản.
4. Tự dừng nếu database đã có bảng `students`.

Muốn tạo lại database bằng bộ demo lớn:

```powershell
npm run db:large
```

> Cảnh báo: `db:large` reset schema `public` của database trong
> `DATABASE_URL`. Chỉ dùng cho database demo, không dùng trên dữ liệu thật.

Các file SQL chính:

- `database/schema_demo.sql`: schema và seed cơ bản.
- `database/grade_daa_sync.sql`: bảng và cột phục vụ đồng bộ DAA.
- `backend/sql/large_demo_seed_uit_700_plus.sql`: dữ liệu demo lớn.

## 5. Chạy hệ thống

Tại thư mục gốc:

```powershell
npm run dev
```

Lệnh này chạy đồng thời:

- Backend: `http://localhost:4000`
- Frontend: `http://localhost:5173`

Hoặc chạy riêng bằng hai terminal:

```powershell
cd backend
npm run dev
```

```powershell
cd frontend
npm run dev
```

Kiểm tra backend:

```text
http://localhost:4000/health
```

Kết quả đúng:

```json
{"ok":true}
```

## 6. Tài khoản demo

Mật khẩu chung: `password123`

| Vai trò | Tài khoản |
|---|---|
| Admin | `admin@uit.edu.vn` |
| Advisor | `aris.thorne@uit.edu.vn` |
| Advisor | `minh.nguyen@uit.edu.vn` |
| Student | `sv24521001@uit.edu.vn` |

## 7. Đăng nhập bằng cookie DAA

Luồng hiện tại dành cho sinh viên:

1. Admin vào **Sinh viên**, nhập MSSV và chọn **Tạo sinh viên test**.
2. Sinh viên đăng nhập `https://daa.uit.edu.vn`.
3. Mở DevTools → Network → chọn request loại `Doc`.
4. Trong `Request Headers`, sao chép toàn bộ giá trị `Cookie`.
5. Tại trang đăng nhập AdvisorHub, chọn **Cookie DAA**.
6. Nhập MSSV và dán cookie.
7. AdvisorHub xác minh phiên, lấy bảng điểm, cập nhật database và cấp JWT.

Cookie chỉ được dùng trong request hiện tại, không lưu database và không ghi log.
Không gửi cookie qua chat, ảnh chụp, email hoặc GitHub. Nếu cookie bị lộ, đăng xuất
DAA và đăng nhập lại để hủy phiên cũ.

URL bảng điểm có thể cấu hình:

```env
DAA_GRADE_URL_TEMPLATE=https://daa.uit.edu.vn/print/sinhvien/kqhoctap/?sid={mssv}
```

## 8. Kịch bản demo đề xuất

### Student

1. Đăng nhập bằng cookie DAA.
2. Mở **Xem điểm**.
3. Xem bảng điểm, GPA, tín chỉ và xu hướng học tập.
4. Tạo lịch hẹn hoặc nhắn tin cho cố vấn.

### Admin

1. Đăng nhập `admin@uit.edu.vn`.
2. Mở **Sinh viên**.
3. Nhập một MSSV để mở quyền đăng nhập DAA cho sinh viên test.
4. Tìm MSSV và chọn kết quả tìm kiếm hoặc biểu tượng con mắt.
5. Xem GPA và bảng điểm đã đồng bộ.
6. Mở dashboard và AI học vụ.

### Advisor

1. Đăng nhập `aris.thorne@uit.edu.vn`.
2. Xem lớp được phân công.
3. Xem phân tích lớp và sinh viên có nguy cơ.
4. Mở lịch hẹn và tin nhắn.

Không đăng nhập hai role trong hai tab cùng trình duyệt. Các tab cùng
`localhost:5173` dùng chung phiên. Hãy dùng cửa sổ ẩn danh hoặc trình duyệt khác.

## 9. Kiểm tra trước khi demo

Khi backend đang chạy:

```powershell
npm run smoke
```

Smoke test kiểm tra:

- Health check.
- Đăng nhập Admin, Advisor, Student.
- Admin đọc danh sách sinh viên.
- Advisor đọc đúng phạm vi sinh viên.
- Student bị chặn khỏi API Admin và API AI.

Kiểm tra TypeScript và production build:

```powershell
npm run check
```

## 10. Cấu hình tùy chọn

### Gemini

```env
GEMINI_API_KEY=your_key
```

### Gmail SMTP

```env
ALERT_EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_account@gmail.com
SMTP_PASS=your_google_app_password
SMTP_FROM=AdvisorHub <your_account@gmail.com>
```

Phải dùng Google App Password, không dùng mật khẩu Gmail chính.

## 11. Đồng bộ bằng cookie giảng viên

Phiên bản hiện tại đã hoàn thiện adapter bảng điểm sinh viên. Adapter tài khoản
giảng viên để tự lấy lớp và danh sách sinh viên được tách thành phần mở rộng vì
URL/cấu trúc Portal phụ thuộc quyền tài khoản thật.

Đặc tả triển khai nằm tại
[docs/TEACHER_DAA_ADAPTER.md](docs/TEACHER_DAA_ADAPTER.md).

## 12. Lỗi thường gặp

### `Network Error`

- Kiểm tra backend có chạy ở cổng `4000`.
- Mở `http://localhost:4000/health`.
- Kiểm tra `ALLOWED_ORIGINS=http://localhost:5173`.

### `DB connected` không xuất hiện

- Kiểm tra PostgreSQL đang chạy.
- Kiểm tra `DATABASE_URL`.
- Đảm bảo database đã được tạo.

### `column avatar_url does not exist`

Khởi động lại backend. Backend tự bổ sung `bio`, `avatar_url`, `cover_url`.

### Cookie DAA hết hạn

Đăng xuất DAA, đăng nhập lại và sao chép cookie mới.

### Chuyển sang `/unauthorized`

- Kiểm tra đang dùng đúng role.
- Không dùng hai tài khoản trong hai tab cùng trình duyệt.
- Tải lại bằng `Ctrl + F5`.

## Bảo mật

- Mọi API riêng tư dùng JWT và kiểm tra role.
- Advisor bị giới hạn theo `advisor_class`.
- Student không được dùng API AI.
- Query database dùng tham số.
- Không lưu hoặc log cookie DAA.
- Không commit `.env` hay khóa bí mật.
