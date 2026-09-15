import React from 'react';
import { CountUpNumber } from '../components/CountUpNumber';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { Users, IndianRupee, Building, Clock, MapPin, Activity } from 'lucide-react';

export function Dashboard({ gyms, selectedGymId, setSelectedGymId, liveSnapshot, activityFeed, isLoading, error }) {
  if (isLoading) {
    return (
      <div style={{ display: 'grid', gap: '1.25rem' }}>
        <SkeletonLoader height="90px" />
        <div className="dashboard-grid">
          <SkeletonLoader height="380px" />
          <SkeletonLoader height="380px" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ borderLeft: '4px solid var(--status-red)', color: 'var(--status-red)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Error Loading Dashboard</h3>
        <p style={{ marginTop: '0.25rem', color: 'var(--text-primary)', fontSize: '0.85rem' }}>{error}</p>
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
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {/* 4 Summary KPI Cards */}
      <div className="summary-bar">
        <div className="card">
          <div className="kpi-title">
            <Users size={15} color="var(--accent-color)" /> Total Live Checked-In
          </div>
          <div className="kpi-number">
            <CountUpNumber value={totalOccupancy} />
          </div>
          <div className="kpi-subtext">Across all 10 locations</div>
        </div>

        <div className="card">
          <div className="kpi-title">
            <IndianRupee size={15} color="var(--status-green)" /> Today's Revenue
          </div>
          <div className="kpi-number" style={{ color: 'var(--status-green)' }}>
            <CountUpNumber value={totalRevenue} prefix="₹" decimals={0} />
          </div>
          <div className="kpi-subtext">Cumulative payments today</div>
        </div>

        <div className="card">
          <div className="kpi-title">
            <Building size={15} color="var(--accent-color)" /> Active Gym Locations
          </div>
          <div className="kpi-number">{gyms.length}</div>
          <div className="kpi-subtext">All operational</div>
        </div>

        <div className="card">
          <div className="kpi-title">
            <Activity size={15} color="var(--status-green)" /> System Status
          </div>
          <div className="kpi-number" style={{ fontSize: '1.35rem', color: 'var(--status-green)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-green)' }}></span>
            Operational
          </div>
          <div className="kpi-subtext">Real-time event stream</div>
        </div>
      </div>

      {/* Gym Selector Header Row */}
      <div className="selector-row">
        <div>
          <h2 className="section-header">Gym Overview</h2>
          <p className="section-subheader">
            Select location to inspect live capacity, revenue, and activity feed
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
              {g.name} ({g.city}) — {g.current_occupancy}/{g.capacity}
            </option>
          ))}
        </select>
      </div>

      {/* Main Operational Panel & Activity Stream */}
      <div className="dashboard-grid">
        {/* Left Section: Selected Gym Operational Panel */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFF' }}>{selectedGym.name}</h3>
              <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '3px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={13} /> {selectedGym.address}, {selectedGym.city}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={13} /> {selectedGym.opens_at} - {selectedGym.closes_at}</span>
              </div>
            </div>

            <span className="feed-type checkin">
              {selectedGym.status ? selectedGym.status.toUpperCase() : 'ACTIVE'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', margin: '1rem 0' }}>
            <div style={{ padding: '1rem', backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--card-border)' }}>
              <div className="kpi-title">Occupancy</div>
              <div className={`kpi-number ${getOccupancyColorClass(currentPct)}`}>
                <CountUpNumber value={currentOcc} />
                <span style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}> / {selectedGym.capacity}</span>
              </div>
              <div style={{ marginTop: '0.5rem', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(currentPct, 100)}%`,
                    backgroundColor: currentPct > 90 ? 'var(--status-red)' : currentPct >= 60 ? 'var(--status-amber)' : 'var(--status-green)',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginTop: '4px', color: 'var(--text-secondary)' }}>
                <span>Usage</span>
                <span className={getOccupancyColorClass(currentPct)} style={{ fontWeight: 600 }}>{currentPct}% capacity</span>
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--card-border)' }}>
              <div className="kpi-title">Today's Revenue</div>
              <div className="kpi-number" style={{ color: 'var(--status-green)' }}>
                <CountUpNumber value={currentRev} prefix="₹" decimals={0} />
              </div>
              <div className="kpi-subtext" style={{ marginTop: '1rem' }}>
                Live payment updates
              </div>
            </div>
          </div>

          {/* Recent Check-Ins Snapshot Table */}
          <h4 style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
            Recent Check-Ins
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
                    <td style={{ fontWeight: 500 }}>{item.member_name}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {new Date(item.checked_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`feed-type ${item.checked_out ? 'checkout' : 'checkin'}`}>
                        {item.checked_out ? 'Checked Out' : 'Active'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                    No recent check-ins recorded
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right Section: Real-Time Activity Event Stream */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#FFF' }}>Real-Time Activity Feed</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Live Stream ({activityFeed.length}/20)
            </span>
          </div>

          <div className="activity-feed" id="activity-feed-container">
            {activityFeed.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2.5rem 1rem', fontSize: '0.825rem' }}>
                Waiting for live events... (Start simulator to generate real-time events)
              </div>
            ) : (
              activityFeed.map((evt, idx) => {
                const timeStr = new Date(evt.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                let titleText = evt.member_name || evt.gym_name || 'System Event';
                let detailsText = '';

                if (evt.type === 'PAYMENT_EVENT') {
                  detailsText = `Payment (₹${Number(evt.amount).toLocaleString('en-IN')})`;
                } else if (evt.type === 'ANOMALY_DETECTED') {
                  detailsText = evt.message;
                } else if (evt.type === 'CONNECTED') {
                  detailsText = evt.message || 'Connected';
                } else if (evt.current_occupancy !== undefined && evt.capacity_pct !== undefined) {
                  detailsText = `Occupancy: ${evt.current_occupancy} (${evt.capacity_pct}%)`;
                } else {
                  detailsText = evt.message || 'Event update';
                }

                return (
                  <div key={idx} className="feed-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.775rem', width: '60px' }}>{timeStr}</span>
                      <div>
                        <div style={{ fontWeight: 600 }}>{titleText}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{detailsText}</div>
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
