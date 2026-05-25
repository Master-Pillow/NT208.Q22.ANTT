// backend/src/routes/uitFaqRoutes.js
// Route công khai — không cần đăng nhập, ai cũng hỏi được

import { Router } from 'express';
import { processUitFaq } from '../services/uitFaqService.js';

const router = Router();

// Lưu đơn giản lịch sử hội thoại theo session (in-memory, reset khi server restart)
const sessions = new Map();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 phút

// Dọn sessions hết hạn mỗi 5 phút
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of sessions) {
    if (now - session.lastAccess > SESSION_TTL_MS) {
      sessions.delete(key);
    }
  }
}, 5 * 60 * 1000);

// POST /uit-faq/ask — Đặt câu hỏi
router.post('/ask', async (req, res) => {
  try {
    const { question, sessionId } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length < 2) {
      return res.status(400).json({ message: 'Câu hỏi không hợp lệ. Vui lòng nhập ít nhất 2 ký tự.' });
    }

    if (question.length > 600) {
      return res.status(400).json({ message: 'Câu hỏi quá dài (tối đa 600 ký tự).' });
    }

    // Lấy hoặc khởi tạo session
    let session = sessions.get(sessionId);
    if (!session) {
      session = { history: [], lastAccess: Date.now() };
      if (sessionId) sessions.set(sessionId, session);
    }
    session.lastAccess = Date.now();

    const result = await processUitFaq(question.trim(), session.history);

    // Cập nhật history (giữ tối đa 10 lượt)
    session.history.push({ role: 'user', content: question.trim() });
    session.history.push({ role: 'model', content: result.answer });
    if (session.history.length > 20) {
      session.history = session.history.slice(-20);
    }

    return res.json({
      answer: result.answer,
      source: result.source,
      category: result.category,
    });
  } catch (err) {
    console.error('[uit-faq/ask]', err.message);
    return res.status(err.status || 500).json({
      message: err.message || 'Xin lỗi, tôi chưa thể trả lời câu hỏi này. Vui lòng thử lại.',
    });
  }
});

// GET /uit-faq/suggestions — Lấy câu hỏi gợi ý
router.get('/suggestions', (req, res) => {
  res.json({
    suggestions: [
      'Học phí UIT năm 2024 là bao nhiêu?',
      'UIT có những ngành đào tạo nào?',
      'Điều kiện tốt nghiệp UIT là gì?',
      'Ngành Khoa học máy tính học những gì?',
      'Làm thế nào để đăng ký học phần?',
      'Học bổng tại UIT có những loại nào?',
      'Ký túc xá UIT bao nhiêu tiền?',
      'Liên hệ phòng đào tạo UIT như thế nào?',
      'GPA bao nhiêu thì bị cảnh báo học vụ?',
      'Học kỳ hè có bắt buộc không?',
    ],
  });
});

export default router;
