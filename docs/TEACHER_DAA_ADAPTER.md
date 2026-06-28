# Adapter cookie giảng viên DAA

## Mục tiêu

Cho phép giảng viên cung cấp cookie phiên DAA để AdvisorHub tự động:

1. Xác minh danh tính giảng viên.
2. Lấy các lớp giảng viên phụ trách.
3. Lấy danh sách sinh viên của từng lớp.
4. Cập nhật lớp, phân công và sinh viên.
5. Lấy bảng điểm trong đúng phạm vi được DAA cho phép.

## Phạm vi chưa triển khai

Portal DAA không cung cấp API công khai ổn định cho luồng này. Endpoint và HTML
phụ thuộc quyền của tài khoản giảng viên. Không nên đoán URL hoặc dùng cookie
giảng viên thật trong mã nguồn.

## Dữ liệu cần thu thập khi triển khai

Không gửi cookie. Chỉ ghi lại các thông tin sau từ DevTools → Network:

- URL request danh sách lớp.
- Method và query/body không nhạy cảm.
- URL request danh sách sinh viên.
- Một Response HTML/JSON đã ẩn họ tên, MSSV, email và token.
- Cách phân trang.
- Dấu hiệu nhận biết phiên hết hạn.

## Contract đề xuất

```js
async function verifyTeacherSession(cookie) {
  return {
    external_id: '...',
    full_name: '...',
    email: '...',
  };
}

async function fetchTeacherClasses(cookie) {
  return [
    {
      code: 'ATTT2024.3',
      name: 'ATTT2024.3',
      cohort: '2024',
      program: 'An toàn thông tin',
    },
  ];
}

async function fetchClassStudents(cookie, classCode) {
  return [
    {
      mssv: '24520000',
      full_name: 'Sinh viên mẫu',
      email: '24520000@gm.uit.edu.vn',
    },
  ];
}
```

## Quy tắc upsert

- `admin_classes`: khóa theo `code`.
- `users`: giảng viên theo email hoặc external ID đã xác minh.
- `advisor_class`: khóa theo `(advisor_id, class_code)`.
- `students`: khóa theo `mssv`.
- Không xóa sinh viên/lớp khi một lần đồng bộ thiếu dữ liệu.
- Ghi trạng thái đồng bộ và lỗi theo từng lớp.

## Bảo mật bắt buộc

- Chỉ nhận cookie qua HTTPS.
- Không lưu cookie trong database, file hoặc log.
- Không trả cookie về frontend.
- Giới hạn domain request ở `daa.uit.edu.vn` và `student.uit.edu.vn`.
- Có timeout, giới hạn redirect và giới hạn tốc độ.
- Dừng khi gặp captcha, SSO lại hoặc phiên hết hạn.
- Không dùng cookie để truy cập ngoài phạm vi tài khoản giảng viên.

## Hoàn tất khi

- Đồng bộ lặp lại không tạo dữ liệu trùng.
- Một lớp lỗi không làm rollback các lớp đã hoàn tất.
- Có báo cáo số lớp, sinh viên và bảng điểm cập nhật.
- Cookie hết hạn trả thông báo rõ ràng, không lộ header request.
- Advisor chỉ xem lớp nằm trong `advisor_class`.
