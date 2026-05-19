# NT208 AdvisorHub — AGENTS.md
# OpenAI Codex custom instructions cho đồ án NT208.Q22.ANTT

## Dự án là gì
Website quản lý cố vấn học vụ UIT (AdvisorHub) tích hợp AI học vụ.
Repo: https://github.com/Master-Pillow/NT208.Q22.ANTT.git

## Stack
- Frontend: React + TypeScript + Vite, chạy port 5173
- Backend: Node.js + Express.js, chạy port 4000
- Database: PostgreSQL
- Realtime: Socket.IO
- Charts: Recharts
- AI: Google Gemini API (AI Brief), rule-based (Anomaly Detection)
- Auth: JWT + bcrypt

## Cấu trúc thư mục
```
backend/src/
├── index.js
├── db.js
├── middleware/auth.js
├── routes/aiAnomalyRoutes.js, aiQueryRoutes.js, ...
└── services/anomalyDetectionService.js, aiBriefService.js, textToSqlService.js

frontend/src/
├── App.tsx
├── lib/api.ts
├── views/AIAnomalyDashboard.tsx, ...
└── components/AISupportWidget.tsx, Sidebar.tsx, ...
```

## Roles và quyền
- ADMIN: toàn bộ dữ liệu, chạy AI toàn hệ thống
- ADVISOR: chỉ lớp được gán trong bảng advisor_class
- STUDENT: xem hồ sơ cá nhân, nhắn tin, lịch hẹn — KHÔNG được dùng API AI

## Database quan trọng
Bảng chính: users, students, admin_classes, advisor_class, courses, enrollments, grades,
conversations, messages, appointments, notifications, advising_logs, student_alerts

Bảng AI: ai_anomaly_runs, ai_student_anomalies, ai_anomaly_patterns, ai_briefs

Dữ liệu demo hiện có: students=1118, users=154, courses=68, enrollments=11244, grades=11244

## API AI (tất cả phải có verifyToken + role check)
- POST /ai/query — ADMIN, ADVISOR
- POST /ai/anomalies/run — ADMIN, ADVISOR (lớp mình)
- GET  /ai/anomalies — ADMIN, ADVISOR (lớp mình)
- PATCH /ai/anomalies/:id/status — ADMIN, ADVISOR
- GET  /ai/anomaly-patterns — ADMIN, ADVISOR
- POST /ai/anomaly-patterns/detect — ADMIN, ADVISOR (phải có assertAiAccess)
- POST /ai/briefs/generate — ADMIN, ADVISOR (lớp mình)

## Anomaly Detection Rules
| Rule                    | Điều kiện                              | Severity               |
|-------------------------|----------------------------------------|------------------------|
| LOW_GPA                 | GPA < 2.0                              | HIGH (kèm F) / MEDIUM  |
| MULTIPLE_FAILURES       | >= 2 môn F                             | HIGH                   |
| COURSE_FAILURE          | letter_grade='F' hoặc numeric < 4.0    | HIGH/MEDIUM            |
| GPA_DROP                | GPA học kỳ giảm >= 0.5                 | HIGH (>=1.0) / MEDIUM  |
| LOW_ACCUMULATED_CREDITS | tín chỉ < 75% trung bình lớp           | HIGH/MEDIUM            |

## Khởi động dev
```powershell
# Backend
cd backend && npm run dev
# Kỳ vọng: "Backend & Socket.io running on http://localhost:4000" + "DB connected"

# Frontend
cd frontend && npm run dev
# Mở: http://localhost:5173

# Nếu port 4000 bị chiếm:
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

## Việc cần làm trước demo (ưu tiên cao nhất)
1. Sửa tiếng Việt không dấu trong anomaly title, suggested_action, AI Brief fallback
2. Fix role check toàn bộ API /ai — đặc biệt POST /ai/anomaly-patterns/detect
3. Đảm bảo STUDENT gọi API AI nhận 403
4. Fix numeric overflow: confidence NUMERIC(10,6), lift NUMERIC(12,6)
5. Thêm phân trang cho bảng anomaly

## SQL sửa dữ liệu cũ (chạy khi cần)
```sql
UPDATE ai_student_anomalies SET title = 'GPA dưới ngưỡng an toàn' WHERE anomaly_type = 'LOW_GPA';
UPDATE ai_student_anomalies SET title = 'GPA học kỳ giảm mạnh' WHERE anomaly_type = 'GPA_DROP';
UPDATE ai_student_anomalies SET title = 'Có từ 2 môn F trở lên' WHERE anomaly_type = 'MULTIPLE_FAILURES';
UPDATE ai_student_anomalies SET title = 'Tín chỉ tích lũy thấp hơn mặt bằng lớp' WHERE anomaly_type = 'LOW_ACCUMULATED_CREDITS';
ALTER TABLE ai_anomaly_patterns ALTER COLUMN confidence TYPE NUMERIC(10,6), ALTER COLUMN lift TYPE NUMERIC(12,6);
```

## Quy tắc bắt buộc khi sửa code
- KHÔNG tự ý thêm DROP, TRUNCATE, DELETE FROM students trừ khi được yêu cầu rõ
- KHÔNG commit .env hoặc in API key ra log
- KHÔNG đổi logic lớn khi đang fix pre-demo
- Mọi text UI, notification, anomaly, brief phải có tiếng Việt CÓ DẤU
- Mọi API AI phải qua verifyToken + role check
- Sau khi sửa, báo cáo: file đã sửa / lý do / SQL cần chạy / cách test

---

## [LỆNH] Tách trang & Refactor UI

Khi nhận lệnh "refactor UI" hoặc "tách trang", thực hiện:

### Mục tiêu
1. Tách các view lớn thành trang riêng theo cấu trúc bên dưới
2. Sidebar chỉ hiện menu đúng với role (ADMIN / ADVISOR / STUDENT)
3. Mỗi trang dùng layout chung: `<PageLayout title="...">` wrapping content
4. Dùng React Router v6 với lazy loading (React.lazy + Suspense)
5. Breadcrumb ở top mỗi trang để dễ điều hướng
6. Responsive: sidebar có thể collapse trên màn nhỏ

### Cấu trúc trang

ADMIN:
- /admin/dashboard       → Tổng quan hệ thống
- /admin/students        → Danh sách sinh viên (có phân trang, tìm kiếm)
- /admin/classes         → Quản lý lớp học
- /admin/advisors        → Quản lý cố vấn + gán lớp
- /admin/courses         → Quản lý môn học
- /admin/ai/anomaly      → AI: Phát hiện bất thường
- /admin/ai/brief        → AI: Sinh AI Brief
- /admin/ai/query        → AI: Chat-to-Data
- /admin/ai/patterns     → AI: Pattern Mining

ADVISOR:
- /advisor/dashboard     → Tổng quan lớp phụ trách
- /advisor/students      → Sinh viên lớp mình
- /advisor/appointments  → Lịch hẹn tư vấn
- /advisor/messages      → Nhắn tin với sinh viên
- /advisor/ai/anomaly    → AI: Cảnh báo lớp mình
- /advisor/ai/brief      → AI: Brief lớp mình

STUDENT:
- /student/profile       → Hồ sơ học tập cá nhân
- /student/grades        → Xem điểm
- /student/appointments  → Lịch hẹn
- /student/messages      → Nhắn tin với cố vấn
- /student/notifications → Thông báo

CHUNG:
- /login                 → Đăng nhập
- /unauthorized          → Trang 403

### Quy tắc khi tách
- Mỗi trang là 1 file trong src/views/<role>/<PageName>.tsx
- Shared components vào src/components/
- Layout wrapper vào src/components/layout/PageLayout.tsx
- Route guard vào src/components/layout/ProtectedRoute.tsx
- Sidebar đọc role từ auth context, ẩn menu không thuộc quyền
- Không duplicate CSS
- Mỗi trang có document.title động

### KHÔNG được làm khi refactor
- Không sửa backend routes
- Không đổi tên API endpoint
- Không xóa state/logic đang hoạt động
- Không thay đổi Socket.IO setup
- Báo cáo danh sách file mới tạo và file đã sửa trước khi commit

---

## [LỆNH] Thêm phân trang

Khi nhận lệnh "thêm phân trang" cho một bảng:
- 20 dòng mỗi trang (dropdown: 10 / 20 / 50)
- Hiển thị: "Hiển thị X–Y trong Z kết quả"
- Nút: << Trang trước | Trang N / Tổng | Trang sau >>
- Giữ nguyên filter / sort đã có
- Không gọi thêm API mới nếu dữ liệu đã load hết client-side
