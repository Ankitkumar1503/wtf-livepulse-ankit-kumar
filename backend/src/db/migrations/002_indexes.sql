-- Indexes on Members
CREATE INDEX IF NOT EXISTS idx_members_churn_risk ON members(last_checkin_at) WHERE status='active';
CREATE INDEX IF NOT EXISTS idx_members_gym_id ON members(gym_id);

-- Indexes on Checkins
CREATE INDEX IF NOT EXISTS idx_checkins_time_brin ON checkins USING brin(checked_in);
CREATE INDEX IF NOT EXISTS idx_checkins_live_occupancy ON checkins(gym_id, checked_out) WHERE checked_out IS NULL;
CREATE INDEX IF NOT EXISTS idx_checkins_member ON checkins(member_id, checked_in DESC);

-- Indexes on Payments
CREATE INDEX IF NOT EXISTS idx_payments_gym_date ON payments(gym_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(paid_at DESC);

-- Indexes on Anomalies
CREATE INDEX IF NOT EXISTS idx_anomalies_active ON anomalies(gym_id, detected_at DESC) WHERE resolved=FALSE;

-- Materialized View for Hourly Stats
CREATE MATERIALIZED VIEW IF NOT EXISTS gym_hourly_stats AS
SELECT 
    gym_id,
    EXTRACT(DOW FROM checked_in)::INT AS day_of_week,
    EXTRACT(HOUR FROM checked_in)::INT AS hour_of_day,
    COUNT(*)::INT AS checkin_count
FROM checkins
WHERE checked_in >= NOW() - INTERVAL '7 days'
GROUP BY gym_id, day_of_week, hour_of_day;

CREATE UNIQUE INDEX IF NOT EXISTS idx_gym_hourly_stats_unique ON gym_hourly_stats (gym_id, day_of_week, hour_of_day);
