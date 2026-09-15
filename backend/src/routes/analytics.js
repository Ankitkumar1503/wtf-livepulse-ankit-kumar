const express = require('express');
const router = express.Router();
const { getCrossGymAnalytics } = require('../services/statsService');

// GET /api/analytics/cross-gym
router.get('/cross-gym', async (req, res, next) => {
  try {
    const data = await getCrossGymAnalytics();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
