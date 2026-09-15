const pool = require('../../src/db/pool');
const {
  getSimulatorStatus,
  startSimulator,
  stopSimulator,
  resetSimulator,
  tickSimulator
} = require('../../src/services/simulatorService');
const wsServer = require('../../src/websocket/server');

jest.mock('../../src/db/pool', () => ({
  query: jest.fn()
}));

jest.mock('../../src/websocket/server', () => ({
  broadcastCheckin: jest.fn(),
  broadcastCheckout: jest.fn(),
  broadcastPayment: jest.fn()
}));

jest.mock('../../src/services/anomalyService', () => ({
  autoResolveAnomaly: jest.fn().mockResolvedValue(true)
}));

describe('simulatorService Comprehensive Unit Tests', () => {
  afterEach(() => {
    stopSimulator();
    jest.clearAllMocks();
  });

  test('startSimulator, getSimulatorStatus, and stopSimulator lifecycle', () => {
    expect(getSimulatorStatus()).toEqual({ status: 'stopped', speed: 1 });

    const startRes = startSimulator(5);
    expect(startRes).toEqual({ status: 'running', speed: 5 });
    expect(getSimulatorStatus()).toEqual({ status: 'running', speed: 5 });

    // Restart with 10x
    const startRes10 = startSimulator(10);
    expect(startRes10).toEqual({ status: 'running', speed: 10 });

    const stopRes = stopSimulator();
    expect(stopRes).toEqual({ status: 'stopped', speed: 10 });
    expect(getSimulatorStatus()).toEqual({ status: 'stopped', speed: 10 });
  });

  test('resetSimulator clears open checkins and restores baseline', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 10 });
    pool.query.mockResolvedValueOnce({ rowCount: 50 });

    const res = await resetSimulator();
    expect(res.status).toBe('reset');
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM checkins WHERE checked_out IS NULL'));
  });

  test('tickSimulator handles empty database gracefully', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // No gyms returned
    await tickSimulator();
    expect(wsServer.broadcastCheckin).not.toHaveBeenCalled();
  });

  test('tickSimulator checkin branch', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.1); // Roll < 0.55 -> Checkin branch

    const gymId = 'g1';
    const memberId = 'm1';

    pool.query.mockImplementation((sql, params) => {
      if (sql.includes('FROM gyms ORDER BY random()')) {
        return Promise.resolve({ rows: [{ id: gymId, name: 'Gym 1', capacity: 100 }] });
      }
      if (sql.includes('FROM members m')) {
        return Promise.resolve({ rows: [{ id: memberId, name: 'John Member' }] });
      }
      if (sql.includes('INSERT INTO checkins')) {
        return Promise.resolve({ rowCount: 1 });
      }
      if (sql.includes('UPDATE members SET last_checkin_at')) {
        return Promise.resolve({ rowCount: 1 });
      }
      if (sql.includes('COUNT(*)::INT AS occ FROM checkins')) {
        return Promise.resolve({ rows: [{ occ: 40 }] });
      }
      return Promise.resolve({ rows: [] });
    });

    await tickSimulator();

    expect(wsServer.broadcastCheckin).toHaveBeenCalledWith(
      expect.objectContaining({
        gym_id: gymId,
        member_name: 'John Member',
        current_occupancy: 40,
        capacity_pct: 40
      })
    );

    Math.random.mockRestore();
  });

  test('tickSimulator checkout branch', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.65); // 0.55 <= Roll < 0.85 -> Checkout branch

    const gymId = 'g1';

    pool.query.mockImplementation((sql, params) => {
      if (sql.includes('FROM gyms ORDER BY random()')) {
        return Promise.resolve({ rows: [{ id: gymId, name: 'Gym 1', capacity: 100 }] });
      }
      if (sql.includes('FROM checkins c')) {
        return Promise.resolve({ rows: [{ id: 'c1', name: 'Jane Member' }] });
      }
      if (sql.includes('UPDATE checkins SET checked_out = NOW()')) {
        return Promise.resolve({ rowCount: 1 });
      }
      if (sql.includes('COUNT(*)::INT AS occ FROM checkins')) {
        return Promise.resolve({ rows: [{ occ: 39 }] });
      }
      return Promise.resolve({ rows: [] });
    });

    await tickSimulator();

    expect(wsServer.broadcastCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        gym_id: gymId,
        member_name: 'Jane Member',
        current_occupancy: 39,
        capacity_pct: 39
      })
    );

    Math.random.mockRestore();
  });

  test('tickSimulator payment branch', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.95); // Roll >= 0.85 -> Payment branch

    const gymId = 'g1';

    pool.query.mockImplementation((sql, params) => {
      if (sql.includes('FROM gyms ORDER BY random()')) {
        return Promise.resolve({ rows: [{ id: gymId, name: 'Gym 1', capacity: 100 }] });
      }
      if (sql.includes('FROM members WHERE gym_id = $1')) {
        return Promise.resolve({ rows: [{ id: 'm2', name: 'Alice', plan_type: 'monthly' }] });
      }
      if (sql.includes('INSERT INTO payments')) {
        return Promise.resolve({ rowCount: 1 });
      }
      if (sql.includes('SELECT COALESCE(SUM(amount), 0)::NUMERIC(10,2) AS today_total')) {
        return Promise.resolve({ rows: [{ today_total: '1250.00' }] });
      }
      return Promise.resolve({ rows: [] });
    });

    await tickSimulator();

    expect(wsServer.broadcastPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        gym_id: gymId,
        amount: 49.99,
        plan_type: 'monthly',
        member_name: 'Alice',
        today_total: 1250
      })
    );

    Math.random.mockRestore();
  });
});
