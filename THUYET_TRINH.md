# 🎓 BỘ TÀI LIỆU THUYẾT TRÌNH — ĐỒ ÁN ADVISORHUB (UIT)

> Hệ thống tư vấn học vụ UIT: quản lý sinh viên/lớp/điểm, đặt lịch hẹn, nhắn tin realtime,
> chatbox AI (RAG + Google Search), phân tích bất thường bằng AI. 3 vai trò: Admin / Cố vấn / Sinh viên.

---

## 1. SƠ ĐỒ KIẾN TRÚC TỔNG THỂ

```
                          NGƯỜI DÙNG (trình duyệt)
                                   │
                                   │  HTTPS
                                   ▼
        ┌──────────────────────────────────────────────┐
        │   FRONTEND  (React + TypeScript + Vite)        │
        │   Host: Vercel   →  https://...vercel.app      │
        │   - SPA, React Router, Context API             │
        │   - axios (REST), socket.io-client (realtime)  │
        └───────────────┬──────────────────┬─────────────┘
                        │ REST API (JSON)   │ WebSocket
                        │ kèm JWT           │ (Socket.IO)
                        ▼                   ▼
        ┌──────────────────────────────────────────────┐
        │   BACKEND  (Node.js + Express)                 │
        │   Host: Render   →  https://...onrender.com    │
        │   - Routing + Middleware (verifyToken)         │
        │   - JWT, bcrypt, CORS                          │
        │   - Socket.IO server (chat realtime)           │
        │   - RAG Service (chatbox AI)                   │
        └──────────┬──────────────────────┬──────────────┘
                   │ SQL (pg, có SSL)      │ HTTPS + API key
                   ▼                       ▼
        ┌─────────────────────┐   ┌────────────────────────┐
        │  DATABASE            │   │  GOOGLE GEMINI API      │
        │  PostgreSQL (Neon)   │   │  - Sinh câu trả lời     │
        │  18 bảng quan hệ     │   │  - Google Search        │
        └─────────────────────┘   └────────────────────────┘
```

**Kiến trúc 3 tầng (3-tier), tách rời (decoupled):** Client – Server – Data.
Frontend và backend là 2 ứng dụng độc lập, giao tiếp qua **REST API (JSON)** và **WebSocket**.

---

## 2. BẢNG CÔNG NGHỆ & VAI TRÒ

| Lớp | Công nghệ | Vai trò |
|-----|-----------|---------|
| Giao diện | React, TypeScript, Vite, TailwindCSS | UI dạng SPA, component tái sử dụng |
| Điều hướng | React Router | Chuyển trang không reload |
| State chung | Context API (Auth, AIChat) | Chia sẻ dữ liệu toàn app |
| Gọi API | axios (+ interceptor gắn JWT) | Giao tiếp REST với backend |
| Realtime | Socket.IO (client + server) | Nhắn tin tức thì |
| Server | Node.js + Express | API, logic nghiệp vụ |
| Xác thực | JWT + bcrypt | Đăng nhập, băm mật khẩu |
| Phân quyền | RBAC (3 role) | Chặn truy cập theo vai trò |
| CSDL | PostgreSQL (pg, Pool) | Lưu dữ liệu quan hệ |
| AI | Google Gemini + RAG + Grounding | Chatbox học vụ |
| Deploy | Vercel + Render + Neon, CI/CD qua Git | Đưa lên Internet miễn phí |

---

## 3. CÁC KHÁI NIỆM CỐT LÕI (giải thích nhanh + ví dụ)

| Khái niệm | 1 câu dễ hiểu | Ví dụ đời thường |
|-----------|----------------|------------------|
| **Client–Server** | Trình duyệt "gọi món", server "nấu rồi bưng ra" | Thực khách & nhà bếp |
| **HTTP Request/Response** | Hỏi–đáp giữa client & server | Phiếu gọi món & món bưng ra |
| **Stateless** | Server không nhớ bạn giữa 2 lần gọi | Mỗi lần phải "trình vé" lại |
| **JSON** | Định dạng gói dữ liệu chung | Vali có ngăn dán nhãn |
| **SPA** | 1 trang HTML, đổi nội dung không reload | Lật trang trong 1 cuốn sách |
| **React Component** | Khối UI tái sử dụng | Khối Lego |
| **State** | "Trí nhớ" của component, đổi → vẽ lại | Bảng đếm số người tự cập nhật |
| **Virtual DOM** | Sửa bản nháp rồi chỉ cập nhật chỗ đổi | Tẩy 1 chữ, không chép lại cả bài |
| **Context API** | Dữ liệu dùng chung cho cả app | Bảng thông báo ở sảnh |
| **Node.js** | Chạy JS ở server, xử lý nhiều việc cùng lúc | Đầu bếp không đứng chờ nước sôi |
| **Express Middleware** | "Trạm" request đi qua trước khi tới đích | Check-in → soi an ninh ở sân bay |
| **REST API** | API quanh "tài nguyên" + động từ HTTP | Thực đơn chuẩn |
| **JWT** | Vé có dấu niêm phong, client tự giữ | Vé hòa nhạc có con dấu chống giả |
| **bcrypt** | Băm mật khẩu 1 chiều, không hoàn nguyên | Băm thịt thành chả |
| **RBAC** | Phân quyền theo vai trò | Vé thường / vé VIP |
| **CORS** | Server khai báo ai được phép gọi | Danh sách khách được vào tòa nhà |
| **CSDL quan hệ** | Nhiều bảng nối nhau qua khóa | Nhiều sheet Excel liên kết |
| **SQL Injection** | Chèn lệnh độc qua input; chống bằng `$1,$2` | Đừng để khách tự viết lệnh vào bếp |
| **Connection Pool** | Giữ sẵn kết nối DB dùng lại | Đội taxi chờ sẵn |
| **WebSocket** | Kết nối 2 chiều luôn mở, server tự đẩy | Gọi điện thoại giữ máy |
| **LLM** | Mô hình AI sinh ngôn ngữ tự nhiên | Gemini |
| **RAG** | Tìm tài liệu rồi mới trả lời | Thi "mở sách" |
| **Grounding** | Hết tài liệu thì tra Google | Hết sách thì lên mạng tra |
| **CI/CD** | Push code → tự build & deploy | Nộp bài là tự dán lên bảng |
| **.env** | Cất bí mật riêng, không ghi trong code | Két sắt đựng chìa khóa |

---

## 4. KỊCH BẢN THUYẾT TRÌNH (~8–10 phút, theo slide)

**Slide 1 — Mở đầu (30s)**
"Em xin trình bày đồ án **AdvisorHub** — hệ thống tư vấn học vụ cho UIT, gồm 3 vai trò Admin, Cố vấn, Sinh viên, với điểm nhấn là **chatbox AI** và **nhắn tin realtime**."

**Slide 2 — Kiến trúc tổng thể (1 phút)**
Chỉ vào sơ đồ: "Hệ thống theo kiến trúc **3 tầng tách rời**: Frontend React trên Vercel, Backend Node.js trên Render, Database PostgreSQL trên Neon. Chúng giao tiếp qua **REST API** dạng JSON và **WebSocket** cho realtime."

**Slide 3 — Frontend (1 phút)**
"Frontend là **SPA** viết bằng React + TypeScript. SPA nghĩa là chỉ 1 trang HTML, chuyển mục không tải lại trang nhờ React Router. Giao diện chia thành các **component** tái sử dụng; dữ liệu chung như thông tin đăng nhập được chia sẻ qua **Context API**."

**Slide 4 — Backend & REST API (1 phút)**
"Backend dùng **Express**. Mỗi URL ánh xạ tới một hàm xử lý (routing). Trước các API cần đăng nhập có **middleware** kiểm tra token. API thiết kế theo chuẩn **REST**, trao đổi JSON."

**Slide 5 — Xác thực & bảo mật (1.5 phút) [phần trọng tâm]**
"Đăng nhập dùng **JWT**: server cấp 1 token có chữ ký số, client giữ và gửi kèm mỗi request — server chỉ cần kiểm chữ ký, không phải lưu phiên (stateless). Mật khẩu được **băm bằng bcrypt**, không lưu dạng thật. Phân quyền theo **3 vai trò**; em chặn ở **cả frontend lẫn backend** — frontend để ẩn nút, backend mới là chốt chặn thật. Chống **SQL Injection** bằng truy vấn tham số hóa, và cấu hình **CORS** chỉ cho frontend được phép gọi."

**Slide 6 — Cơ sở dữ liệu (1 phút)**
"Dữ liệu lưu trong PostgreSQL gồm 18 bảng quan hệ, nối nhau bằng khóa chính/khóa ngoại. Ví dụ tính GPA, em JOIN 3 bảng enrollments, courses, grades."

**Slide 7 — Nhắn tin realtime (1 phút)**
"Tính năng chat dùng **WebSocket** qua Socket.IO. Khác HTTP phải hỏi liên tục, WebSocket mở kết nối 2 chiều — khi một người gửi tin, server lưu DB rồi **đẩy ngay** cho người kia, không cần F5."

**Slide 8 — Chatbox AI (1.5 phút) [điểm nhấn]**
"Chatbox dùng **RAG** — Retrieval-Augmented Generation. Bước 1: tìm các đoạn tài liệu UIT liên quan câu hỏi (trong ~1.900 mẩu kiến thức). Bước 2: đưa tài liệu đó vào prompt cho **Gemini** sinh câu trả lời dựa trên tài liệu → chính xác, ít bịa. Nếu tài liệu **không có**, em bật **Google Search Grounding** để Gemini tự tra web rồi trả lời."

**Slide 9 — Triển khai (1 phút)**
"Toàn bộ deploy **miễn phí**: frontend trên Vercel, backend trên Render, DB trên Neon. Mỗi lần push code lên GitHub, hệ thống **tự build & deploy (CI/CD)**. Các bí mật như API key được cất trong biến môi trường, không commit lên Git."

**Slide 10 — Demo + Kết (1 phút)**
Demo nhanh: đăng nhập → hỏi chatbox → nhắn tin. "Em xin kết thúc phần trình bày, rất mong nhận góp ý từ thầy/cô."

---

## 5. BỘ 20 CÂU HỎI – ĐÁP (luyện trả lời)

1. **Frontend và backend giao tiếp thế nào?** → Qua REST API, trao đổi dữ liệu JSON trên giao thức HTTP; realtime thì dùng WebSocket.
2. **SPA là gì, lợi ích?** → Single Page App: 1 trang HTML, đổi nội dung không reload → nhanh, mượt như app.
3. **React khác HTML/JS thuần ở đâu?** → Chia UI thành component tái sử dụng, dùng Virtual DOM cập nhật hiệu quả, quản lý state tự động vẽ lại.
4. **State và Props khác nhau?** → State là dữ liệu nội bộ component (đổi → render lại); Props là dữ liệu cha truyền xuống con.
5. **Virtual DOM là gì?** → Bản sao ảo của giao diện; React so sánh rồi chỉ cập nhật phần thay đổi lên DOM thật → nhanh.
6. **Context API để làm gì?** → Chia sẻ state cho nhiều component mà không truyền props qua từng cấp.
7. **REST API là gì?** → Kiểu thiết kế API quanh tài nguyên + HTTP method (GET/POST/PUT/DELETE), stateless.
8. **Middleware là gì?** → Hàm chạy giữa request và response, vd kiểm tra token, parse JSON, CORS.
9. **JWT là gì? Cấu trúc?** → Token xác thực gồm header.payload.signature; client giữ và gửi kèm header Authorization.
10. **Sao dùng JWT thay vì session?** → JWT stateless, server không cần lưu phiên → nhẹ, dễ scale nhiều server.
11. **Mật khẩu lưu thế nào?** → Băm bằng bcrypt (có salt), không lưu dạng thật; đăng nhập thì so hash.
12. **Salt là gì?** → Chuỗi ngẫu nhiên thêm trước khi băm → 2 người cùng mật khẩu vẫn cho hash khác nhau.
13. **Phân quyền làm sao?** → RBAC theo 3 role; kiểm tra ở cả frontend (ẩn route) và backend (chốt chặn thật).
14. **CORS là gì, sao gặp lỗi khi deploy?** → Cơ chế cho phép gọi cross-domain; frontend Vercel khác domain backend Render nên phải khai báo ALLOWED_ORIGINS.
15. **Chống SQL Injection thế nào?** → Dùng truy vấn tham số hóa `$1, $2`, không nối chuỗi input vào SQL.
16. **Connection Pool là gì?** → Bể kết nối DB dùng lại, tránh mở/đóng liên tục tốn thời gian.
17. **Sao chat không dùng HTTP mà dùng WebSocket?** → HTTP phải hỏi liên tục (polling) tốn & trễ; WebSocket mở 2 chiều, server đẩy tin tức thì.
18. **RAG là gì? Khác hỏi thẳng ChatGPT?** → Tìm tài liệu riêng của trường rồi mới sinh trả lời → đúng, có nguồn, ít bịa.
19. **Grounding là gì?** → Khi tài liệu nội bộ không có, để Gemini tự tra Google rồi tổng hợp trả lời.
20. **Bảo mật API key & deploy thế nào?** → Key để trong biến môi trường trên server (không commit); deploy free Vercel+Render+Neon, push Git là tự deploy (CI/CD).

---

## 6. THAM CHIẾU NHANH FILE CODE (khi giám khảo hỏi "chỗ nào trong code?")

| Chức năng | File |
|-----------|------|
| Đăng nhập, tạo JWT, Socket.IO server | `backend/src/index.js` |
| Kiểm tra token (middleware) | `backend/src/middleware/auth.js` |
| Kết nối DB (Pool + SSL) | `backend/src/db.js` |
| Chatbox RAG + Gemini + Grounding | `backend/src/services/ragService.js` |
| Các nhóm API | `backend/src/routes/` |
| Điều hướng + chặn route theo role | `frontend/src/App.tsx` |
| Gọi API + interceptor gắn JWT | `frontend/src/lib/api.ts` |
| State đăng nhập | `frontend/src/auth/AuthContext.tsx` |
| Logic chatbox (state, hiệu ứng gõ chữ) | `frontend/src/contexts/AIChatContext.tsx` |
| Giao diện chatbox | `frontend/src/components/UITFaqWidget.tsx` |
| Nhắn tin realtime (client) | `frontend/src/views/Messages.tsx`, `.../student/StudentMessages.tsx` |

---

_Chúc bạn bảo vệ đồ án thật tốt! 🎓_
