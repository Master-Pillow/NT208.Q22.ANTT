import { Router } from 'express';
import { generateGradeInsight } from '../services/gradeInsightService.js';

const router = Router();

// POST /ai/grade-insight — sinh nhận định AI cho scope student|class|cohort|system.
// Phân quyền nằm trong service: ADMIN xem tất cả, ADVISOR xem lớp/SV mình phụ trách,
// STUDENT chỉ xem chính mình.
router.post('/grade-insight', async (req, res) => {
  try {
    const insight = await generateGradeInsight({
      user: req.user,
      scope: req.body?.scope,
      id: req.body?.id,
      refresh: Boolean(req.body?.refresh),
    });
    return res.json(insight);
  } catch (err) {
    console.error('[ai/grade-insight]', err.message);
    return res.status(err.status || 500).json({
      message: err.message || 'Lỗi server khi sinh phân tích AI.',
    });
  }
});

export default router;
