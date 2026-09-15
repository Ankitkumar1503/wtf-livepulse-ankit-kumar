DO $$
DECLARE
    v_lajpat_id UUID := gen_random_uuid();
    v_cp_id UUID := gen_random_uuid();
    v_bandra_id UUID := gen_random_uuid();
    v_powai_id UUID := gen_random_uuid();
    v_indiranagar_id UUID := gen_random_uuid();
    v_koramangala_id UUID := gen_random_uuid();
    v_banjara_id UUID := gen_random_uuid();
    v_noida_id UUID := gen_random_uuid();
    v_saltlake_id UUID := gen_random_uuid();
    v_velachery_id UUID := gen_random_uuid();

    v_first_names TEXT[] := ARRAY['Aarav','Rohan','Priya','Ananya','Vikram','Aditya','Rahul','Sneha','Kavya','Arjun','Neha','Rajesh','Siddharth','Pooja','Varun','Divya','Karan','Meera','Amit','Ishaan','Riya','Gaurav','Tanvi','Sanjay','Shreya','Nikhil','Tarun','Bhavna','Manish','Swati','Deepak','Preeti','Abhishek','Simran','Vivek','Anjali','Alok','Nisha','Yash','Ritu','Suresh','Pankaj','Kunal','Jyoti','Poonam','Sunil','Aakash','Ramesh','Nitin','Kiran'];
    v_last_names TEXT[] := ARRAY['Sharma','Verma','Patel','Iyer','Singh','Gupta','Reddy','Nair','Chatterjee','Kumar','Joshi','Mehta','Rao','Deshmukh','Mukherjee','Bhasin','Saxena','Kapoor','Malhotra','Chawla','Aggarwal','Choudhury','Srinivasan','Kulkarni','Bhatnagar','Shetty','Mishra','Trivedi','Pandey','Dutta','Chauhan','Rathore','Solanki','Sinha','Roy','Banerjee','Das','Pillai','Menon','Bhatt'];
    
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- Idempotency check
    IF EXISTS (SELECT 1 FROM gyms LIMIT 1) THEN
        RAISE NOTICE 'Database already seeded, skipping.';
        RETURN;
    END IF;

    ---------------------------------------------------------------------------
    -- 1. SEED GYMS (EXACT 10 RECORDS)
    ---------------------------------------------------------------------------
    RAISE NOTICE 'Seeding gyms...';
    INSERT INTO gyms (id, name, city, address, capacity, status, opens_at, closes_at) VALUES
    (v_lajpat_id, 'WTF Gyms — Lajpat Nagar', 'New Delhi', 'Block D, Lajpat Nagar II', 220, 'active', '05:30:00', '22:30:00'),
    (v_cp_id, 'WTF Gyms — Connaught Place', 'New Delhi', 'Inner Circle, CP', 180, 'active', '06:00:00', '22:00:00'),
    (v_bandra_id, 'WTF Gyms — Bandra West', 'Mumbai', 'Hill Road, Bandra West', 300, 'active', '05:00:00', '23:00:00'),
    (v_powai_id, 'WTF Gyms — Powai', 'Mumbai', 'Hiranandani Gardens, Powai', 250, 'active', '05:30:00', '22:30:00'),
    (v_indiranagar_id, 'WTF Gyms — Indiranagar', 'Bengaluru', '100 Feet Road, Indiranagar', 200, 'active', '05:30:00', '22:00:00'),
    (v_koramangala_id, 'WTF Gyms — Koramangala', 'Bengaluru', '80 Feet Road, Koramangala', 180, 'active', '06:00:00', '22:00:00'),
    (v_banjara_id, 'WTF Gyms — Banjara Hills', 'Hyderabad', 'Road No. 12, Banjara Hills', 160, 'active', '06:00:00', '22:00:00'),
    (v_noida_id, 'WTF Gyms — Sector 18 Noida', 'Noida', 'Sector 18 Market', 140, 'active', '06:00:00', '21:30:00'),
    (v_saltlake_id, 'WTF Gyms — Salt Lake', 'Kolkata', 'Block CF, Sector 1, Salt Lake', 120, 'active', '06:00:00', '21:00:00'),
    (v_velachery_id, 'WTF Gyms — Velachery', 'Chennai', '100 Feet Bypass Road, Velachery', 110, 'active', '06:00:00', '21:00:00');
    RAISE NOTICE 'Seeding gyms... done';

    ---------------------------------------------------------------------------
    -- 2. SEED MEMBERS (EXACTLY 5,000 MEMBERS DISTRIBUTED PER TABLE)
    ---------------------------------------------------------------------------
    RAISE NOTICE 'Seeding 5000 members...';
    
    -- Temp table for target gym member distribution
    CREATE TEMP TABLE gym_dist (
        gym_id UUID,
        total_cnt INT,
        m_pct NUMERIC,
        q_pct NUMERIC,
        a_pct NUMERIC,
        act_pct NUMERIC
    ) ON COMMIT DROP;

    INSERT INTO gym_dist VALUES
    (v_lajpat_id, 650, 0.50, 0.30, 0.20, 0.88),
    (v_cp_id, 550, 0.40, 0.40, 0.20, 0.85),
    (v_bandra_id, 750, 0.40, 0.40, 0.20, 0.90),
    (v_powai_id, 600, 0.40, 0.40, 0.20, 0.87),
    (v_indiranagar_id, 550, 0.40, 0.40, 0.20, 0.89),
    (v_koramangala_id, 500, 0.40, 0.40, 0.20, 0.86),
    (v_banjara_id, 450, 0.50, 0.30, 0.20, 0.84),
    (v_noida_id, 400, 0.60, 0.25, 0.15, 0.82),
    (v_saltlake_id, 300, 0.60, 0.30, 0.10, 0.80),
    (v_velachery_id, 250, 0.60, 0.30, 0.10, 0.78);

    INSERT INTO members (id, gym_id, name, email, phone, plan_type, member_type, status, joined_at, plan_expires_at, last_checkin_at)
    SELECT 
        gen_random_uuid() AS id,
        gd.gym_id,
        fname || ' ' || lname AS name,
        LOWER(fname || '.' || lname || gs.seq || '@gmail.com') AS email,
        (ARRAY['9','8','7'])[floor(random()*3+1)::int] || LPAD((floor(random()*90000000)+10000000)::text, 9, '0') AS phone,
        CASE 
            WHEN gs.seq <= ROUND(gd.total_cnt * gd.m_pct) THEN 'monthly'
            WHEN gs.seq <= ROUND(gd.total_cnt * (gd.m_pct + gd.q_pct)) THEN 'quarterly'
            ELSE 'annual'
        END AS plan_type,
        CASE WHEN random() < 0.80 THEN 'new' ELSE 'renewal' END AS member_type,
        CASE 
            WHEN gs.seq <= ROUND(gd.total_cnt * gd.act_pct) THEN 'active'
            WHEN (gs.seq % 3) = 0 THEN 'frozen'
            ELSE 'inactive'
        END AS status,
        j_at AS joined_at,
        j_at + CASE 
            WHEN gs.seq <= ROUND(gd.total_cnt * gd.m_pct) THEN INTERVAL '30 days'
            WHEN gs.seq <= ROUND(gd.total_cnt * (gd.m_pct + gd.q_pct)) THEN INTERVAL '90 days'
            ELSE INTERVAL '365 days'
        END AS plan_expires_at,
        NULL AS last_checkin_at -- updated after checkins insertion
    FROM gym_dist gd
    CROSS JOIN LATERAL generate_series(1, gd.total_cnt) AS gs(seq)
    CROSS JOIN LATERAL (
        SELECT 
            v_first_names[(gs.seq % array_length(v_first_names, 1)) + 1] AS fname,
            v_last_names[((gs.seq / 7) % array_length(v_last_names, 1)) + 1] AS lname,
            CASE 
                WHEN gs.seq <= ROUND(gd.total_cnt * gd.act_pct) THEN v_now - (random() * 89) * INTERVAL '1 day'
                ELSE v_now - (91 + random() * 88) * INTERVAL '1 day'
            END AS j_at
    ) sub;

    RAISE NOTICE 'Seeding 5000 members... done';

    ---------------------------------------------------------------------------
    -- 3. CHECK-IN HISTORY (~270,000 ROWS ACROSS 90 DAYS + CHURN RISK SEGMENTS)
    ---------------------------------------------------------------------------
    RAISE NOTICE 'Seeding ~270000 checkins...';

    -- Temp mapping for active members into churn buckets
    -- High risk: 150 active members
    -- Critical risk: 80 active members
    -- Healthy active members: remainder
    CREATE TEMP TABLE active_member_buckets AS
    WITH act_m AS (
        SELECT id, gym_id, ROW_NUMBER() OVER (ORDER BY id) AS rn
        FROM members
        WHERE status = 'active'
    )
    SELECT id, gym_id,
        CASE 
            WHEN rn <= 150 THEN 'high_risk'
            WHEN rn <= 230 THEN 'critical_risk'
            ELSE 'healthy'
        END AS bucket
    FROM act_m;

    -- A) Insert Churn Risk Member Checkins (High Risk 45-60d ago, Critical >60d ago)
    -- High risk: 150 members -> 1 checkin between 45 and 60 days ago
    INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
    SELECT 
        id,
        gym_id,
        v_now - (45 + random() * 14) * INTERVAL '1 day' AS c_in,
        v_now - (45 + random() * 14) * INTERVAL '1 day' + (45 + floor(random() * 45)) * INTERVAL '1 minute' AS c_out
    FROM active_member_buckets
    WHERE bucket = 'high_risk';

    -- Critical risk: 80 members -> 1 checkin between 61 and 85 days ago
    INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
    SELECT 
        id,
        gym_id,
        v_now - (61 + random() * 24) * INTERVAL '1 day' AS c_in,
        v_now - (61 + random() * 24) * INTERVAL '1 day' + (45 + floor(random() * 45)) * INTERVAL '1 minute' AS c_out
    FROM active_member_buckets
    WHERE bucket = 'critical_risk';

    -- Inactive/Frozen members -> 1 historical checkin 90-180 days ago
    INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
    SELECT 
        id,
        gym_id,
        joined_at + INTERVAL '5 days' AS c_in,
        joined_at + INTERVAL '5 days' + (45 + floor(random() * 45)) * INTERVAL '1 minute' AS c_out
    FROM members
    WHERE status IN ('inactive', 'frozen');

    -- B) Bulk Historical Checkins for Healthy Active Members over 90 days
    -- Target ~265,000 historical checkin rows
    -- Generated using 90 days series crossed with healthy members sampling
    WITH days AS (
        SELECT (v_now::date - (n || ' days')::interval)::date AS d_date,
               EXTRACT(DOW FROM (v_now::date - (n || ' days')::interval))::int AS dow
        FROM generate_series(0, 89) AS n
    ),
    dow_weights AS (
        SELECT d_date,
               CASE dow
                   WHEN 1 THEN 1.00 -- Mon
                   WHEN 2 THEN 0.95 -- Tue
                   WHEN 3 THEN 0.90 -- Wed
                   WHEN 4 THEN 0.95 -- Thu
                   WHEN 5 THEN 0.85 -- Fri
                   WHEN 6 THEN 0.70 -- Sat
                   ELSE 0.45        -- Sun
               END AS dow_w
        FROM days
    ),
    -- Expand checkin slots per day per gym
    checkin_slots AS (
        SELECT 
            dw.d_date,
            g.id AS gym_id,
            g.opens_at,
            g.closes_at,
            gs.i AS slot_idx
        FROM dow_weights dw
        CROSS JOIN gyms g
        -- Approx 300 checkins per gym per day weighted by capacity and day of week
        CROSS JOIN LATERAL generate_series(1, ROUND(300 * dw.dow_w * (g.capacity / 200.0))::int) AS gs(i)
    )
    INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
    SELECT 
        amb.id AS member_id,
        cs.gym_id,
        c_in,
        c_in + (45 + floor(random() * 45)) * INTERVAL '1 minute' AS checked_out
    FROM checkin_slots cs
    -- Join random healthy active member for that gym
    CROSS JOIN LATERAL (
        SELECT id FROM active_member_buckets 
        WHERE gym_id = cs.gym_id AND bucket = 'healthy' 
        ORDER BY random() LIMIT 1
    ) amb
    CROSS JOIN LATERAL (
        SELECT cs.d_date + (
            CASE (floor(random() * 10))::int
                WHEN 0 THEN '06:00:00'::time + (random() * 1.5) * INTERVAL '1 hour'
                WHEN 1 THEN '07:00:00'::time + (random() * 3) * INTERVAL '1 hour'
                WHEN 2 THEN '07:00:00'::time + (random() * 3) * INTERVAL '1 hour'
                WHEN 3 THEN '07:00:00'::time + (random() * 3) * INTERVAL '1 hour'
                WHEN 4 THEN '10:00:00'::time + (random() * 2) * INTERVAL '1 hour'
                WHEN 5 THEN '12:00:00'::time + (random() * 2) * INTERVAL '1 hour'
                WHEN 6 THEN '14:00:00'::time + (random() * 3) * INTERVAL '1 hour'
                WHEN 7 THEN '17:00:00'::time + (random() * 4) * INTERVAL '1 hour'
                WHEN 8 THEN '17:00:00'::time + (random() * 4) * INTERVAL '1 hour'
                ELSE '21:00:00'::time + (random() * 1.5) * INTERVAL '1 hour'
            END
        ) AS c_in
    ) time_sub
    WHERE time_sub.c_in::time >= cs.opens_at 
      AND time_sub.c_in::time <= cs.closes_at
      AND time_sub.c_in < v_now - INTERVAL '2 hours 15 minutes';

    ---------------------------------------------------------------------------
    -- 4.4 PRE-POPULATED OPEN CHECK-INS (CURRENTLY IN GYM)
    ---------------------------------------------------------------------------
    -- Powai (capacity 250): 30 open checkins
    INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
    SELECT amb.id, v_powai_id, v_now - (random() * 85) * INTERVAL '1 minute', NULL
    FROM active_member_buckets amb WHERE amb.gym_id = v_powai_id AND amb.bucket = 'healthy' ORDER BY random() LIMIT 30;

    -- Medium gyms (20 open checkins each): Lajpat Nagar, CP, Indiranagar, Koramangala, Banjara Hills
    INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
    SELECT amb.id, g_id, v_now - (random() * 85) * INTERVAL '1 minute', NULL
    FROM unnest(ARRAY[v_lajpat_id, v_cp_id, v_indiranagar_id, v_koramangala_id, v_banjara_id]) AS g_id
    CROSS JOIN LATERAL (
        SELECT id FROM active_member_buckets WHERE gym_id = g_id AND bucket = 'healthy' ORDER BY random() LIMIT 20
    ) amb;

    -- Small gyms (10 open checkins each): Sector 18 Noida, Salt Lake
    INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
    SELECT amb.id, g_id, v_now - (random() * 85) * INTERVAL '1 minute', NULL
    FROM unnest(ARRAY[v_noida_id, v_saltlake_id]) AS g_id
    CROSS JOIN LATERAL (
        SELECT id FROM active_member_buckets WHERE gym_id = g_id AND bucket = 'healthy' ORDER BY random() LIMIT 10
    ) amb;

    ---------------------------------------------------------------------------
    -- 6. THREE MANDATORY PRE-BUILT ANOMALY TEST SCENARIOS
    ---------------------------------------------------------------------------
    -- SCENARIO A — Zero Check-ins (Velachery):
    -- 1. Ensure ZERO open check-ins at Velachery
    DELETE FROM checkins WHERE gym_id = v_velachery_id AND checked_out IS NULL;
    -- 2. Make Velachery's single most-recent checkin 2h 15m ago (closed)
    INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
    SELECT amb.id, v_velachery_id, v_now - INTERVAL '2 hours 15 minutes', v_now - INTERVAL '1 hour 30 minutes'
    FROM active_member_buckets amb WHERE amb.gym_id = v_velachery_id LIMIT 1;

    -- SCENARIO B — Capacity Breach (Bandra West):
    -- Seed 285 open check-ins (checked_out IS NULL) at Bandra West (Capacity 300 -> 95% occupancy!)
    DELETE FROM checkins WHERE gym_id = v_bandra_id AND checked_out IS NULL;
    INSERT INTO checkins (member_id, gym_id, checked_in, checked_out)
    SELECT amb.id, v_bandra_id, v_now - (random() * 85) * INTERVAL '1 minute', NULL
    FROM active_member_buckets amb WHERE amb.gym_id = v_bandra_id AND amb.bucket = 'healthy' ORDER BY random() LIMIT 285;

    -- SCENARIO C — Revenue Drop (Salt Lake):
    -- Handled during payments seeding below.

    RAISE NOTICE 'Seeding ~270000 checkins... done';

    ---------------------------------------------------------------------------
    -- UPDATE MEMBERS last_checkin_at SUBQUERY
    ---------------------------------------------------------------------------
    RAISE NOTICE 'Updating last_checkin_at...';
    UPDATE members m
    SET last_checkin_at = (
        SELECT MAX(c.checked_in)
        FROM checkins c
        WHERE c.member_id = m.id
    )
    WHERE EXISTS (SELECT 1 FROM checkins c WHERE c.member_id = m.id);
    RAISE NOTICE 'Updating last_checkin_at... done';

    ---------------------------------------------------------------------------
    -- 5. SEED PAYMENTS
    ---------------------------------------------------------------------------
    RAISE NOTICE 'Seeding payments...';
    
    -- First Payment for all 5,000 members
    INSERT INTO payments (id, member_id, gym_id, amount, plan_type, payment_type, paid_at, notes)
    SELECT 
        gen_random_uuid(),
        m.id,
        m.gym_id,
        CASE m.plan_type
            WHEN 'monthly' THEN 1499.00
            WHEN 'quarterly' THEN 3999.00
            WHEN 'annual' THEN 11999.00
        END AS amount,
        m.plan_type,
        'new' AS payment_type,
        m.joined_at + (random() * 10 - 5) * INTERVAL '1 minute' AS paid_at,
        'Initial plan subscription' AS notes
    FROM members m;

    -- Second Payment for 'renewal' member_type
    INSERT INTO payments (id, member_id, gym_id, amount, plan_type, payment_type, paid_at, notes)
    SELECT 
        gen_random_uuid(),
        m.id,
        m.gym_id,
        CASE m.plan_type
            WHEN 'monthly' THEN 1499.00
            WHEN 'quarterly' THEN 3999.00
            WHEN 'annual' THEN 11999.00
        END AS amount,
        m.plan_type,
        'renewal' AS payment_type,
        m.joined_at + CASE m.plan_type
            WHEN 'monthly' THEN INTERVAL '30 days'
            WHEN 'quarterly' THEN INTERVAL '90 days'
            WHEN 'annual' THEN INTERVAL '365 days'
        END AS paid_at,
        'Plan renewal subscription' AS notes
    FROM members m
    WHERE m.member_type = 'renewal'
      AND (m.joined_at + CASE m.plan_type
            WHEN 'monthly' THEN INTERVAL '30 days'
            WHEN 'quarterly' THEN INTERVAL '90 days'
            WHEN 'annual' THEN INTERVAL '365 days'
        END) <= v_now;

    -- SCENARIO C — Revenue Drop (Salt Lake):
    -- 1. Seed 4 quarterly payments totaling ₹15,996 exactly 7 days ago at Salt Lake
    INSERT INTO payments (id, member_id, gym_id, amount, plan_type, payment_type, paid_at, notes)
    SELECT 
        gen_random_uuid(),
        m.id,
        v_saltlake_id,
        3999.00,
        'quarterly',
        'renewal',
        v_now - INTERVAL '7 days' + (gs.i * 10) * INTERVAL '1 minute',
        'Last week peak revenue'
    FROM members m
    CROSS JOIN generate_series(1, 4) AS gs(i)
    WHERE m.gym_id = v_saltlake_id
    LIMIT 4;

    -- 2. Seed 1 monthly payment totaling ₹1,499 today at Salt Lake (Revenue drop = 1499 vs 15996 -> 90.6% drop!)
    INSERT INTO payments (id, member_id, gym_id, amount, plan_type, payment_type, paid_at, notes)
    SELECT 
        gen_random_uuid(),
        m.id,
        v_saltlake_id,
        1499.00,
        'monthly',
        'renewal',
        v_now - INTERVAL '2 hours',
        'Today low revenue'
    FROM members m
    WHERE m.gym_id = v_saltlake_id
    LIMIT 1;

    RAISE NOTICE 'Seeding payments... done';

    ---------------------------------------------------------------------------
    -- REFRESH MATERIALIZED VIEW
    ---------------------------------------------------------------------------
    RAISE NOTICE 'Refreshing gym_hourly_stats materialized view...';
    REFRESH MATERIALIZED VIEW gym_hourly_stats;
    RAISE NOTICE 'Refreshing gym_hourly_stats materialized view... done';

END $$;
