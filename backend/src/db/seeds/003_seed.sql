-- Seed 10 Gyms
INSERT INTO gyms (id, name, city, address, capacity, status, opens_at, closes_at) VALUES
('11111111-1111-1111-1111-111111111111', 'MetroFit Downtown', 'New York', '100 Broadway Ave', 250, 'active', '06:00:00', '22:00:00'),
('22222222-2222-2222-2222-222222222222', 'Iron Vault Gym', 'Brooklyn', '45 Flatbush Ave', 180, 'active', '06:00:00', '22:00:00'),
('33333333-3333-3333-3333-333333333333', 'Pulse Fitness', 'Austin', '500 Congress Ave', 200, 'active', '06:00:00', '22:00:00'),
('44444444-4444-4444-4444-444444444444', 'Apex Athletic Club', 'Los Angeles', '1200 Wilshire Blvd', 300, 'active', '06:00:00', '22:00:00'),
('55555555-5555-5555-5555-555555555555', 'Zenith Operations Gym', 'Chicago', '300 N Michigan Ave', 150, 'active', '06:00:00', '22:00:00'),
('66666666-6666-6666-6666-666666666666', 'Titan Strength House', 'Miami', '800 Ocean Dr', 220, 'active', '06:00:00', '22:00:00'),
('77777777-7777-7777-7777-777777777777', 'Velocity Performance', 'Seattle', '400 Pine St', 120, 'active', '06:00:00', '22:00:00'),
('88888888-8888-8888-8888-888888888888', 'Horizon Health Hub', 'Denver', '1600 California St', 160, 'active', '06:00:00', '22:00:00'),
('99999999-9999-9999-9999-999999999999', 'Olympia Fitness Lab', 'San Francisco', '700 Market St', 280, 'active', '06:00:00', '22:00:00'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Vanguard Training', 'Boston', '200 Boylston St', 140, 'active', '06:00:00', '22:00:00')
ON CONFLICT (id) DO NOTHING;

-- Seed 5,000 Members across the 10 gyms
INSERT INTO members (id, gym_id, name, email, phone, plan_type, member_type, status, joined_at, plan_expires_at, last_checkin_at)
SELECT 
    gen_random_uuid() AS id,
    g.id AS gym_id,
    'Member ' || gs.i AS name,
    'member' || gs.i || '@example.com' AS email,
    '+1-555-01' || LPAD((gs.i % 100)::text, 2, '0') AS phone,
    (ARRAY['monthly', 'quarterly', 'annual'])[floor(random() * 3 + 1)] AS plan_type,
    (ARRAY['new', 'renewal'])[floor(random() * 2 + 1)] AS member_type,
    CASE 
        WHEN gs.i % 10 = 0 THEN 'inactive'
        WHEN gs.i % 20 = 0 THEN 'frozen'
        ELSE 'active'
    END AS status,
    NOW() - (random() * 90) * INTERVAL '1 day' AS joined_at,
    NOW() + (30 + floor(random() * 300)) * INTERVAL '1 day' AS plan_expires_at,
    CASE
        WHEN gs.i % 15 = 0 THEN NOW() - (61 + floor(random() * 20)) * INTERVAL '1 day' -- Critical churn risk (>60d)
        WHEN gs.i % 8 = 0 THEN NOW() - (46 + floor(random() * 14)) * INTERVAL '1 day'  -- High churn risk (45-60d)
        ELSE NOW() - (random() * 40) * INTERVAL '1 day'
    END AS last_checkin_at
FROM generate_series(1, 5000) AS gs(i)
CROSS JOIN LATERAL (
    SELECT id FROM gyms ORDER BY id OFFSET ((gs.i - 1) % 10) LIMIT 1
) g;

-- Seed Payments (approx 7,500 historical payment records over last 90 days)
INSERT INTO payments (id, member_id, gym_id, amount, plan_type, payment_type, paid_at, notes)
SELECT 
    gen_random_uuid(),
    m.id,
    m.gym_id,
    CASE m.plan_type
        WHEN 'monthly' THEN 49.99
        WHEN 'quarterly' THEN 129.99
        WHEN 'annual' THEN 499.99
    END AS amount,
    m.plan_type,
    m.member_type,
    m.joined_at + (floor(random() * 30)) * INTERVAL '1 day' AS paid_at,
    'Automated subscription payment' AS notes
FROM members m;

-- Additional Payments today for realistic daily revenue baseline
INSERT INTO payments (id, member_id, gym_id, amount, plan_type, payment_type, paid_at, notes)
SELECT 
    gen_random_uuid(),
    m.id,
    m.gym_id,
    CASE m.plan_type
        WHEN 'monthly' THEN 49.99
        WHEN 'quarterly' THEN 129.99
        WHEN 'annual' THEN 499.99
    END AS amount,
    m.plan_type,
    'renewal' AS payment_type,
    NOW() - (random() * 6) * INTERVAL '1 hour' AS paid_at,
    'Today renewal' AS notes
FROM members m
WHERE m.status = 'active'
ORDER BY random()
LIMIT 300;

-- Historical Checkins over last 90 days
-- Generate checkins for each day with realistic hourly weights:
-- 6-9 AM (Morning peak), 17-20 PM (Evening peak), lower midday, minimal night
WITH RECURSIVE days AS (
    SELECT CURRENT_DATE - INTERVAL '89 days' AS d
    UNION ALL
    SELECT d + INTERVAL '1 day' FROM days WHERE d < CURRENT_DATE
),
sampled_members AS (
    SELECT id, gym_id FROM members WHERE status = 'active'
),
checkin_gen AS (
    SELECT 
        sm.id AS member_id,
        sm.gym_id AS gym_id,
        d.d + (
            CASE (floor(random() * 10))::int
                WHEN 0 THEN '06:00:00'::time + (random() * 3) * INTERVAL '1 hour'
                WHEN 1 THEN '06:00:00'::time + (random() * 3) * INTERVAL '1 hour'
                WHEN 2 THEN '06:00:00'::time + (random() * 3) * INTERVAL '1 hour'
                WHEN 3 THEN '09:00:00'::time + (random() * 3) * INTERVAL '1 hour'
                WHEN 4 THEN '12:00:00'::time + (random() * 2) * INTERVAL '1 hour'
                WHEN 5 THEN '14:00:00'::time + (random() * 3) * INTERVAL '1 hour'
                WHEN 6 THEN '17:00:00'::time + (random() * 3) * INTERVAL '1 hour'
                WHEN 7 THEN '17:00:00'::time + (random() * 3) * INTERVAL '1 hour'
                WHEN 8 THEN '17:00:00'::time + (random() * 3) * INTERVAL '1 hour'
                ELSE '20:00:00'::time + (random() * 2) * INTERVAL '1 hour'
            END
        ) AS checked_in
    FROM days d
    CROSS JOIN sampled_members sm
    WHERE random() < 0.04 -- approx ~18,000 historical checkins across 90 days
)
INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
SELECT 
    member_id,
    gym_id,
    checked_in,
    checked_in + (30 + floor(random() * 60)) * INTERVAL '1 minute' AS checked_out
FROM checkin_gen
WHERE checked_in < NOW() - INTERVAL '2 hours';

-- Active currently open checkins for today (checked_out IS NULL)
INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
SELECT 
    m.id,
    m.gym_id,
    NOW() - (random() * 90) * INTERVAL '1 minute' AS checked_in,
    NULL AS checked_out
FROM members m
WHERE m.status = 'active'
ORDER BY random()
LIMIT 250;

-- Refresh Materialized View
REFRESH MATERIALIZED VIEW gym_hourly_stats;
