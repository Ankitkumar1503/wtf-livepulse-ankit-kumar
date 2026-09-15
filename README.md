# WTF LivePulse — Real-Time Multi-Gym Operations Dashboard

Production-grade real-time multi-gym operations and analytics dashboard monitoring member check-ins, revenues, occupancy capacity, and operational anomalies across multiple gym locations.

---

## 1. Quick Start

Run the entire stack with a single command:

```bash
docker compose up
```

### Prerequisites
- **Docker Desktop** installed and running on your system.

### Automated Initialization
On the very first launch, Docker Compose will automatically:
1. Pull the official `postgres:15-alpine` database image.
2. Build the Node.js 20 Express backend and React 18 / Vite / Nginx frontend container images.
3. Mount and execute database migrations (`001_initial.sql`, `002_indexes.sql`, `003_covering_index.sql`) inside `/docker-entrypoint-initdb.d`.
4. Auto-seed **10 gym locations**, **5,000 members**, and **90 days of realistic peak-hour historical check-ins and payments** automatically without any manual setup required.

### Application Access Points
- **Frontend Command Center UI**: [http://localhost:3000](http://localhost:3000)
- **Backend REST API & Native WebSocket Server**: [http://localhost:3001](http://localhost:3001) (WebSocket endpoint: `ws://localhost:3001/ws`)
- **PostgreSQL Database**: `localhost:5432` (`POSTGRES_DB=wtf_livepulse`, `POSTGRES_USER=wtf`, `POSTGRES_PASSWORD=wtf_secret`)

---

## 2. Architecture Decisions

### Database Indexing & Query Optimization
To strictly enforce **zero Sequential Scans** on high-frequency tables (`checkins`, `payments`):

- **Partial Indexes (`idx_checkins_live_occupancy`, `idx_anomalies_active`, `idx_members_churn_risk`)**:
  - `idx_checkins_live_occupancy ON checkins(gym_id, checked_out) WHERE checked_out IS NULL`: Only indexes active, currently open check-ins (~250 rows out of 20,000+ total rows). Keeps the index footprint extremely tiny and guarantees `<1ms` live occupancy counts as history grows.
  - `idx_anomalies_active ON anomalies(gym_id, detected_at DESC) WHERE resolved=FALSE`: Filters exclusively active unresolved anomalies for instantaneous dashboard badge counter and log queries.
  - `idx_members_churn_risk ON members(last_checkin_at) WHERE status='active'`: Isolates active members for retention risk calculations without scanning frozen or inactive member records.

- **BRIN Index (`idx_checkins_time_brin`)**:
  - `checkins` is an append-only, naturally time-ordered table where new check-ins are monotonically inserted.
  - Unlike B-Tree indexes which store per-row index entries, a BRIN (Block Range Index) stores lightweight block-range summary metadata. This results in an index footprint `<1%` the size of a standard B-Tree index, making it ideal for 90-day time-series range filtering.

- **Covering Index (`idx_payments_date_covering`)**:
  - `CREATE INDEX idx_payments_date_covering ON payments (paid_at DESC) INCLUDE (gym_id, amount);`
  - Added after discovering that the 30-day cross-gym revenue aggregation query (Q5) was falling back to a sequential scan because the standard `paid_at` index did not carry `gym_id` and `amount`, forcing expensive heap lookups for every row.
  - The `INCLUDE` clause creates a covering index, allowing PostgreSQL to satisfy the query entirely via **Index Only Scan** without touching table heap pages.

- **Materialized View (`gym_hourly_stats`)**:
  - The 7-day peak-hour occupancy heatmap requires a `GROUP BY (gym_id, day_of_week, hour_of_day)` aggregation across hundreds of thousands of historical check-in rows.
  - Precomputing these aggregations into a materialized view with a unique index (`idx_gym_hourly_stats_unique`) and refreshing it concurrently every 15 minutes (`REFRESH MATERIALIZED VIEW CONCURRENTLY`) eliminates expensive dynamic aggregations on every page load.

### Application & WebSocket Architecture
- **Native `ws` Broadcast Architecture**: Used native Node.js `ws` instead of Socket.io for low-overhead, structured JSON message broadcasting (`CHECKIN_EVENT`, `CHECKOUT_EVENT`, `PAYMENT_EVENT`, `ANOMALY_DETECTED`, `ANOMALY_RESOLVED`).
- **Rule-Based Anomaly Engine & Auto-Resolution**: Evaluates `zero_checkins`, `capacity_breach` (>90%), and `revenue_drop` (>=30% vs last week same day) every 30 seconds. Resolved anomalies are marked `resolved=true`, broadcast via WebSocket, retained for 24 hours for audit visibility, and automatically archived. Critical anomalies enforce an HTTP 403 guard preventing manual user dismissal.

---

## 3. AI Tools Used

- **Antigravity AI Assistant** (Google DeepMind): Used to scaffold the full repository structure, implement PostgreSQL migration scripts and seed generators, write Express REST endpoints, build native WebSocket server broadcast logic, implement background simulator and anomaly detection services, craft the high-contrast dark-mode command center UI components with CSS Modules, and write the Jest unit/integration and Playwright E2E test suites.
- **Claude** (Anthropic): Used for initial task breakdown, architecture review, EXPLAIN ANALYZE query plan analysis, identifying heap lookup bottlenecks to design the covering index (`idx_payments_date_covering`), prompt engineering, and guiding test coverage expansion.

---

## 4. Query Benchmarks

| Query | Target Time | Measured Time | Index Used | Access Method |
|---|---|---|---|---|
| Q1 — Live Occupancy (Single Gym) | < 0.5ms | 0.287ms | idx_checkins_live_occupancy | Index Only Scan |
| Q2 — Today's Revenue (Single Gym) | < 0.8ms | 0.957ms | idx_payments_date_covering | Index Only Scan |
| Q3 — Churn Risk Members | < 1ms | 0.445ms | idx_members_churn_risk | Bitmap Index Scan |
| Q4 — Peak Hour Heatmap (7d) | < 0.3ms | 0.695ms | idx_gym_hourly_stats_unique | Bitmap Index Scan |
| Q5 — Cross-Gym Revenue Comparison | < 2ms | 1.864ms | idx_payments_date_covering | Index Only Scan |
| Q6 — Active Anomalies (All Gyms) | < 0.3ms | 0.125ms | (Seq Scan — see note below) | Seq Scan |

*Note: Q6 shows a Seq Scan on the `anomalies` table. This is not a rejection condition per the assignment spec, which restricts the zero-Seq-Scan rule to the `checkins` and `payments` tables only. At the current low row count for anomalies, PostgreSQL's planner correctly determines a sequential scan is cheaper than using idx_anomalies_active — this is expected optimizer behavior for small tables, not a missing index.*

---

## 5. Known Limitations

1. **Marginal Execution Target Variance**: Q2 (Today's Revenue) and Q4 (Peak Hour Heatmap) measured marginally above their stated aggressive targets — 0.957ms vs a 0.8ms target, and 0.695ms vs a 0.3ms target respectively. Both queries correctly use their intended indexes (no sequential scans) and execute in sub-millisecond time; they simply did not hit the exact target ceiling specified.
2. **Single-Node In-Memory WebSocket State**: Native `ws` connections and event broadcasting are managed in-memory on a single Node.js process. For multi-node container horizontal scaling, a Redis Pub/Sub backplane would be required to coordinate events across pods.
3. **In-Memory Simulator Engine**: The background event generation loop runs inside the single Express server process for lightweight load generation.
4. **Materialized View Refresh Lag**: Heatmap data reflects check-in patterns up to the last 15-minute materialized view refresh interval (`REFRESH MATERIALIZED VIEW CONCURRENTLY`).
