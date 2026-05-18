import { Router } from 'express';
import {
  detectFailurePatterns,
  getAnomalies,
  getFailurePatterns,
  runAnomalyDetection,
  updateAnomalyStatus,
} from '../services/anomalyDetectionService.js';
import { generateAiBrief } from '../services/aiBriefService.js';

const router = Router();

const handleError = (res, err) => {
  console.error('[ai/anomalies]', err);
  return res.status(err.status || 500).json({
    message: err.message || 'Lỗi server khi xử lý tính năng AI.',
  });
};

router.post('/anomalies/run', async (req, res) => {
  try {
    const summary = await runAnomalyDetection({
      runType: 'MANUAL',
      user: req.user,
      classCode: req.body?.classCode || null,
    });

    return res.json({
      message: 'Đã chạy phát hiện bất thường học vụ.',
      summary,
    });
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/anomalies', async (req, res) => {
  try {
    const anomalies = await getAnomalies({
      user: req.user,
      filters: {
        classCode: req.query.classCode || null,
        severity: req.query.severity || null,
        status: req.query.status || null,
        anomalyType: req.query.anomalyType || null,
      },
    });

    return res.json(anomalies);
  } catch (err) {
    return handleError(res, err);
  }
});

router.patch('/anomalies/:id/status', async (req, res) => {
  try {
    const anomaly = await updateAnomalyStatus({
      user: req.user,
      anomalyId: req.params.id,
      status: req.body?.status,
    });

    return res.json({
      message: 'Đã cập nhật trạng thái cảnh báo.',
      anomaly,
    });
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/anomaly-patterns', async (req, res) => {
  try {
    const patterns = await getFailurePatterns({ user: req.user });
    return res.json(patterns);
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/anomaly-patterns/detect', async (req, res) => {
  try {
    const patterns = await detectFailurePatterns();
    return res.json({
      message: 'Đã cập nhật pattern rớt môn.',
      patterns,
    });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/briefs/generate', async (req, res) => {
  try {
    const result = await generateAiBrief({
      user: req.user,
      classCode: req.body?.classCode,
    });

    return res.json({
      message: 'Đã sinh AI Brief.',
      ...result,
    });
  } catch (err) {
    return handleError(res, err);
  }
});

export default router;
