const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const { initWebSocketServer } = require('./websocket/server');
const { startBackgroundJobs } = require('./jobs/anomalyDetector');

const gymsRouter = require('./routes/gyms');
const anomaliesRouter = require('./routes/anomalies');
const analyticsRouter = require('./routes/analytics');
const simulatorRouter = require('./routes/simulator');

const app = express();

app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount Routes
app.use('/api/gyms', gymsRouter);
app.use('/api/anomalies', anomaliesRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/simulator', simulatorRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  const status = err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

let server = null;

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3001;
  server = http.createServer(app);
  
  // Attach native WebSocket server
  initWebSocketServer(server);

  server.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    // Start periodic background jobs
    startBackgroundJobs();
  });
}

module.exports = app;
