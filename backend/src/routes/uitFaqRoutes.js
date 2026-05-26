// backend/src/routes/uitFaqRoutes.js
// Route công khai — không cần đăng nhập, ai cũng hỏi được

import { Router } from 'express';
import { processUitFaq } from '../services/uitFaqService.js';
import { ragChat, isRagReady } from '../services/ragService.js';

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

// POST /uit-faq/ask — Đặt câu hỏi (tự động chọn RAG hoặc keyword matching)
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

    let result;

    // Kiểm tra RAG DB có sẵn sàng không
    const ragReady = await isRagReady();

    if (ragReady) {
      // ✅ Dùng RAG thông minh
      try {
        const ragResult = await ragChat(question.trim(), session.history);
        result = {
          answer: ragResult.answer,
          source: ragResult.fromCache ? 'rag_cache' : 'rag_vector',
          category: 'rag',
        };
      } catch (ragErr) {
        console.warn('[uit-faq/ask] RAG failed, falling back to keyword:', ragErr.message);
        // Fallback về hệ thống cũ nếu RAG lỗi
        result = await processUitFaq(question.trim(), session.history);
      }
    } else {
      // ⚡ Dùng keyword matching cũ (khi chưa setup pgvector)
      result = await processUitFaq(question.trim(), session.history);
    }

    // Cập nhật history
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

// GET /uit-faq/status — Kiểm tra trạng thái RAG
router.get('/status', async (req, res) => {
  try {
    const ragReady = await isRagReady();
    res.json({
      rag_ready: ragReady,
      mode: ragReady ? 'RAG (Vector Search)' : 'Keyword Matching (Legacy)',
    });
  } catch {
    res.json({ rag_ready: false, mode: 'Keyword Matching (Legacy)' });
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
