const pool = require('../db/pool');
const { broadcastCheckin, broadcastCheckout, broadcastPayment } = require('../websocket/server');
const { autoResolveAnomaly } = require('./anomalyService');

let isRunning = false;
let currentSpeed = 1; // 1, 5, or 10
let intervalId = null;

function calculateInterval(speed) {
  const baseMs = 2000;
  if (speed === 5) return 400;
  if (speed === 10) return 200;
  return baseMs;
}

function getSimulatorStatus() {
  return {
    status: isRunning ? 'running' : 'stopped',
    speed: currentSpeed
  };
}

function startSimulator(speed = 1) {
  currentSpeed = Number(speed) || 1;
  if (intervalId) {
    clearInterval(intervalId);
  }

  isRunning = true;
  const intervalMs = calculateInterval(currentSpeed);

  intervalId = setInterval(async () => {
    try {
      await tickSimulator();
    } catch (err) {
      console.error('Error during simulator tick:', err.message);
    }
  }, intervalMs);

  return { status: 'running', speed: currentSpeed };
}

function stopSimulator() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  isRunning = false;
  return { status: 'stopped', speed: currentSpeed };
}

async function resetSimulator() {
  stopSimulator();
  // Clear open checkins
  await pool.query(`DELETE FROM checkins WHERE checked_out IS NULL`);
  // Re-open a realistic set of 50 active checkins
  await pool.query(`
    INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
    SELECT id, gym_id, NOW() - (random() * 60 || ' minutes')::interval, NULL
    FROM members
    WHERE status = 'active'
    ORDER BY random()
    LIMIT 50
  `);
  return { status: 'reset', message: 'Cleared open checkins and restored baseline' };
}

async function tickSimulator() {
  const gymsRes = await pool.query(`SELECT id, name, capacity FROM gyms ORDER BY random() LIMIT 1`);
  if (gymsRes.rows.length === 0) return;
  const gym = gymsRes.rows[0];

  const roll = Math.random();

  if (roll < 0.55) {
    // 1. Generate CHECKIN
    const memberRes = await pool.query(
      `SELECT m.id, m.name 
       FROM members m 
       LEFT JOIN checkins c ON m.id = c.member_id AND c.checked_out IS NULL 
       WHERE m.gym_id = $1 AND m.status = 'active' AND c.id IS NULL 
       ORDER BY random() LIMIT 1`,
      [gym.id]
    );

    if (memberRes.rows.length > 0) {
      const member = memberRes.rows[0];
      await pool.query(
        `INSERT INTO checkins (member_id, gym_id, checked_in, checked_out) VALUES ($1, $2, NOW(), NULL)`,
        [member.id, gym.id]
      );
      await pool.query(`UPDATE members SET last_checkin_at = NOW() WHERE id = $1`, [member.id]);

      // Auto-resolve zero_checkins anomaly if active
      await autoResolveAnomaly(gym.id, 'zero_checkins');

      const occRes = await pool.query(
        `SELECT COUNT(*)::INT AS occ FROM checkins WHERE gym_id = $1 AND checked_out IS NULL`,
        [gym.id]
      );
      const occupancy = Number(occRes.rows[0].occ);
      const capacity_pct = Math.round((occupancy / gym.capacity) * 100);

      broadcastCheckin({
        gym_id: gym.id,
        member_name: member.name,
        timestamp: new Date().toISOString(),
        current_occupancy: occupancy,
        capacity_pct
      });
    }
  } else if (roll < 0.85) {
    // 2. Generate CHECKOUT
    const checkinRes = await pool.query(
      `SELECT c.id, m.name 
       FROM checkins c 
       JOIN members m ON c.member_id = m.id 
       WHERE c.gym_id = $1 AND c.checked_out IS NULL 
       ORDER BY random() LIMIT 1`,
      [gym.id]
    );

    if (checkinRes.rows.length > 0) {
      const activeCheckin = checkinRes.rows[0];
      await pool.query(`UPDATE checkins SET checked_out = NOW() WHERE id = $1`, [activeCheckin.id]);

      const occRes = await pool.query(
        `SELECT COUNT(*)::INT AS occ FROM checkins WHERE gym_id = $1 AND checked_out IS NULL`,
        [gym.id]
      );
      const occupancy = Number(occRes.rows[0].occ);
      const capacity_pct = Math.round((occupancy / gym.capacity) * 100);

      broadcastCheckout({
        gym_id: gym.id,
        member_name: activeCheckin.name,
        timestamp: new Date().toISOString(),
        current_occupancy: occupancy,
        capacity_pct
      });
    }
  } else {
    // 3. Generate PAYMENT
    const memberRes = await pool.query(
      `SELECT id, name, plan_type FROM members WHERE gym_id = $1 ORDER BY random() LIMIT 1`,
      [gym.id]
    );

    if (memberRes.rows.length > 0) {
      const member = memberRes.rows[0];
      const amountMap = { monthly: 49.99, quarterly: 129.99, annual: 499.99 };
      const amount = amountMap[member.plan_type] || 49.99;

      await pool.query(
        `INSERT INTO payments (member_id, gym_id, amount, plan_type, payment_type, paid_at, notes)
         VALUES ($1, $2, $3, $4, 'renewal', NOW(), 'Simulator payment')`,
        [member.id, gym.id, amount, member.plan_type]
      );

      const revRes = await pool.query(
        `SELECT COALESCE(SUM(amount), 0)::NUMERIC(10,2) AS today_total FROM payments WHERE gym_id = $1 AND paid_at >= CURRENT_DATE`,
        [gym.id]
      );

      broadcastPayment({
        gym_id: gym.id,
        amount,
        plan_type: member.plan_type,
        member_name: member.name,
        today_total: Number(revRes.rows[0].today_total)
      });
    }
  }
}

module.exports = {
  getSimulatorStatus,
  startSimulator,
  stopSimulator,
  resetSimulator,
  tickSimulator
};
