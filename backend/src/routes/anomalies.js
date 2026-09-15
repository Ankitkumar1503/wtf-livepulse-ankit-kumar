const express = require('express');
const router = express.Router();
const { getAnomalies, dismissAnomaly } = require('../services/anomalyService');

// GET /api/anomalies?gym_id=&severity=
router.get('/', async (req, res, next) => {
  try {
    const { gym_id, severity } = req.query;
    if (severity && !['warning', 'critical'].includes(severity)) {
      return res.status(400).json({ error: 'Invalid severity filter. Must be warning or critical' });
    }
    const anomalies = await getAnomalies({ gym_id, severity });
    res.json(anomalies);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/anomalies/:id/dismiss
router.patch('/:id/dismiss', async (req, res, next) => {
  try {
    const result = await dismissAnomaly(req.params.id);
    res.json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});

module.exports = router;
