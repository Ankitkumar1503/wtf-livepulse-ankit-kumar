const pool = require('../../src/db/pool');
const {
  evaluateZeroCheckins,
  evaluateCapacityBreach,
  evaluateCapacityBreachResolved,
  evaluateRevenueDrop,
  evaluateRevenueDropResolved,
  runAnomalyDetectionJob,
  triggerAnomaly,
  autoResolveAnomaly,
  getAnomalies,
  dismissAnomaly
} = require('../../src/services/anomalyService');
const wsServer = require('../../src/websocket/server');

jest.mock('../../src/db/pool', () => ({
  query: jest.fn()
}));

jest.mock('../../src/websocket/server', () => ({
  broadcastAnomalyDetected: jest.fn(),
  broadcastAnomalyResolved: jest.fn()
}));

describe('anomalyService Comprehensive Coverage Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Boundary Condition Pure Tests', () => {
    test('zero_checkins boundary tests', () => {
      // Gym inactive
      expect(evaluateZeroCheckins({ gymStatus: 'inactive', currentTimeStr: '10:00:00' })).toBe(false);
      // Outside operating hours
      expect(evaluateZeroCheckins({ gymStatus: 'active', currentTimeStr: '05:00:00', opensAt: '06:00:00', closesAt: '22:00:00' })).toBe(false);
      // Null last checkin time inside operating hours -> triggers true
      expect(evaluateZeroCheckins({ gymStatus: 'active', lastCheckinTime: null, currentTimeStr: '10:00:00', opensAt: '06:00:00', closesAt: '22:00:00' })).toBe(true);
      // Last checkin less than 2 hours ago -> false
      const now = new Date();
      const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
      expect(evaluateZeroCheckins({ gymStatus: 'active', lastCheckinTime: thirtyMinsAgo, currentTimeStr: '10:00:00', opensAt: '06:00:00', closesAt: '22:00:00', twoHoursAgoTime: twoHoursAgo })).toBe(false);
    });

    test('capacity_breach boundary tests', () => {
      // Invalid capacity
      expect(evaluateCapacityBreach({ currentOccupancy: 10, capacity: 0 })).toBe(false);
      expect(evaluateCapacityBreachResolved({ currentOccupancy: 10, capacity: 0 })).toBe(true);

      // Exactly 90% occupancy (90/100 = 0.90) -> does NOT breach (needs > 0.90)
      expect(evaluateCapacityBreach({ currentOccupancy: 90, capacity: 100 })).toBe(false);

      // 91% occupancy (91/100 = 0.91) -> breaches
      expect(evaluateCapacityBreach({ currentOccupancy: 91, capacity: 100 })).toBe(true);

      // Exactly 85% occupancy (85/100 = 0.85) -> NOT resolved (needs < 0.85)
      expect(evaluateCapacityBreachResolved({ currentOccupancy: 85, capacity: 100 })).toBe(false);

      // 84% occupancy (84/100 = 0.84) -> resolved
      expect(evaluateCapacityBreachResolved({ currentOccupancy: 84, capacity: 100 })).toBe(true);
    });

    test('revenue_drop boundary tests', () => {
      // Invalid or zero last week revenue
      expect(evaluateRevenueDrop({ todayRevenue: 50, sameDayLastWeekRevenue: 0 })).toBe(false);
      expect(evaluateRevenueDropResolved({ todayRevenue: 50, sameDayLastWeekRevenue: 0 })).toBe(true);

      // Exactly 30% drop (today = 70% of last week = 700 vs 1000) -> triggers revenue drop (< 700 vs <= 700)
      expect(evaluateRevenueDrop({ todayRevenue: 699.99, sameDayLastWeekRevenue: 1000 })).toBe(true);
      expect(evaluateRevenueDrop({ todayRevenue: 700, sameDayLastWeekRevenue: 1000 })).toBe(false);

      // Revenue recovery at 80% (800 vs 1000) -> resolved
      expect(evaluateRevenueDropResolved({ todayRevenue: 800, sameDayLastWeekRevenue: 1000 })).toBe(true);
      expect(evaluateRevenueDropResolved({ todayRevenue: 799.99, sameDayLastWeekRevenue: 1000 })).toBe(false);
    });
  });

  describe('DB-backed anomaly functions', () => {
    test('runAnomalyDetectionJob handles zero checkins, capacity breach, and revenue drop', async () => {
      const gymId = '11111111-1111-1111-1111-111111111111';
      // 1. SELECT gyms
      pool.query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT id, name, status, capacity')) {
          return Promise.resolve({
            rows: [{ id: gymId, name: 'Test Gym', status: 'active', capacity: 100, opens_at: '00:00:00', closes_at: '23:59:59' }]
          });
        }
        if (sql.includes('MAX(checked_in) AS last_checkin')) {
          return Promise.resolve({ rows: [{ last_checkin: new Date(Date.now() - 3 * 3600 * 1000).toISOString() }] });
        }
        if (sql.includes('COUNT(*)::INT AS occ FROM checkins')) {
          return Promise.resolve({ rows: [{ occ: 95 }] }); // 95% occupancy -> breach
        }
        if (sql.includes('SELECT COALESCE(SUM(amount), 0)::NUMERIC(10,2) AS rev FROM payments WHERE gym_id = $1 AND paid_at >= CURRENT_DATE')) {
          return Promise.resolve({ rows: [{ rev: '500.00' }] });
        }
        if (sql.includes('paid_at >= CURRENT_DATE - INTERVAL \'7 days\'')) {
          return Promise.resolve({ rows: [{ rev: '1000.00' }] }); // 500 vs 1000 -> revenue drop!
        }
        if (sql.includes('SELECT id FROM anomalies WHERE gym_id = $1 AND type = $2 AND resolved = FALSE')) {
          return Promise.resolve({ rows: [] }); // No existing anomaly
        }
        if (sql.includes('INSERT INTO anomalies')) {
          return Promise.resolve({ rows: [{ id: 'new-anomaly-id', detected_at: new Date().toISOString() }] });
        }
        if (sql.includes('DELETE FROM anomalies WHERE resolved = TRUE')) {
          return Promise.resolve({ rowCount: 0 });
        }
        return Promise.resolve({ rows: [] });
      });

      await runAnomalyDetectionJob();
      expect(wsServer.broadcastAnomalyDetected).toHaveBeenCalled();
    });

    test('runAnomalyDetectionJob handles auto-resolution branch when conditions clear', async () => {
      const gymId = '11111111-1111-1111-1111-111111111111';
      pool.query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT id, name, status, capacity')) {
          return Promise.resolve({
            rows: [{ id: gymId, name: 'Test Gym', status: 'active', capacity: 100, opens_at: '00:00:00', closes_at: '23:59:59' }]
          });
        }
        if (sql.includes('MAX(checked_in) AS last_checkin')) {
          return Promise.resolve({ rows: [{ last_checkin: new Date().toISOString() }] }); // Recent checkin -> no zero checkins
        }
        if (sql.includes('COUNT(*)::INT AS occ FROM checkins')) {
          return Promise.resolve({ rows: [{ occ: 50 }] }); // 50% occupancy -> resolved breach
        }
        if (sql.includes('paid_at >= CURRENT_DATE - INTERVAL \'7 days\'')) {
          return Promise.resolve({ rows: [{ rev: '500.00' }] });
        }
        if (sql.includes('paid_at >= CURRENT_DATE')) {
          return Promise.resolve({ rows: [{ rev: '500.00' }] }); // 500 vs 500 -> resolved revenue drop
        }
        if (sql.includes('SELECT id FROM anomalies WHERE gym_id = $1 AND type = $2 AND resolved = FALSE')) {
          return Promise.resolve({ rows: [{ id: 'existing-anomaly-id' }] });
        }
        if (sql.includes('UPDATE anomalies SET resolved = TRUE')) {
          return Promise.resolve({ rows: [{ resolved_at: new Date().toISOString() }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await runAnomalyDetectionJob();
      expect(wsServer.broadcastAnomalyResolved).toHaveBeenCalled();
    });

    test('getAnomalies with and without filters', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 'a1', gym_id: 'g1', type: 'capacity_breach', severity: 'critical' }]
      });
      const res = await getAnomalies({ gym_id: 'g1', severity: 'critical' });
      expect(res).toHaveLength(1);
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('AND a.gym_id = $1 AND a.severity = $2'), ['g1', 'critical']);
    });

    test('dismissAnomaly handles non-existent, critical 403, and warning success', async () => {
      // 1. Not found -> 404
      pool.query.mockResolvedValueOnce({ rows: [] });
      await expect(dismissAnomaly('unknown-id')).rejects.toThrow('Anomaly not found');

      // 2. Critical -> 403
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'crit-id', severity: 'critical', resolved: false }] });
      await expect(dismissAnomaly('crit-id')).rejects.toThrow('Critical anomalies cannot be dismissed');

      // 3. Warning -> success
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'warn-id', severity: 'warning', resolved: false }] });
      pool.query.mockResolvedValueOnce({ rowCount: 1 });
      const result = await dismissAnomaly('warn-id');
      expect(result.success).toBe(true);
    });
  });
});
