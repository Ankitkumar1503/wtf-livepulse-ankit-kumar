const { WebSocketServer, WebSocket } = require('ws');

let wss = null;

function initWebSocketServer(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Send initial welcome message
    ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Connected to LivePulse WS' }));
  });

  const interval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  return wss;
}

function broadcast(data) {
  if (!wss) return;
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function broadcastCheckin({ gym_id, member_name, timestamp, current_occupancy, capacity_pct }) {
  broadcast({
    type: 'CHECKIN_EVENT',
    gym_id,
    member_name,
    timestamp: timestamp || new Date().toISOString(),
    current_occupancy,
    capacity_pct
  });
}

function broadcastCheckout({ gym_id, member_name, timestamp, current_occupancy, capacity_pct }) {
  broadcast({
    type: 'CHECKOUT_EVENT',
    gym_id,
    member_name,
    timestamp: timestamp || new Date().toISOString(),
    current_occupancy,
    capacity_pct
  });
}

function broadcastPayment({ gym_id, amount, plan_type, member_name, today_total }) {
  broadcast({
    type: 'PAYMENT_EVENT',
    gym_id,
    amount: Number(amount),
    plan_type,
    member_name,
    today_total: Number(today_total)
  });
}

function broadcastAnomalyDetected({ anomaly_id, gym_id, gym_name, anomaly_type, severity, message }) {
  broadcast({
    type: 'ANOMALY_DETECTED',
    anomaly_id,
    gym_id,
    gym_name,
    anomaly_type,
    severity,
    message
  });
}

function broadcastAnomalyResolved({ anomaly_id, gym_id, resolved_at }) {
  broadcast({
    type: 'ANOMALY_RESOLVED',
    anomaly_id,
    gym_id,
    resolved_at: resolved_at || new Date().toISOString()
  });
}

module.exports = {
  initWebSocketServer,
  broadcast,
  broadcastCheckin,
  broadcastCheckout,
  broadcastPayment,
  broadcastAnomalyDetected,
  broadcastAnomalyResolved
};
