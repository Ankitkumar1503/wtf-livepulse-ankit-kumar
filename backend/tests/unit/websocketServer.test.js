const http = require('http');
const {
  initWebSocketServer,
  broadcast,
  broadcastCheckin,
  broadcastCheckout,
  broadcastPayment,
  broadcastAnomalyDetected,
  broadcastAnomalyResolved
} = require('../../src/websocket/server');

describe('WebSocket Server Module Coverage Unit Tests', () => {
  let server;

  beforeEach(() => {
    server = http.createServer();
  });

  afterEach(() => {
    if (server.listening) {
      server.close();
    }
  });

  test('initWebSocketServer registers connection, ping timer, and broadcasts correctly', () => {
    jest.useFakeTimers();

    const wss = initWebSocketServer(server);
    expect(wss).toBeDefined();

    // Mock active client sockets
    const mockClientOpen = {
      readyState: 1, // WebSocket.OPEN
      isAlive: true,
      send: jest.fn(),
      ping: jest.fn(),
      terminate: jest.fn(),
      on: jest.fn((event, cb) => {
        if (event === 'pong') cb();
      })
    };

    const mockClientDead = {
      readyState: 1,
      isAlive: false,
      send: jest.fn(),
      ping: jest.fn(),
      terminate: jest.fn(),
      on: jest.fn()
    };

    wss.clients.add(mockClientOpen);
    wss.clients.add(mockClientDead);

    // Test ping interval tick (30s)
    jest.advanceTimersByTime(30000);
    expect(mockClientDead.terminate).toHaveBeenCalled();

    // Test Broadcast functions
    broadcastCheckin({
      gym_id: 'g1',
      member_name: 'John',
      timestamp: '2026-09-15T12:00:00Z',
      current_occupancy: 10,
      capacity_pct: 20
    });
    expect(mockClientOpen.send).toHaveBeenCalledWith(expect.stringContaining('CHECKIN_EVENT'));

    broadcastCheckout({
      gym_id: 'g1',
      member_name: 'John',
      timestamp: '2026-09-15T13:00:00Z',
      current_occupancy: 9,
      capacity_pct: 18
    });
    expect(mockClientOpen.send).toHaveBeenCalledWith(expect.stringContaining('CHECKOUT_EVENT'));

    broadcastPayment({
      gym_id: 'g1',
      amount: 49.99,
      plan_type: 'monthly',
      member_name: 'John',
      today_total: 100
    });
    expect(mockClientOpen.send).toHaveBeenCalledWith(expect.stringContaining('PAYMENT_EVENT'));

    broadcastAnomalyDetected({
      anomaly_id: 'a1',
      gym_id: 'g1',
      gym_name: 'Gym 1',
      anomaly_type: 'capacity_breach',
      severity: 'critical',
      message: 'Breached'
    });
    expect(mockClientOpen.send).toHaveBeenCalledWith(expect.stringContaining('ANOMALY_DETECTED'));

    broadcastAnomalyResolved({
      anomaly_id: 'a1',
      gym_id: 'g1',
      resolved_at: '2026-09-15T14:00:00Z'
    });
    expect(mockClientOpen.send).toHaveBeenCalledWith(expect.stringContaining('ANOMALY_RESOLVED'));

    jest.useRealTimers();
  });
});
