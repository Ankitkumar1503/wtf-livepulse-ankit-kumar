const request = require('supertest');
const app = require('../../src/app');

// Mock pool queries for integration tests
jest.mock('../../src/db/pool', () => {
  const sampleGymId = '11111111-1111-1111-1111-111111111111';
  const sampleMemberId = '22222222-2222-2222-2222-222222222222';
  const warningAnomalyId = '33333333-3333-3333-3333-333333333333';
  const criticalAnomalyId = '44444444-4444-4444-4444-444444444444';

  return {
    query: jest.fn((text, params) => {
      // 1. Gyms Summary
      if (text.includes('WITH live_occ AS')) {
        return Promise.resolve({
          rows: [
            { id: sampleGymId, name: 'MetroFit Downtown', city: 'New York', address: '100 Broadway', capacity: 250, status: 'active', opens_at: '06:00:00', closes_at: '22:00:00', current_occupancy: '45', today_revenue: '1250.00' },
            { id: '2', name: 'Iron Vault', city: 'Brooklyn', address: '45 Flatbush', capacity: 180, status: 'active', opens_at: '06:00:00', closes_at: '22:00:00', current_occupancy: '20', today_revenue: '800.00' }
          ]
        });
      }

      // 2. Gym Live Snapshot
      if (text.includes('SELECT * FROM gyms WHERE id = $1')) {
        if (params && params[0] === sampleGymId) {
          return Promise.resolve({
            rows: [{ id: sampleGymId, name: 'MetroFit Downtown', city: 'New York', address: '100 Broadway', capacity: 250, status: 'active', opens_at: '06:00:00', closes_at: '22:00:00' }]
          });
        }
        return Promise.resolve({ rows: [] });
      }

      if (text.includes('SELECT COUNT(*)::INT AS occ FROM checkins')) {
        return Promise.resolve({ rows: [{ occ: 45 }] });
      }

      if (text.includes('SELECT COALESCE(SUM(amount), 0)::NUMERIC(10,2) AS rev FROM payments')) {
        return Promise.resolve({ rows: [{ rev: '1250.00' }] });
      }

      if (text.includes('SELECT c.id, c.checked_in, c.checked_out')) {
        return Promise.resolve({ rows: [{ id: '1', member_name: 'John Doe', checked_in: new Date().toISOString() }] });
      }

      // 3. Analytics
      if (text.includes('FROM gym_hourly_stats')) {
        return Promise.resolve({ rows: [{ day_of_week: 1, hour_of_day: 8, checkin_count: 32 }] });
      }
      if (text.includes('GROUP BY plan_type')) {
        return Promise.resolve({ rows: [{ plan_type: 'monthly', revenue: '500.00' }] });
      }
      if (text.includes('INTERVAL \'45 days\'')) {
        return Promise.resolve({ rows: [{ id: sampleMemberId, name: 'Inactive User', email: 'user@example.com', days_inactive: 50 }] });
      }
      if (text.includes('INTERVAL \'60 days\'')) {
        return Promise.resolve({ rows: [] });
      }
      if (text.includes('GROUP BY member_type')) {
        return Promise.resolve({ rows: [{ member_type: 'new', count: 120 }, { member_type: 'renewal', count: 380 }] });
      }

      // 4. Cross Gym Analytics
      if (text.includes('ORDER BY total_revenue DESC')) {
        return Promise.resolve({
          rows: [
            { id: sampleGymId, name: 'MetroFit Downtown', city: 'New York', total_revenue: '15400.00' }
          ]
        });
      }

      // 5. Anomalies List
      if (text.includes('FROM anomalies a')) {
        return Promise.resolve({
          rows: [
            { id: warningAnomalyId, gym_id: sampleGymId, gym_name: 'MetroFit Downtown', type: 'zero_checkins', severity: 'warning', message: 'No checkins', resolved: false, dismissed: false, detected_at: new Date().toISOString() }
          ]
        });
      }

      // 6. Dismiss Anomaly Check
      if (text.includes('SELECT id, severity, resolved FROM anomalies WHERE id = $1')) {
        if (params[0] === criticalAnomalyId) {
          return Promise.resolve({ rows: [{ id: criticalAnomalyId, severity: 'critical', resolved: false }] });
        }
        if (params[0] === warningAnomalyId) {
          return Promise.resolve({ rows: [{ id: warningAnomalyId, severity: 'warning', resolved: false }] });
        }
        return Promise.resolve({ rows: [] });
      }

      if (text.includes('UPDATE anomalies SET dismissed = TRUE')) {
        return Promise.resolve({ rowCount: 1 });
      }

      if (text.includes('DELETE FROM checkins WHERE checked_out IS NULL')) {
        return Promise.resolve({ rowCount: 10 });
      }

      if (text.includes('INSERT INTO checkins')) {
        return Promise.resolve({ rowCount: 50 });
      }

      return Promise.resolve({ rows: [] });
    })
  };
});

describe('Backend Express API Integration Tests', () => {
  test('1. GET /api/gyms returns 200 OK with list of gyms and calculated occupancy/revenue', async () => {
    const res = await request(app).get('/api/gyms');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0]).toHaveProperty('current_occupancy');
    expect(res.body[0]).toHaveProperty('today_revenue');
    expect(res.body[0]).toHaveProperty('capacity_pct');
  });

  test('2. GET /api/gyms/:id/live returns 200 OK with snapshot shape', async () => {
    const res = await request(app).get('/api/gyms/11111111-1111-1111-1111-111111111111/live');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('current_occupancy', 45);
    expect(res.body).toHaveProperty('today_revenue', 1250);
    expect(res.body).toHaveProperty('recent_checkins');
  });

  test('3. GET /api/gyms/:id/live returns 404 for invalid gym id', async () => {
    const res = await request(app).get('/api/gyms/99999999-9999-9999-9999-000000000000/live');
    expect(res.status).toBe(404);
  });

  test('4. GET /api/gyms/:id/analytics returns 200 OK with heatmap & churn risk', async () => {
    const res = await request(app).get('/api/gyms/11111111-1111-1111-1111-111111111111/analytics?dateRange=30d');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('heatmap');
    expect(res.body).toHaveProperty('revenue_by_plan');
    expect(res.body).toHaveProperty('churn_risk');
  });

  test('5. GET /api/gyms/:id/analytics returns 400 for invalid dateRange', async () => {
    const res = await request(app).get('/api/gyms/11111111-1111-1111-1111-111111111111/analytics?dateRange=invalid');
    expect(res.status).toBe(400);
  });

  test('6. GET /api/anomalies returns 200 OK with active anomalies list', async () => {
    const res = await request(app).get('/api/anomalies');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('7. GET /api/anomalies with invalid severity returns 400 Bad Request', async () => {
    const res = await request(app).get('/api/anomalies?severity=extreme');
    expect(res.status).toBe(400);
  });

  test('8. PATCH /api/anomalies/:id/dismiss returns 403 Forbidden for critical severity', async () => {
    const res = await request(app).patch('/api/anomalies/44444444-4444-4444-4444-444444444444/dismiss');
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/cannot be dismissed/i);
  });

  test('9. PATCH /api/anomalies/:id/dismiss returns 200 OK for warning severity', async () => {
    const res = await request(app).patch('/api/anomalies/33333333-3333-3333-3333-333333333333/dismiss');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('10. GET /api/analytics/cross-gym returns 200 OK with ranked cross-gym revenue', async () => {
    const res = await request(app).get('/api/analytics/cross-gym');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('11. POST /api/simulator/start returns { status: "running" }', async () => {
    const res = await request(app).post('/api/simulator/start').send({ speed: 5 });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('running');
    expect(res.body.speed).toBe(5);
  });

  test('12. POST /api/simulator/start with invalid speed returns 400 Bad Request', async () => {
    const res = await request(app).post('/api/simulator/start').send({ speed: 99 });
    expect(res.status).toBe(400);
  });

  test('13. POST /api/simulator/stop returns { status: "stopped" }', async () => {
    const res = await request(app).post('/api/simulator/stop');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('stopped');
  });

  test('14. POST /api/simulator/reset returns { status: "reset" }', async () => {
    const res = await request(app).post('/api/simulator/reset');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('reset');
  });
});
