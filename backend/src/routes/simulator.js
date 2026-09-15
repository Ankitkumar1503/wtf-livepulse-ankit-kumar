const express = require('express');
const router = express.Router();
const { startSimulator, stopSimulator, resetSimulator, getSimulatorStatus } = require('../services/simulatorService');

// GET /api/simulator/status
router.get('/status', (req, res) => {
  res.json(getSimulatorStatus());
});

// POST /api/simulator/start { speed: 1|5|10 }
router.post('/start', (req, res) => {
  const { speed = 1 } = req.body || {};
  const numSpeed = Number(speed);
  if (![1, 5, 10].includes(numSpeed)) {
    return res.status(400).json({ error: 'Speed must be 1, 5, or 10' });
  }
  const result = startSimulator(numSpeed);
  res.json(result);
});

// POST /api/simulator/stop
router.post('/stop', (req, res) => {
  const result = stopSimulator();
  res.json(result);
});

// POST /api/simulator/reset
router.post('/reset', async (req, res, next) => {
  try {
    const result = await resetSimulator();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
