const pool = require('../db/pool');

async function getAllGymsSummary() {
  const query = `
    WITH live_occ AS (
      SELECT gym_id, COUNT(*)::INT AS current_occupancy
      FROM checkins
      WHERE checked_out IS NULL
      GROUP BY gym_id
    ),
    today_rev AS (
      SELECT gym_id, COALESCE(SUM(amount), 0)::NUMERIC(10,2) AS today_revenue
      FROM payments
      WHERE paid_at >= CURRENT_DATE
      GROUP BY gym_id
    )
    SELECT 
      g.id,
      g.name,
      g.city,
      g.address,
      g.capacity,
      g.status,
      g.opens_at,
      g.closes_at,
      COALESCE(occ.current_occupancy, 0) AS current_occupancy,
      COALESCE(rev.today_revenue, 0) AS today_revenue
    FROM gyms g
    LEFT JOIN live_occ occ ON g.id = occ.gym_id
    LEFT JOIN today_rev rev ON g.id = rev.gym_id
    ORDER BY g.name ASC;
  `;
  const { rows } = await pool.query(query);
  return rows.map((r) => ({
    ...r,
    current_occupancy: Number(r.current_occupancy),
    today_revenue: Number(r.today_revenue),
    capacity_pct: Math.round((Number(r.current_occupancy) / r.capacity) * 100)
  }));
}

async function getGymLiveSnapshot(gymId) {
  const gymRes = await pool.query(`SELECT * FROM gyms WHERE id = $1`, [gymId]);
  if (gymRes.rows.length === 0) return null;
  const gym = gymRes.rows[0];

  const occRes = await pool.query(
    `SELECT COUNT(*)::INT AS occ FROM checkins WHERE gym_id = $1 AND checked_out IS NULL`,
    [gymId]
  );
  const current_occupancy = Number(occRes.rows[0].occ);

  const revRes = await pool.query(
    `SELECT COALESCE(SUM(amount), 0)::NUMERIC(10,2) AS rev FROM payments WHERE gym_id = $1 AND paid_at >= CURRENT_DATE`,
    [gymId]
  );
  const today_revenue = Number(revRes.rows[0].rev);

  const recentRes = await pool.query(
    `SELECT c.id, c.checked_in, c.checked_out, m.name AS member_name 
     FROM checkins c 
     JOIN members m ON c.member_id = m.id 
     WHERE c.gym_id = $1 
     ORDER BY c.checked_in DESC 
     LIMIT 10`,
    [gymId]
  );

  return {
    ...gym,
    current_occupancy,
    capacity_pct: Math.round((current_occupancy / gym.capacity) * 100),
    today_revenue,
    recent_checkins: recentRes.rows
  };
}

async function getGymAnalytics(gymId, dateRange = '7d') {
  const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
  const days = daysMap[dateRange] || 7;

  // 1. Heatmap from Materialized View
  const heatmapRes = await pool.query(
    `SELECT day_of_week, hour_of_day, checkin_count 
     FROM gym_hourly_stats 
     WHERE gym_id = $1 
     ORDER BY day_of_week, hour_of_day`,
    [gymId]
  );

  // 2. Revenue by Plan Type
  const revPlanRes = await pool.query(
    `SELECT plan_type, COALESCE(SUM(amount), 0)::NUMERIC(10,2) AS revenue 
     FROM payments 
     WHERE gym_id = $1 AND paid_at >= NOW() - ($2 || ' days')::interval 
     GROUP BY plan_type`,
    [gymId, days]
  );

  // 3. Churn Risk (High 45-60d, Critical 60+d)
  const highChurnRes = await pool.query(
    `SELECT id, name, email, phone, last_checkin_at, 
            ROUND(EXTRACT(EPOCH FROM (NOW() - last_checkin_at)) / 86400)::INT AS days_inactive 
     FROM members 
     WHERE gym_id = $1 AND status = 'active' 
       AND last_checkin_at < NOW() - INTERVAL '45 days' 
       AND last_checkin_at >= NOW() - INTERVAL '60 days'`,
    [gymId]
  );

  const criticalChurnRes = await pool.query(
    `SELECT id, name, email, phone, last_checkin_at, 
            ROUND(EXTRACT(EPOCH FROM (NOW() - last_checkin_at)) / 86400)::INT AS days_inactive 
     FROM members 
     WHERE gym_id = $1 AND status = 'active' 
       AND last_checkin_at < NOW() - INTERVAL '60 days'`,
    [gymId]
  );

  // 4. New vs Renewal Ratio
  const ratioRes = await pool.query(
    `SELECT member_type, COUNT(*)::INT AS count 
     FROM members 
     WHERE gym_id = $1 
     GROUP BY member_type`,
    [gymId]
  );

  return {
    gym_id: gymId,
    dateRange,
    heatmap: heatmapRes.rows,
    revenue_by_plan: revPlanRes.rows.map(r => ({ plan_type: r.plan_type, revenue: Number(r.revenue) })),
    churn_risk: {
      high_risk: highChurnRes.rows,
      critical_risk: criticalChurnRes.rows
    },
    member_type_ratio: ratioRes.rows
  };
}

async function getCrossGymAnalytics() {
  const query = `
    SELECT 
      g.id,
      g.name,
      g.city,
      COALESCE(SUM(p.amount), 0)::NUMERIC(10,2) AS total_revenue
    FROM gyms g
    LEFT JOIN payments p ON g.id = p.gym_id AND p.paid_at >= NOW() - INTERVAL '30 days'
    GROUP BY g.id, g.name, g.city
    ORDER BY total_revenue DESC;
  `;
  const { rows } = await pool.query(query);
  return rows.map(r => ({
    ...r,
    total_revenue: Number(r.total_revenue)
  }));
}

async function refreshMaterializedView() {
  try {
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY gym_hourly_stats');
  } catch (err) {
    console.error('Failed to refresh gym_hourly_stats materialized view:', err.message);
  }
}

module.exports = {
  getAllGymsSummary,
  getGymLiveSnapshot,
  getGymAnalytics,
  getCrossGymAnalytics,
  refreshMaterializedView
};
