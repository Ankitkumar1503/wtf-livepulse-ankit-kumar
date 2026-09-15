const express = require('express');
const router = express.Router();
const { getAllGymsSummary, getGymLiveSnapshot, getGymAnalytics } = require('../services/statsService');

// GET /api/gyms
router.get('/', async (req, res, next) => {
  try {
    const gyms = await getAllGymsSummary();
    res.json(gyms);
  } catch (err) {
    next(err);
  }
});

// GET /api/gyms/:id/live
router.get('/:id/live', async (req, res, next) => {
  try {
    const snapshot = await getGymLiveSnapshot(req.params.id);
    if (!snapshot) {
      return res.status(404).json({ error: 'Gym not found' });
    }
    res.json(snapshot);
  } catch (err) {
    next(err);
  }
});

// GET /api/gyms/:id/analytics
router.get('/:id/analytics', async (req, res, next) => {
  try {
    const { dateRange } = req.query;
    if (dateRange && !['7d', '30d', '90d'].includes(dateRange)) {
      return res.status(400).json({ error: 'Invalid dateRange. Must be 7d, 30d, or 90d' });
    }

    const analytics = await getGymAnalytics(req.params.id, dateRange || '7d');
    if (!analytics) {
      return res.status(404).json({ error: 'Gym not found' });
    }
    res.json(analytics);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
