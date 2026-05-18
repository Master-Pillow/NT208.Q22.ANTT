import { Router } from 'express';
import { executeAiQuery } from '../services/textToSqlService.js';

const router = Router();

router.post('/query', async (req, res) => {
  try {
    const result = await executeAiQuery({
      user: req.user,
      question: req.body?.question,
    });

    return res.json(result);
  } catch (err) {
    console.error('[ai/query]', err);
    return res.status(err.status || 500).json({
      message: err.message || 'Loi server khi truy van Chat-to-Data.',
    });
  }
});

export default router;
