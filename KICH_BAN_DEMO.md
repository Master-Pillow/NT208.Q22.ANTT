# 🎬 KỊCH BẢN QUAY VIDEO DEMO — AdvisorHub (COURSE2)
### Nền tảng Cố vấn học tập UIT — NT208.Q22.ANTT

> Tài liệu này là kịch bản chi tiết từng cảnh để quay video demo gửi thầy.
> Mỗi cảnh gồm: **🖱️ Thao tác trên màn hình** + **🎙️ Lời thoại (voice-over) gợi ý**.
> Tổng thời lượng đầy đủ: **~13–15 phút**. Cuối tài liệu có **bản rút gọn ~5–6 phút**.

---

## 📋 MỤC LỤC
- [Phần 0 — Chuẩn bị trước khi quay](#phần-0--chuẩn-bị-trước-khi-quay)
- [Phần 1 — Mở đầu & giới thiệu](#phần-1--mở-đầu--giới-thiệu-45s)
- [Phần 2 — Đăng nhập & tổng quan hệ thống](#phần-2--đăng-nhập--tổng-quan-hệ-thống-1-phút)
- [Phần 3 — Vai trò SINH VIÊN](#phần-3--vai-trò-sinh-viên-35-phút)
- [Phần 4 — Vai trò CỐ VẤN HỌC TẬP](#phần-4--vai-trò-cố-vấn-học-tập-35-phút)
- [Phần 5 — Vai trò QUẢN TRỊ VIÊN (điểm nhấn AI)](#phần-5--vai-trò-quản-trị-viên-4-phút--điểm-nhấn)
- [Phần 6 — Demo REALTIME xuyên vai trò](#phần-6--demo-realtime-xuyên-vai-trò-2-phút--ăn-điểm)
- [Phần 7 — AI Chatbox UIT](#phần-7--ai-chatbox-uit-1-phút)
- [Phần 8 — Kết thúc](#phần-8--kết-thúc-30s)
- [Bản rút gọn ~5–6 phút](#-bản-rút-gọn-56-phút)

---

## Phần 0 — Chuẩn bị trước khi quay

### A. Khởi động ứng dụng
**Cách 1 — Chạy local (khuyên dùng khi quay để mượt, không phụ thuộc mạng):**
```bash
# Tại thư mục gốc dự án
npm run dev
```
→ Backend chạy ở `http://localhost:4000`, Frontend ở `http://localhost:5173`.
Mở trình duyệt vào **http://localhost:5173**.

**Cách 2 — Dùng bản deploy:** Frontend trên Vercel (`nt-208-q22-antt*.vercel.app`), backend trên Render.
> ⚠️ Backend Render gói free **"ngủ" sau ~15 phút** không dùng → request đầu tiên có thể chờ ~30–50s. Nếu quay bản deploy, hãy **mở web trước 1 phút** để "đánh thức" server, tránh bị lag trong video.

### B. Tài khoản demo (mật khẩu chung: `password123`)
| Vai trò | Email đăng nhập | Ghi chú |
|---|---|---|
| **Quản trị viên** | `admin@uit.edu.vn` | Toàn quyền + 4 công cụ AI |
| **Cố vấn học tập** | `thornea@uit.edu.vn` | (Hoặc `minhnv@uit.edu.vn`, `thult@uit.edu.vn`…) |
| **Sinh viên A** | `24521001@gm.uit.edu.vn` | Tài khoản chính để demo |
| **Sinh viên B** | `24521002@gm.uit.edu.vn` | Dùng để demo **chat 2 chiều** với SV A |

### C. Mẹo quay để "ăn điểm"
1. **Mở 2 cửa sổ song song** (1 cửa sổ thường + 1 cửa sổ **ẩn danh/Incognito**) để demo **realtime**:
   - Cửa sổ 1: đăng nhập **Cố vấn** · Cửa sổ 2: đăng nhập **Sinh viên**.
   - Đặt 2 cửa sổ cạnh nhau → khi sinh viên gửi tin/đặt lịch, bên cố vấn **hiện ngay lập tức** (rất ấn tượng trên video).
2. **Phóng to trình duyệt** (Ctrl/Cmd +) cho chữ to, dễ nhìn; bật chế độ toàn màn hình.
3. (Tùy chọn nâng cao) Nếu muốn khoe **đồng bộ điểm thật từ DAA**: chuẩn bị sẵn 1 **cookie phiên DAA** thật (lấy theo hướng dẫn ngay trên form đăng nhập). Nếu không tiện, cứ dùng dữ liệu mẫu có sẵn — vẫn đầy đủ.
4. Viết sẵn vài câu hỏi cho AI Chatbox & Chat-to-Data để gõ cho nhanh (xem trong từng cảnh).

### D. Thứ tự & thời lượng đề xuất
> Sinh viên → Cố vấn → Quản trị → Realtime → AI Chatbox → Kết.
> Trình tự này dẫn dắt theo "câu chuyện": sinh viên gặp khó khăn → cố vấn theo dõi → nhà trường quản lý & dùng AI ra quyết định.

---

## Phần 1 — Mở đầu & giới thiệu *(45s)*

**🖱️ Thao tác:** Hiển thị slide tiêu đề hoặc màn hình đăng nhập của app.

**🎙️ Lời thoại:**
> "Xin chào thầy và các bạn. Nhóm em xin trình bày đồ án môn NT208 — **AdvisorHub**, một nền tảng **cố vấn học tập trực tuyến** cho Trường Đại học Công nghệ Thông tin.
> Hệ thống giải quyết bài toán: hiện nay việc theo dõi tình hình học tập của sinh viên, kết nối sinh viên với cố vấn, và phát hiện sớm sinh viên có nguy cơ học vụ còn rời rạc và thủ công.
> AdvisorHub gom tất cả vào một nơi, với **3 vai trò**: **Sinh viên**, **Cố vấn học tập** và **Quản trị viên**; tích hợp **đồng bộ điểm trực tiếp từ cổng DAA**, **nhắn tin realtime**, và đặc biệt là **các công cụ AI học vụ**. Sau đây là phần demo chi tiết."

---

## Phần 2 — Đăng nhập & tổng quan hệ thống *(1 phút)*

**🖱️ Thao tác:**
1. Vào trang đăng nhập. Chỉ vào 2 tab phía trên form: **"Tài khoản"** và **"Tài khoản sinh viên"**.
2. Bấm tab **"Tài khoản sinh viên"** để lộ ô **Mã số sinh viên** + **Cookie phiên DAA** và phần hướng dẫn lấy cookie từ `daa.uit.edu.vn`.
3. Bấm lại tab **"Tài khoản"**.

**🎙️ Lời thoại:**
> "Đây là cổng đăng nhập. Hệ thống hỗ trợ **2 cách đăng nhập**.
> Cách thứ nhất là **tài khoản nội bộ** bằng email và mật khẩu UIT, dành cho cả 3 vai trò.
> Cách thứ hai — điểm đặc biệt — là **đăng nhập bằng tài khoản sinh viên DAA**: sinh viên chỉ cần dán **cookie phiên** từ cổng `daa.uit.edu.vn`, hệ thống sẽ **tự động đồng bộ bảng điểm, thời khóa biểu và lịch thi thật** về ứng dụng. Cookie chỉ dùng để xác minh phiên và **không được lưu lại**, đảm bảo an toàn.
> Trong video này em sẽ dùng các **tài khoản mẫu** để demo nhanh. Bắt đầu với vai trò **sinh viên**."

**🖱️ Thao tác:** Nhập `24521001@gm.uit.edu.vn` / `password123` → bấm **Đăng nhập**.

---

## Phần 3 — Vai trò SINH VIÊN *(3.5 phút)*

> Sau khi đăng nhập, vào thẳng **Hồ sơ học tập**. Giới thiệu nhanh **sidebar trái** (menu COURSE2).

### 🎬 Cảnh 3.1 — Hồ sơ học tập *(/student/profile)*
**🖱️ Thao tác:** Chỉ vào thẻ thông tin cá nhân + **badge trạng thái** (Ổn định / Cần chú ý / Nguy cơ cao) và 4 thẻ KPI: **GPA hiện tại, Tín chỉ nợ, Môn đã học, Môn rớt**. Kéo xuống xem **Thông báo gần đây**.

**🎙️ Lời thoại:**
> "Sau khi đăng nhập, sinh viên thấy ngay **trang tổng quan học tập**. Phía trên là thông tin cá nhân kèm **nhãn cảnh báo trạng thái** — hệ thống tự đánh giá 'Ổn định', 'Cần chú ý' hay 'Nguy cơ cao' dựa trên GPA và số tín chỉ nợ.
> Bốn thẻ số liệu cho biết nhanh **GPA hiện tại, tín chỉ còn nợ, số môn đã học và số môn rớt**. Bên dưới là **các thông báo mới nhất** từ cố vấn và hệ thống."

### 🎬 Cảnh 3.2 — Xem điểm *(/student/grades)* ⭐
**🖱️ Thao tác:**
1. Bấm menu **"Xem điểm"**.
2. Lướt qua 4 KPI: **GPA tích lũy, Điểm TB thang 10, Kỳ gần nhất, Kỳ tụt điểm**.
3. Dừng ở **3 biểu đồ**: đường **Xu hướng GPA**, diện tích **Điểm TB thang 10**, cột **Tín chỉ đạt/nợ**.
4. Bấm nút **"Chạy phân tích"** ở **AI Insight Panel** → đọc nhận xét AI.
5. Kéo xuống **bảng điểm chi tiết** (mã môn, tên môn, tín chỉ, điểm, trạng thái màu).

**🎙️ Lời thoại:**
> "Mục **Xem điểm** trực quan hóa kết quả học tập theo từng học kỳ. Có **biểu đồ xu hướng GPA**, **điểm trung bình thang 10**, và **tín chỉ đạt so với tín chỉ nợ** — sinh viên thấy ngay mình đang tiến bộ hay tụt dốc ở kỳ nào.
> Đặc biệt có **bảng phân tích bằng AI**: em bấm 'Chạy phân tích', hệ thống sẽ tự nhận xét điểm mạnh, điểm yếu và đưa ra khuyến nghị học tập.
> Toàn bộ bảng điểm chi tiết bên dưới được **đồng bộ trực tiếp từ DAA**, mỗi môn có nhãn màu trạng thái: đạt, cần cải thiện, hay rớt."

### 🎬 Cảnh 3.3 — Thời khóa biểu *(/student/timetable)*
**🖱️ Thao tác:** Bấm menu **"Thời khoá biểu"**. Chỉ vào lưới lịch theo thứ/tiết, mỗi ô môn học hiển thị **mã lớp, tên môn, phòng, giảng viên, khoảng ngày**; mỗi lớp một màu.

**🎙️ Lời thoại:**
> "Thời khóa biểu cũng được kéo tự động từ DAA. Mỗi ô là một buổi học, hiển thị đầy đủ **phòng, giảng viên, và khoảng thời gian học**; mỗi môn được tô màu riêng để dễ phân biệt."

### 🎬 Cảnh 3.4 — Lịch thi *(/student/exams)*
**🖱️ Thao tác:** Bấm menu **"Lịch thi"**. Chỉ bảng lịch thi với badge **GK/CK**, **ngày thi, ca/tiết thi, phòng thi**. Đọc dòng ghi chú ca thi bên dưới.

**🎙️ Lời thoại:**
> "Tương tự, **lịch thi giữa kỳ và cuối kỳ** được tổng hợp gọn gàng: ngày thi, ca thi, phòng thi và hình thức — sinh viên không cần vào DAA tra cứu thủ công nữa."

### 🎬 Cảnh 3.5 — Đặt lịch hẹn với cố vấn *(/student/appointments)* ⭐
**🖱️ Thao tác:**
1. Bấm menu **"Lịch hẹn"**.
2. Ở form **"Đặt lịch mới"** (cột trái), nhập:
   - **Tiêu đề:** `Tư vấn kế hoạch học tập`
   - **Nội dung:** `Em muốn hỏi về tín chỉ nợ và cách cải thiện GPA.`
   - **Thời gian bắt đầu / kết thúc** (chọn 1 khung giờ).
3. Bấm **"Gửi yêu cầu đặt lịch"** → xuất hiện banner xanh thành công.
4. Bên phải, lịch vừa tạo hiện trong **"Lịch hẹn của tôi"** với badge **"Chờ duyệt"** (cam).

**🎙️ Lời thoại:**
> "Khi cần gặp cố vấn, sinh viên **đặt lịch ngay trong app**: nhập tiêu đề, nội dung cần tư vấn và khung giờ mong muốn, rồi gửi yêu cầu.
> Lịch sẽ ở trạng thái **'Chờ duyệt'**. Lát nữa ở phần demo realtime, các bạn sẽ thấy **yêu cầu này hiện ngay bên phía cố vấn** và được duyệt trực tiếp."

> 💡 *Giữ nguyên lịch "Chờ duyệt" này để dùng cho [Phần 6](#phần-6--demo-realtime-xuyên-vai-trò-2-phút--ăn-điểm).*

### 🎬 Cảnh 3.6 — Tin nhắn *(/student/messages)*
**🖱️ Thao tác:** Bấm menu **"Tin nhắn"**. Chỉ 2 nhóm danh bạ: **"Cố vấn học tập"** và **"Bạn cùng lớp"** (có ô tìm theo MSSV/tên). Mở 1 hội thoại, chỉ giao diện kiểu Messenger (bong bóng chat, dấu đã đọc ✓✓, nút **Email: Bật/Tắt**).

**🎙️ Lời thoại:**
> "Sinh viên có thể nhắn tin trực tiếp với **cố vấn** và cả **bạn cùng lớp** — tìm bạn theo mã số hoặc tên. Giao diện quen thuộc như Messenger, có **báo đã đọc**, và có thể **bật/tắt thông báo email** cho từng người. Phần nhắn tin realtime em sẽ demo kỹ ở phía sau."

### 🎬 Cảnh 3.7 — Thông báo *(/student/notifications)*
**🖱️ Thao tác:** Bấm menu **"Thông báo"** → lướt danh sách thông báo (từ cố vấn / hệ thống / cảnh báo học vụ tự động).

**🎙️ Lời thoại:**
> "Tất cả thông báo từ cố vấn, hệ thống, và các **cảnh báo học vụ tự động** được gom về một nơi để sinh viên không bỏ lỡ."

---

## Phần 4 — Vai trò CỐ VẤN HỌC TẬP *(3.5 phút)*

> **Đăng xuất** (góc trên phải) → đăng nhập `thornea@uit.edu.vn` / `password123`.
> *(Nếu đang quay 2 cửa sổ song song thì cố vấn đã đăng nhập sẵn ở cửa sổ thứ 2.)*

### 🎬 Cảnh 4.1 — Tổng quan cố vấn *(/advisor/dashboard)* ⭐
**🖱️ Thao tác:** Chỉ vào bảng **"Cảnh báo học vụ"** (top sinh viên rủi ro: GPA, nợ tín chỉ, nút **Nhắn tin**), biểu đồ **donut "Phân bố học lực"** (tâm là GPA trung bình), và khu **"Môn học có tỉ lệ rớt cao"**.

**🎙️ Lời thoại:**
> "Đăng nhập với vai trò **cố vấn học tập**. Ngay trang tổng quan, cố vấn thấy **những sinh viên rủi ro nhất** cần ưu tiên hỗ trợ, có thể bấm **'Nhắn tin'** liên hệ ngay.
> Bên cạnh là **biểu đồ phân bố học lực** của lớp và **các môn có tỉ lệ rớt cao** — giúp cố vấn nắm bức tranh tổng thể chỉ trong vài giây."

### 🎬 Cảnh 4.2 — Sinh viên lớp mình *(/advisor/students)* ⭐
**🖱️ Thao tác:**
1. Bấm menu **"Sinh viên lớp mình"** → hiện **danh sách lớp** được phân công.
2. Bấm vào **một lớp** → xem 4 KPI lớp (GPA TB, tỉ lệ rớt, SV rủi ro, sĩ số) + **các biểu đồ** (GPA theo kỳ, phân bố điểm, phân bố GPA, môn rớt cao) + **AI phân tích lớp**.
3. Bấm vào **một sinh viên** trong bảng → xem **biểu đồ chi tiết** + panel **"AI phân tích [tên sinh viên]"**.

**🎙️ Lời thoại:**
> "Mục **Sinh viên lớp mình** được tổ chức 3 cấp: **danh sách lớp → thống kê lớp → chi tiết từng sinh viên**.
> Ở cấp lớp, cố vấn có đầy đủ biểu đồ về GPA, phân bố điểm và các môn rớt nhiều, kèm **một bản phân tích do AI tạo ra**.
> Khi chọn một sinh viên cụ thể, hệ thống hiển thị biểu đồ học tập riêng và **AI nhận xét cá nhân hóa** cho sinh viên đó."

### 🎬 Cảnh 4.3 — Lịch hẹn *(/advisor/appointments)* ⭐
**🖱️ Thao tác:**
1. Bấm menu **"Lịch hẹn"**. Chỉ 3 KPI (**Chờ duyệt / Đã xác nhận / SV có lịch**).
2. Ở khu **"Lịch tư vấn chờ duyệt"**, chỉ vào yêu cầu mà **sinh viên đã gửi ở Cảnh 3.5**.
3. Bấm **"Chấp nhận"** → lịch tự chuyển xuống **"Lịch tư vấn đã xác nhận"**.
4. Chuyển toggle **Tuần/Tháng**; bấm vào **một ô trống** trên lưới tuần → mở modal tạo lịch (chỉ form: tiêu đề, hình thức, ngày/giờ, địa điểm, ghi chú).

**🎙️ Lời thoại:**
> "Đây là nơi cố vấn **quản lý lịch hẹn**. Yêu cầu sinh viên gửi nằm ở mục **'Chờ duyệt'** — em bấm **'Chấp nhận'**, lịch lập tức chuyển sang **'Đã xác nhận'**.
> Cố vấn còn có **thời khóa biểu tư vấn theo tuần và theo tháng**; chỉ cần bấm vào ô trống để **tạo lịch đúng tiết** rất nhanh."

### 🎬 Cảnh 4.4 — AI: Cảnh báo *(/advisor/ai/anomaly)* ⭐⭐
**🖱️ Thao tác:**
1. Bấm menu **"AI: Cảnh báo"**.
2. Bấm **"Chạy phát hiện bất thường"** → chờ chạy → đọc thông báo kết quả ("Đã quét … sinh viên, tạo … cảnh báo…").
3. Dùng **bộ lọc** (Lớp / Mức độ → chọn **HIGH** / Trạng thái / Loại) → bảng cập nhật ngay.
4. Trên một dòng, bấm **✓ Resolve** hoặc **✗ Dismiss** → trạng thái đổi.

**🎙️ Lời thoại:**
> "Đây là công cụ **phát hiện bất thường bằng AI**. Cố vấn bấm **'Chạy phát hiện'**, hệ thống quét toàn bộ sinh viên và tự sinh cảnh báo theo **5 nhóm**: GPA thấp, GPA giảm đột ngột, rớt nhiều môn, rớt môn cụ thể, và chậm tích lũy tín chỉ.
> Mỗi cảnh báo có **mức độ, bằng chứng cụ thể và gợi ý hành động**. Cố vấn lọc theo mức độ **HIGH** để ưu tiên các em nguy cơ cao nhất, rồi đánh dấu **đã xử lý** hay **bỏ qua**. Hệ thống cũng **tự gửi email** nhắc nhở tới sinh viên."

### 🎬 Cảnh 4.5 — AI: Brief lớp mình *(/advisor/ai/brief)* ⭐⭐
**🖱️ Thao tác:**
1. Bấm menu **"AI: Brief lớp mình"**.
2. Chọn **một lớp** ở bộ lọc → bấm **"Sinh brief"** → đọc đoạn brief tiếng Việt do AI sinh ra.
3. Chỉ vào khu **"Pattern rớt môn"** (các luật kiểu *Rớt môn A → nguy cơ rớt môn B*, kèm Confidence/Support/Lift).

**🎙️ Lời thoại:**
> "Công cụ **AI Brief** tự viết một **bản tin tóm tắt tình hình lớp** bằng tiếng Việt — sĩ số, số cảnh báo mới, sinh viên nguy cơ, môn cần chú ý và khuyến nghị hành động — chỉ với một cú bấm.
> Bên dưới là **khai phá mẫu rớt môn**: hệ thống tìm ra các quy luật như 'sinh viên rớt môn này thường rớt môn kia', giúp cố vấn **dự báo và can thiệp sớm**."

---

## Phần 5 — Vai trò QUẢN TRỊ VIÊN *(4 phút — ĐIỂM NHẤN)*

> **Đăng xuất** → đăng nhập `admin@uit.edu.vn` / `password123`.

### 🎬 Cảnh 5.1 — Tổng quan hệ thống *(/admin/dashboard)*
**🖱️ Thao tác:** Chỉ 4 thẻ số liệu (**Tổng cố vấn / Tổng lớp / Tổng sinh viên / SV nguy cơ**), biểu đồ tròn **phân bố GPA**, bảng **"Cố vấn cần lưu ý"**. Kéo xuống phần **Phân tích chuyên sâu** (toàn trường + theo khóa, có dropdown chọn khóa).

**🎙️ Lời thoại:**
> "Với vai trò **quản trị viên**, trang tổng quan cho cái nhìn **toàn hệ thống**: tổng số cố vấn, lớp, sinh viên và số sinh viên nguy cơ.
> Phần **phân tích chuyên sâu** có biểu đồ xu hướng GPA toàn trường, số cảnh báo theo loại, và **so sánh giữa các khóa** — chọn khóa để xem chi tiết. Đây là dữ liệu giúp ban quản lý ra quyết định."

### 🎬 Cảnh 5.2 — Quản lý Sinh viên / Lớp / Cố vấn
**🖱️ Thao tác:**
1. **"Sinh viên"** *(/admin/students)*: chỉ bảng sinh viên + cột tài khoản; bấm icon 👁️ xem **bảng điểm chi tiết** một sinh viên (`/admin/students/:id/academic`).
2. **"Lớp học"** *(/admin/classes)*: chọn **mã lớp** + chọn **cố vấn** → bấm **"Phân công"** → bảng cập nhật cố vấn phụ trách.
3. **"Cố vấn"** *(/admin/advisors)*: bấm **"Thêm Cố vấn"** → nhập họ tên, email, mật khẩu → **"Tạo tài khoản"** → danh sách cập nhật.

**🎙️ Lời thoại:**
> "Quản trị viên quản lý toàn bộ **dữ liệu nền**: xem hồ sơ và bảng điểm từng sinh viên; **phân công cố vấn cho từng lớp** chỉ bằng vài cú chọn; và **tạo tài khoản cố vấn mới** ngay trong giao diện.
> Đây là cách hệ thống đảm bảo mỗi lớp đều có cố vấn phụ trách, và mỗi cố vấn chỉ thấy đúng sinh viên của mình."

> *(Mục **"Môn học"** đang ở dạng khung sẵn cho phát triển thêm — có thể nói lướt hoặc bỏ qua.)*

### 🎬 Cảnh 5.3 — Trung tâm AI học vụ *(/admin/ai)* ⭐⭐⭐
**🖱️ Thao tác:** Bấm menu **"AI học vụ"** → hiện **4 thẻ công cụ**: Phát hiện bất thường, Sinh AI Brief, **Chat-to-Data**, Pattern Mining.

**🎙️ Lời thoại:**
> "Và đây là **trái tim của hệ thống — Trung tâm AI học vụ** với 4 công cụ. Hai công cụ đầu tương tự bên cố vấn nhưng ở **phạm vi toàn trường**. Em xin tập trung vào hai công cụ nổi bật nhất."

#### Cảnh 5.3a — Chat-to-Data (hỏi dữ liệu bằng ngôn ngữ tự nhiên) *(/admin/ai/query)* ⭐⭐⭐
**🖱️ Thao tác:**
1. Bấm thẻ **"Chat-to-Data"**.
2. Gõ: `Vẽ biểu đồ phổ điểm môn IT004` → bấm **"Truy vấn"** → hiện **biểu đồ cột** + bảng dữ liệu.
3. Gõ tiếp: `Liệt kê sinh viên có GPA cao nhất` → hiện **bảng kết quả**.

**🎙️ Lời thoại:**
> "**Chat-to-Data** cho phép hỏi dữ liệu **bằng tiếng Việt tự nhiên**, không cần biết SQL. Em hỏi 'Vẽ biểu đồ phổ điểm môn IT004' — hệ thống tự hiểu ý định, **sinh câu truy vấn an toàn**, và trả về **biểu đồ** ngay.
> Hỏi tiếp 'Liệt kê sinh viên có GPA cao nhất' thì nhận lại một bảng. Điểm quan trọng về bảo mật: hệ thống **không để AI tự viết SQL tùy ý**, mà dùng cơ chế nhận diện ý định và truy vấn theo khuôn mẫu an toàn, đồng thời **giới hạn phạm vi theo quyền** của người dùng."

#### Cảnh 5.3b — Sinh AI Brief (Gemini) *(/admin/ai/brief)* ⭐⭐
**🖱️ Thao tác:** Bấm thẻ **"Sinh AI Brief"** → chọn **một lớp** → bấm **"Sinh brief"** → đọc bản tin do AI tạo.

**🎙️ Lời thoại:**
> "Công cụ **AI Brief** dùng mô hình **Google Gemini** để tự viết một bản tin tóm tắt tình hình học vụ của lớp bằng tiếng Việt mạch lạc. Nếu vì lý do nào đó không gọi được AI, hệ thống vẫn có **bản tóm tắt dự phòng** dựa trên quy tắc, nên luôn cho kết quả."

#### Cảnh 5.3c — Phát hiện bất thường & Pattern Mining
**🖱️ Thao tác:** Mở nhanh **"Phát hiện bất thường"** *(/admin/ai/anomaly)* (giống cảnh 4.4 nhưng toàn trường) và **"Pattern Mining"** *(/admin/ai/patterns)*.

**🎙️ Lời thoại:**
> "Ở cấp toàn trường, công cụ **phát hiện bất thường** quét mọi sinh viên để lập danh sách cảnh báo, còn **Pattern Mining** áp dụng **khai phá luật kết hợp** để tìm các mối liên hệ rớt môn trên toàn trường — phục vụ điều chỉnh chương trình và tổ chức phụ đạo."

---

## Phần 6 — Demo REALTIME xuyên vai trò *(2 phút — ĂN ĐIỂM)*

> Phần này cần **2 cửa sổ cạnh nhau**: trái = **Sinh viên A** (`24521001`), phải = **Cố vấn** (`thornea`).
> *(Hoặc trái = Sinh viên A, phải = Sinh viên B `24521002` để demo chat bạn cùng lớp.)*

### 🎬 Cảnh 6.1 — Nhắn tin realtime + báo đã đọc
**🖱️ Thao tác:**
1. Cửa sổ **Sinh viên A** → **Tin nhắn** → chọn **cố vấn** → gõ `Em chào thầy, em cần tư vấn ạ.` → gửi.
2. Quay sang cửa sổ **Cố vấn**: chỉ **chuông thông báo** sáng + tin nhắn **hiện ngay** không cần F5.
3. Cố vấn mở hội thoại, trả lời `Chào em, thầy đã nhận được.` → quay lại cửa sổ sinh viên thấy tin tới ngay + dấu **đã đọc ✓✓**.

**🎙️ Lời thoại:**
> "Đây là tính năng **nhắn tin thời gian thực** dùng WebSocket. Bên trái sinh viên gửi tin — bên phải cố vấn **nhận ngay lập tức**, chuông thông báo và cả **tiêu đề tab** đều cập nhật. Khi cố vấn đọc, sinh viên thấy ngay **dấu đã đọc**."

### 🎬 Cảnh 6.2 — Đặt lịch → duyệt realtime
**🖱️ Thao tác:**
1. Cửa sổ **Cố vấn** → bấm vào **chuông thông báo** → thấy **yêu cầu đặt lịch** mà sinh viên đã gửi ở Cảnh 3.5 → bấm **Chấp nhận** ngay trên chuông.
2. Quay sang cửa sổ **Sinh viên** → **Lịch hẹn** → badge đổi từ **"Chờ duyệt"** sang **"Đã xác nhận"**.

**🎙️ Lời thoại:**
> "Tương tự với lịch hẹn: yêu cầu của sinh viên hiện ngay trên **chuông thông báo** của cố vấn. Cố vấn duyệt một cái — phía sinh viên trạng thái lập tức chuyển sang **'Đã xác nhận'**. Mọi thứ đồng bộ tức thì, không cần tải lại trang."

### 🎬 Cảnh 6.3 — Tìm kiếm toàn cục (tùy chọn)
**🖱️ Thao tác:** Ở thanh trên cùng (Toolbar) của cố vấn/admin, gõ tên/MSSV vào ô **tìm kiếm** → chọn kết quả → nhảy đến hồ sơ sinh viên.

**🎙️ Lời thoại:**
> "Trên thanh công cụ còn có **tìm kiếm nhanh** sinh viên và lớp ở mọi trang."

---

## Phần 7 — AI Chatbox UIT *(1 phút)*

> Tính năng này **xuất hiện ở mọi trang**, mọi vai trò (nút nổi góc dưới phải) và có cả trang riêng.

**🖱️ Thao tác:**
1. Bấm nút nổi **"AI Chatbox UIT"** ở góc dưới phải (hoặc menu **"AI Chatbox UIT"**).
2. Bấm 1 **nút chủ đề nhanh** (ví dụ **"Học phí"**) hoặc gõ: `Học phí một tín chỉ ở UIT là bao nhiêu?`
3. Cho thấy bot trả lời (hiệu ứng gõ chữ) + **nhãn nguồn** ("Trả lời bởi AI" / "FAQ" …).
4. Gõ thêm: `Điều kiện xét học bổng khuyến khích học tập?`

**🎙️ Lời thoại:**
> "Cuối cùng là **AI Chatbox UIT** — trợ lý hỏi đáp luôn nổi ở góc màn hình trên mọi trang. Sinh viên có thể hỏi về **học phí, ngành học, quy định học vụ, học bổng, liên hệ**…
> Chatbot kết hợp **dữ liệu nội bộ của trường** và **mô hình AI (Gemini)** để trả lời, có hiển thị **nguồn** của câu trả lời, và **lưu lịch sử riêng cho từng tài khoản**."

---

## Phần 8 — Kết thúc *(30s)*

**🖱️ Thao tác:** Quay về màn tổng quan đẹp nhất (vd. Dashboard admin hoặc trang điểm sinh viên).

**🎙️ Lời thoại:**
> "Tổng kết lại, **AdvisorHub** mang đến một nền tảng cố vấn học tập **hoàn chỉnh**: đồng bộ dữ liệu thật từ DAA, ba vai trò với quyền hạn riêng, nhắn tin và lịch hẹn realtime, cùng **bộ công cụ AI học vụ** giúp phát hiện sớm sinh viên nguy cơ và hỗ trợ ra quyết định.
> Về công nghệ, hệ thống dùng **React, Node.js/Express, PostgreSQL, Socket.IO** cho realtime và **Google Gemini** cho các tính năng AI.
> Em xin cảm ơn thầy và các bạn đã theo dõi phần demo của nhóm em ạ."

---

## ⚡ BẢN RÚT GỌN (~5–6 phút)
Nếu cần video ngắn, quay theo trình tự sau:

| # | Cảnh | Thời lượng | Mục tiêu |
|---|---|---|---|
| 1 | Mở đầu + màn đăng nhập (giới thiệu 2 chế độ, 3 vai trò) | 40s | Bối cảnh |
| 2 | **Sinh viên:** Xem điểm (biểu đồ + AI insight) → Đặt lịch hẹn | 60s | Trải nghiệm SV |
| 3 | **Cố vấn:** Dashboard cảnh báo → **AI: Cảnh báo** (chạy phát hiện) | 70s | Giá trị cho cố vấn |
| 4 | **Realtime:** 2 cửa sổ — gửi tin + duyệt lịch hiện ngay | 60s | Điểm "wow" |
| 5 | **Admin:** **Chat-to-Data** (hỏi tiếng Việt → biểu đồ) + AI Brief | 70s | Điểm nhấn AI |
| 6 | **AI Chatbox UIT** hỏi 1 câu + lời kết | 40s | Chốt |

---

### ✅ Checklist trước khi bấm REC
- [ ] `npm run dev` đã chạy (hoặc đã "đánh thức" server deploy).
- [ ] Đã đăng nhập sẵn 2 cửa sổ (Cố vấn + Sinh viên) cho phần realtime.
- [ ] Trình duyệt phóng to, ẩn bookmark bar, tắt thông báo hệ điều hành.
- [ ] Có sẵn 1 lịch hẹn "Chờ duyệt" do sinh viên tạo (cho cảnh duyệt realtime).
- [ ] Đã chuẩn bị các câu hỏi mẫu cho Chat-to-Data và AI Chatbox.
- [ ] Micro rõ, phòng yên tĩnh; nói chậm, rõ theo lời thoại ở trên.
