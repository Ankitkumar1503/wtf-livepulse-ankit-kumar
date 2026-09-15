CREATE INDEX idx_payments_date_covering ON payments (paid_at DESC) INCLUDE (gym_id, amount);
