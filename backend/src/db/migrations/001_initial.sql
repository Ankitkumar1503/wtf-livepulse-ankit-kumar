-- Enable pgcrypto for gen_random_uuid() if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Gyms Table
CREATE TABLE IF NOT EXISTS gyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    capacity INT NOT NULL CHECK (capacity > 0),
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive', 'maintenance')),
    opens_at TIME NOT NULL DEFAULT '06:00:00',
    closes_at TIME NOT NULL DEFAULT '22:00:00',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Members Table
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('monthly', 'quarterly', 'annual')),
    member_type VARCHAR(20) NOT NULL CHECK (member_type IN ('new', 'renewal')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'inactive', 'frozen')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    plan_expires_at TIMESTAMPTZ,
    last_checkin_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Checkins Table
CREATE TABLE IF NOT EXISTS checkins (
    id BIGSERIAL PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    checked_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checked_out TIMESTAMPTZ,
    duration_min INT GENERATED ALWAYS AS (
        CASE 
            WHEN checked_out IS NOT NULL THEN GREATEST(1, ROUND(EXTRACT(EPOCH FROM (checked_out - checked_in)) / 60)::INT)
            ELSE NULL 
        END
    ) STORED
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    plan_type VARCHAR(20) NOT NULL,
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('new', 'renewal')),
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

-- Anomalies Table
CREATE TABLE IF NOT EXISTS anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('zero_checkins', 'capacity_breach', 'revenue_drop')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('warning', 'critical')),
    message TEXT NOT NULL,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);
