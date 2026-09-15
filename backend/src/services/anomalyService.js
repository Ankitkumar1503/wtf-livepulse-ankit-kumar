const pool = require('../db/pool');
const { broadcastAnomalyDetected, broadcastAnomalyResolved } = require('../websocket/server');

// Pure calculation functions (exported for Jest unit testing)
function evaluateZeroCheckins({ gymStatus, lastCheckinTime, currentTimeStr, opensAt = '06:00:00', closesAt = '22:00:00', twoHoursAgoTime }) {
  if (gymStatus !== 'active') return false;
  if (currentTimeStr < opensAt || currentTimeStr > closesAt) return false;
  if (!lastCheckinTime) return true;
  return new Date(lastCheckinTime) < new Date(twoHoursAgoTime);
}

function evaluateCapacityBreach({ currentOccupancy, capacity }) {
  if (!capacity || capacity <= 0) return false;
  return (currentOccupancy / capacity) > 0.90;
}

function evaluateCapacityBreachResolved({ currentOccupancy, capacity }) {
  if (!capacity || capacity <= 0) return true;
  return (currentOccupancy / capacity) < 0.85;
}

function evaluateRevenueDrop({ todayRevenue, sameDayLastWeekRevenue }) {
  if (!sameDayLastWeekRevenue || sameDayLastWeekRevenue <= 0) return false;
  return todayRevenue < (sameDayLastWeekRevenue * 0.70);
}

function evaluateRevenueDropResolved({ todayRevenue, sameDayLastWeekRevenue }) {
  if (!sameDayLastWeekRevenue || sameDayLastWeekRevenue <= 0) return true;
  return todayRevenue >= (sameDayLastWeekRevenue * 0.80);
}

// DB-backed anomaly evaluation and persistence
async function runAnomalyDetectionJob() {
  try {
    const gymsRes = await pool.query(`SELECT id, name, status, capacity, opens_at, closes_at FROM gyms`);
    const now = new Date();
    const currentTimeStr = now.toTimeString().slice(0, 8); // 'HH:MM:SS'
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    for (const gym of gymsRes.rows) {
      // 1. Check zero_checkins
      const lastCheckinRes = await pool.query(
        `SELECT MAX(checked_in) AS last_checkin FROM checkins WHERE gym_id = $1`,
        [gym.id]
      );
      const lastCheckin = lastCheckinRes.rows[0].last_checkin;
      const isZeroCheckins = evaluateZeroCheckins({
        gymStatus: gym.status,
        lastCheckinTime: lastCheckin,
        currentTimeStr,
        opensAt: gym.opens_at,
        closesAt: gym.closes_at,
        twoHoursAgoTime: twoHoursAgo
      });

      if (isZeroCheckins) {
        await triggerAnomaly(gym.id, gym.name, 'zero_checkins', 'warning', `No check-ins recorded at ${gym.name} in the past 2 hours.`);
      }

      // 2. Check capacity_breach
      const occRes = await pool.query(
        `SELECT COUNT(*)::INT AS occ FROM checkins WHERE gym_id = $1 AND checked_out IS NULL`,
        [gym.id]
      );
      const occupancy = Number(occRes.rows[0].occ);
      const isBreached = evaluateCapacityBreach({ currentOccupancy: occupancy, capacity: gym.capacity });

      if (isBreached) {
        const pct = Math.round((occupancy / gym.capacity) * 100);
        await triggerAnomaly(gym.id, gym.name, 'capacity_breach', 'critical', `Capacity breach at ${gym.name}: ${occupancy}/${gym.capacity} (${pct}%).`);
      } else {
        const isBreachResolved = evaluateCapacityBreachResolved({ currentOccupancy: occupancy, capacity: gym.capacity });
        if (isBreachResolved) {
          await autoResolveAnomaly(gym.id, 'capacity_breach');
        }
      }

      // 3. Check revenue_drop
      const todayRevRes = await pool.query(
        `SELECT COALESCE(SUM(amount), 0)::NUMERIC(10,2) AS rev FROM payments WHERE gym_id = $1 AND paid_at >= CURRENT_DATE`,
        [gym.id]
      );
      const todayRev = Number(todayRevRes.rows[0].rev);

      const lastWeekRevRes = await pool.query(
        `SELECT COALESCE(SUM(amount), 0)::NUMERIC(10,2) AS rev FROM payments 
         WHERE gym_id = $1 
           AND paid_at >= CURRENT_DATE - INTERVAL '7 days' 
           AND paid_at < CURRENT_DATE - INTERVAL '6 days'`,
        [gym.id]
      );
      const lastWeekSameDayRev = Number(lastWeekRevRes.rows[0].rev);

      const isRevDrop = evaluateRevenueDrop({ todayRevenue: todayRev, sameDayLastWeekRevenue: lastWeekSameDayRev });
      if (isRevDrop) {
        await triggerAnomaly(gym.id, gym.name, 'revenue_drop', 'warning', `Revenue drop at ${gym.name}: today $${todayRev} vs last week $${lastWeekSameDayRev}.`);
      } else {
        const isRevDropResolved = evaluateRevenueDropResolved({ todayRevenue: todayRev, sameDayLastWeekRevenue: lastWeekSameDayRev });
        if (isRevDropResolved) {
          await autoResolveAnomaly(gym.id, 'revenue_drop');
        }
      }
    }

    // Auto-archive resolved anomalies older than 24 hours
    await pool.query(`DELETE FROM anomalies WHERE resolved = TRUE AND resolved_at < NOW() - INTERVAL '24 hours'`);
  } catch (err) {
    console.error('Error during anomaly detection loop:', err.message);
  }
}

async function triggerAnomaly(gymId, gymName, type, severity, message) {
  const existing = await pool.query(
    `SELECT id FROM anomalies WHERE gym_id = $1 AND type = $2 AND resolved = FALSE`,
    [gymId, type]
  );
  if (existing.rows.length === 0) {
    const insertRes = await pool.query(
      `INSERT INTO anomalies (gym_id, type, severity, message, resolved, dismissed, detected_at)
       VALUES ($1, $2, $3, $4, FALSE, FALSE, NOW())
       RETURNING id, detected_at`,
      [gymId, type, severity, message]
    );
    const anomaly = insertRes.rows[0];
    broadcastAnomalyDetected({
      anomaly_id: anomaly.id,
      gym_id: gymId,
      gym_name: gymName,
      anomaly_type: type,
      severity,
      message
    });
  }
}

async function autoResolveAnomaly(gymId, type) {
  const existing = await pool.query(
    `SELECT id FROM anomalies WHERE gym_id = $1 AND type = $2 AND resolved = FALSE`,
    [gymId, type]
  );
  if (existing.rows.length > 0) {
    for (const row of existing.rows) {
      const updateRes = await pool.query(
        `UPDATE anomalies SET resolved = TRUE, resolved_at = NOW() WHERE id = $1 RETURNING resolved_at`,
        [row.id]
      );
      broadcastAnomalyResolved({
        anomaly_id: row.id,
        gym_id: gymId,
        resolved_at: updateRes.rows[0].resolved_at
      });
    }
  }
}

async function getAnomalies({ gym_id, severity } = {}) {
  let query = `
    SELECT a.id, a.gym_id, g.name AS gym_name, a.type, a.severity, a.message, a.resolved, a.dismissed, a.detected_at, a.resolved_at
    FROM anomalies a
    JOIN gyms g ON a.gym_id = g.id
    WHERE a.resolved = FALSE AND a.dismissed = FALSE
  `;
  const params = [];

  if (gym_id) {
    params.push(gym_id);
    query += ` AND a.gym_id = $${params.length}`;
  }
  if (severity) {
    params.push(severity);
    query += ` AND a.severity = $${params.length}`;
  }

  query += ` ORDER BY a.detected_at DESC`;

  const { rows } = await pool.query(query, params);
  return rows;
}

async function dismissAnomaly(anomalyId) {
  const checkRes = await pool.query(`SELECT id, severity, resolved FROM anomalies WHERE id = $1`, [anomalyId]);
  if (checkRes.rows.length === 0) {
    const error = new Error('Anomaly not found');
    error.statusCode = 404;
    throw error;
  }

  const anomaly = checkRes.rows[0];
  if (anomaly.severity === 'critical') {
    const error = new Error('Critical anomalies cannot be dismissed');
    error.statusCode = 403;
    throw error;
  }

  await pool.query(`UPDATE anomalies SET dismissed = TRUE WHERE id = $1`, [anomalyId]);
  return { success: true, message: 'Anomaly dismissed successfully' };
}

module.exports = {
  evaluateZeroCheckins,
  evaluateCapacityBreach,
  evaluateCapacityBreachResolved,
  evaluateRevenueDrop,
  evaluateRevenueDropResolved,
  runAnomalyDetectionJob,
  autoResolveAnomaly,
  getAnomalies,
  dismissAnomaly
};
