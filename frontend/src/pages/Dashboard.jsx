import React from 'react';
import { CountUpNumber } from '../components/CountUpNumber';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { Users, DollarSign, AlertTriangle, Building, Clock, MapPin, Activity } from 'lucide-react';

export function Dashboard({ gyms, selectedGymId, setSelectedGymId, liveSnapshot, activityFeed, isLoading, error }) {
  if (isLoading) {
    return (
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <SkeletonLoader height="100px" />
        <div className="dashboard-grid">
          <SkeletonLoader height="400px" />
          <SkeletonLoader height="400px" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ borderLeft: '4px solid var(--status-red)', color: 'var(--status-red)' }}>
        <h3>Error Loading Dashboard</h3>
        <p style={{ marginTop: '0.5rem', color: 'var(--text-primary)' }}>{error}</p>
      </div>
    );
  }

  const selectedGym = gyms.find((g) => g.id === selectedGymId) || liveSnapshot || {};
  const totalOccupancy = gyms.reduce((acc, g) => acc + (g.current_occupancy || 0), 0);
  const totalRevenue = gyms.reduce((acc, g) => acc + (g.today_revenue || 0), 0);

  const getOccupancyColorClass = (pct) => {
    if (pct < 60) return 'occ-green';
    if (pct <= 85) return 'occ-amber';
    return 'occ-red';
  };

  const currentPct = liveSnapshot ? liveSnapshot.capacity_pct : selectedGym.capacity_pct || 0;
  const currentOcc = liveSnapshot ? liveSnapshot.current_occupancy : selectedGym.current_occupancy || 0;
  const currentRev = liveSnapshot ? liveSnapshot.today_revenue : selectedGym.today_revenue || 0;

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Top 4 KPI Summary Cards */}
      <div className="summary-bar">
        <div className="card card-glow-cyan">
          <div className="kpi-title">
            <Users size={16} color="var(--accent-color)" /> Total Live Checked-In
          </div>
          <div className="kpi-number">
            <CountUpNumber value={totalOccupancy} />
          </div>
          <div className="kpi-subtext">Across all 10 gym locations</div>
        </div>

        <div className="card card-glow-green">
          <div className="kpi-title">
            <DollarSign size={16} color="var(--status-green)" /> Today Total Revenue
          </div>
          <div className="kpi-number" style={{ color: 'var(--status-green)' }}>
            <CountUpNumber value={totalRevenue} prefix="$" decimals={2} />
          </div>
          <div className="kpi-subtext">Cumulative payments today</div>
        </div>

        <div className="card card-glow-cyan">
          <div className="kpi-title">
            <Building size={16} color="var(--accent-color)" /> Active Gym Locations
          </div>
          <div className="kpi-number">{gyms.length}</div>
          <div className="kpi-subtext">All operational 06:00 - 22:00</div>
        </div>

        <div className="card card-glow-green">
          <div className="kpi-title">
            <Activity size={16} color="var(--status-green)" /> System Operations
          </div>
          <div className="kpi-number" style={{ fontSize: '1.75rem', color: 'var(--status-green)' }}>
            OPTIMAL
          </div>
          <div className="kpi-subtext">Real-time WebSocket streaming</div>
        </div>
      </div>

      {/* Gym Selector Header Row */}
      <div className="selector-row">
        <div>
          <h2 className="section-header">Live Operations Control</h2>
          <p className="section-subheader">
            Select gym location to inspect live capacity, revenue, and streaming activity
          </p>
        </div>

        <select
          className="select-input"
          value={selectedGymId}
          onChange={(e) => setSelectedGymId(e.target.value)}
          id="gym-selector-dropdown"
        >
          {gyms.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} ({g.city}) — {g.current_occupancy}/{g.capacity} checked in
            </option>
          ))}
        </select>
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Left Column: Live Gym Snapshot */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', color: '#FFF' }}>{selectedGym.name}</h3>
              <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {selectedGym.address}, {selectedGym.city}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> {selectedGym.opens_at} - {selectedGym.closes_at}</span>
              </div>
            </div>

            <span className="feed-type checkin" style={{ fontSize: '0.75rem' }}>
              {selectedGym.status ? selectedGym.status.toUpperCase() : 'ACTIVE'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', margin: '1.25rem 0' }}>
            <div style={{ padding: '1.25rem', backgroundColor: 'rgba(9, 9, 20, 0.6)', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
              <div className="kpi-title">Live Occupancy Counter</div>
              <div className={`kpi-number ${getOccupancyColorClass(currentPct)}`}>
                <CountUpNumber value={currentOcc} />
                <span style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}> / {selectedGym.capacity}</span>
              </div>
              <div style={{ marginTop: '0.75rem', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(currentPct, 100)}%`,
                    backgroundColor: currentPct > 85 ? 'var(--status-red)' : currentPct >= 60 ? 'var(--status-amber)' : 'var(--status-green)',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginTop: '6px', color: 'var(--text-secondary)' }}>
                <span>Capacity Usage</span>
                <span className={getOccupancyColorClass(currentPct)} style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{currentPct}%</span>
              </div>
            </div>

            <div style={{ padding: '1.25rem', backgroundColor: 'rgba(9, 9, 20, 0.6)', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' }}>
              <div className="kpi-title">Today Gym Revenue</div>
              <div className="kpi-number" style={{ color: 'var(--status-green)' }}>
                <CountUpNumber value={currentRev} prefix="$" decimals={2} />
              </div>
              <div className="kpi-subtext" style={{ marginTop: '1.2rem' }}>
                Updated live on payment events
              </div>
            </div>
          </div>

          {/* Recent Checkins list inside selected gym snapshot */}
          <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
            Recent Check-Ins Snapshot
          </h4>

          <table className="data-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Member Name</th>
                <th style={{ textAlign: 'right' }}>Time</th>
                <th style={{ textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {liveSnapshot && liveSnapshot.recent_checkins && liveSnapshot.recent_checkins.length > 0 ? (
                liveSnapshot.recent_checkins.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.member_name}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {new Date(item.checked_in).toLocaleTimeString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`feed-type ${item.checked_out ? 'checkout' : 'checkin'}`}>
                        {item.checked_out ? 'CHECKED OUT' : 'LIVE INSIDE'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>
                    No recent check-ins recorded
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right Column: Real-Time Activity Feed */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem' }}>Real-Time Activity Feed</h3>
            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-color)', fontWeight: 700 }}>
              LIVE ({activityFeed.length}/20)
            </span>
          </div>

          <div className="activity-feed" id="activity-feed-container">
            {activityFeed.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1rem', fontSize: '0.85rem' }}>
                Waiting for live events... (Start simulator to generate real-time events)
              </div>
            ) : (
              activityFeed.map((evt, idx) => {
                // BUG FIX GUARD: safely format event subtext
                let detailsText = '';
                if (evt.type === 'PAYMENT_EVENT') {
                  detailsText = `Paid $${evt.amount} (${evt.plan_type})`;
                } else if (evt.type === 'ANOMALY_DETECTED') {
                  detailsText = evt.message;
                } else if (evt.type === 'CONNECTED') {
                  detailsText = evt.message || 'WebSocket Connected';
                } else if (evt.current_occupancy !== undefined && evt.capacity_pct !== undefined) {
                  detailsText = `Occupancy: ${evt.current_occupancy} (${evt.capacity_pct}%)`;
                } else {
                  detailsText = evt.message || 'System update';
                }

                return (
                  <div key={idx} className="feed-item">
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {evt.member_name || evt.gym_name || 'System Event'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {detailsText}
                      </div>
                    </div>

                    <span
                      className={`feed-type ${
                        evt.type === 'CHECKIN_EVENT'
                          ? 'checkin'
                          : evt.type === 'CHECKOUT_EVENT'
                          ? 'checkout'
                          : evt.type === 'PAYMENT_EVENT'
                          ? 'payment'
                          : 'anomaly'
                      }`}
                    >
                      {evt.type ? evt.type.replace('_EVENT', '') : 'EVENT'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
