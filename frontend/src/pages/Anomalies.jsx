import React, { useState } from 'react';
import { SkeletonLoader } from '../components/SkeletonLoader';
import { CheckCircle, AlertOctagon, XCircle } from 'lucide-react';

export function Anomalies({ anomalies, isLoading, error, dismissAnomaly }) {
  const [actionError, setActionError] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('all');

  const handleDismiss = async (id, severity) => {
    setActionError(null);
    if (severity === 'critical') {
      setActionError('403 Forbidden: Critical severity anomalies cannot be dismissed by operations policy.');
      return;
    }

    const res = await dismissAnomaly(id);
    if (!res.success) {
      setActionError(`Dismiss failed: ${res.error}`);
    }
  };

  if (isLoading) {
    return <SkeletonLoader height="400px" />;
  }

  const filtered = anomalies.filter((a) => {
    if (filterSeverity === 'all') return true;
    return a.severity === filterSeverity;
  });

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div className="selector-row">
        <div>
          <h2 className="section-header">Operational Anomaly Detection Log</h2>
          <p className="section-subheader">
            Real-time automated rules evaluating zero check-ins, capacity breaches (&gt;90%), and revenue drop (&gt;=30%)
          </p>
        </div>

        <select
          className="select-input"
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
        >
          <option value="all">All Severities</option>
          <option value="warning">Warning Only</option>
          <option value="critical">Critical Only</option>
        </select>
      </div>

      {/* Action error alert banner */}
      {(error || actionError) && (
        <div className="card" style={{ borderLeft: '4px solid var(--status-red)', color: 'var(--status-red)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <XCircle size={20} />
          <div>{error || actionError}</div>
        </div>
      )}

      <div className="card">
        <table className="data-table" id="anomalies-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Gym Location</th>
              <th style={{ textAlign: 'left' }}>Anomaly Type</th>
              <th style={{ textAlign: 'left' }}>Severity</th>
              <th style={{ textAlign: 'left' }}>Message Description</th>
              <th style={{ textAlign: 'right' }}>Time Detected</th>
              <th style={{ textAlign: 'right' }}>Status</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                  <CheckCircle size={32} color="var(--status-green)" style={{ marginBottom: '0.5rem' }} />
                  <div>No active anomalies detected across any gym locations.</div>
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>{item.gym_name}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{item.type}</td>
                  <td>
                    <span className={`feed-type ${item.severity === 'critical' ? 'anomaly' : 'checkout'}`}>
                      {item.severity.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-primary)' }}>{item.message}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {new Date(item.detected_at).toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {item.resolved ? (
                      <span className="feed-type checkin">RESOLVED</span>
                    ) : (
                      <span className="feed-type checkout">ACTIVE</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {item.severity === 'warning' ? (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                        onClick={() => handleDismiss(item.id, item.severity)}
                        id={`dismiss-btn-${item.id}`}
                      >
                        Dismiss
                      </button>
                    ) : (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', opacity: 0.4, cursor: 'not-allowed' }}
                        disabled
                        title="Critical anomalies cannot be dismissed by operations policy (403)"
                      >
                        Locked (403)
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
