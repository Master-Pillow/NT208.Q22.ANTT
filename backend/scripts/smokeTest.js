import axios from 'axios';

const baseURL = process.env.API_URL || 'http://localhost:4000';
const client = axios.create({
  baseURL,
  timeout: 10_000,
  validateStatus: () => true,
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function login(email, password) {
  const response = await client.post('/auth/login', { email, password });
  assert(response.status === 200, `Đăng nhập ${email} thất bại (${response.status}).`);
  assert(response.data.token, `Đăng nhập ${email} không trả token.`);
  return response.data;
}

async function main() {
  const health = await client.get('/health');
  assert(health.status === 200 && health.data.ok, 'Health check backend thất bại.');

  const admin = await login('admin@uit.edu.vn', 'password123');
  const advisor = await login('aris.thorne@uit.edu.vn', 'password123');
  const student = await login('sv24521001@uit.edu.vn', 'password123');

  const adminStudents = await client.get('/admin/students', {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  assert(adminStudents.status === 200, 'Admin không đọc được danh sách sinh viên.');

  const forbiddenAdmin = await client.get('/admin/students', {
    headers: { Authorization: `Bearer ${student.token}` },
  });
  assert(forbiddenAdmin.status === 403, 'STUDENT chưa bị chặn khỏi API Admin.');

  const forbiddenAi = await client.post(
    '/ai/query',
    { question: 'Có bao nhiêu sinh viên?' },
    { headers: { Authorization: `Bearer ${student.token}` } }
  );
  assert(forbiddenAi.status === 403, 'STUDENT chưa bị chặn khỏi API AI.');

  const advisorStudents = await client.get('/advisor/students', {
    headers: { Authorization: `Bearer ${advisor.token}` },
  });
  assert(advisorStudents.status === 200, 'Advisor không đọc được sinh viên thuộc phạm vi.');

  console.log('[smoke] PASS: health, đăng nhập 3 role, Admin, Advisor và chặn STUDENT.');
}

main().catch((error) => {
  console.error('[smoke] FAIL:', error.message);
  process.exitCode = 1;
});
