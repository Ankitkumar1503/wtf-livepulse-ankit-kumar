import React, { useState } from 'react';
import { HeatmapChart } from '../components/HeatmapChart';
import { SkeletonLoader } from '../components/SkeletonLoader';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList
} from 'recharts';
import { AlertCircle } from 'lucide-react';

const DONUT_COLORS = ['#3B82F6', '#10B981', '#F59E0B'];

export function Analytics({ gyms, selectedGymId, setSelectedGymId, analytics, crossGym, fetchAnalytics, isLoading }) {
  const [dateRange, setDateRange] = useState('7d');

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    if (selectedGymId) {
      fetchAnalytics(selectedGymId, range);
    }
  };

  if (isLoading || !analytics) {
    return (
      <div style={{ display: 'grid', gap: '1.25rem' }}>
        <SkeletonLoader height="280px" />
        <SkeletonLoader height="380px" />
      </div>
    );
  }

  const selectedGym = gyms.find((g) => g.id === selectedGymId) || {};
  const churnRisk = analytics.churn_risk || { high_risk: [], critical_risk: [] };
  const memberTypeRatio = analytics.member_type_ratio || [];
  const revByPlan = analytics.revenue_by_plan || [];

  const totalMembers = memberTypeRatio.reduce((acc, r) => acc + Number(r.count), 0);

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {/* Header controls */}
      <div className="selector-row">
        <div>
          <h2 className="section-header">Analytics & Performance</h2>
          <p className="section-subheader">
            Occupancy heatmaps, revenue breakdowns, and member churn risk for {selectedGym.name || 'Selected Gym'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="nav-links">
            {['7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                className={`nav-button ${dateRange === range ? 'active' : ''}`}
                onClick={() => handleDateRangeChange(range)}
                style={{ padding: '0.35rem 0.75rem' }}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>

          <select
            className="select-input"
            value={selectedGymId}
            onChange={(e) => setSelectedGymId(e.target.value)}
          >
            {gyms.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. 7-Day Peak Hour Heatmap */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '2px', color: '#FFF' }}>
          7-Day Peak-Hour Occupancy Heatmap
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
          Hourly check-in frequency from materialized view <code style={{ color: 'var(--accent-color)' }}>gym_hourly_stats</code>
        </p>
        <HeatmapChart heatmapData={analytics.heatmap || []} />
      </div>

      {/* Grid Row: Revenue by Plan + New vs Renewal Donut */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Revenue by Plan Type */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#FFF' }}>
            Revenue by Plan Type ({dateRange.toUpperCase()})
          </h3>
          <div style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revByPlan} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="plan_type" stroke="#94A3B8" tickLine={false} style={{ fontSize: '0.8rem' }} />
                <YAxis stroke="#94A3B8" tickLine={false} style={{ fontSize: '0.8rem' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#F8FAFC', borderRadius: '6px' }}
                  formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart with Center Label */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#FFF' }}>
            Member Breakdown (New vs Renewal)
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', height: '240px' }}>
            <div style={{ flex: 1, height: '100%', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={memberTypeRatio}
                    dataKey="count"
                    nameKey="member_type"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {memberTypeRatio.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#F8FAFC', borderRadius: '6px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{totalMembers}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Members</div>
              </div>
            </div>

            {/* Custom Legend */}
            <div style={{ width: '120px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {memberTypeRatio.map((item, idx) => {
                const pct = totalMembers > 0 ? Math.round((Number(item.count) / totalMembers) * 100) : 0;
                return (
                  <div key={item.member_type} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}></span>
                      <span style={{ textTransform: 'capitalize' }}>{item.member_type}</span>
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, paddingLeft: '14px' }}>
                      {item.count} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Grid Row: Cross-Gym Revenue Comparison + Churn Risk Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.25rem' }}>
        {/* Cross Gym Bar Chart */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#FFF' }}>
            Cross-Gym Revenue Ranking (Last 30 Days)
          </h3>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={crossGym} layout="vertical" margin={{ top: 5, right: 65, left: 10, bottom: 5 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" stroke="#94A3B8" tickLine={false} style={{ fontSize: '0.75rem' }} />
                <YAxis dataKey="name" type="category" stroke="#94A3B8" width={140} tickLine={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#F8FAFC', borderRadius: '6px' }}
                  formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, '30-Day Revenue']}
                />
                <Bar dataKey="total_revenue" fill="#10B981" radius={[0, 4, 4, 0]}>
                  <LabelList
                    dataKey="total_revenue"
                    position="right"
                    formatter={(val) => `₹${(Number(val) / 1000).toFixed(1)}k`}
                    fill="#F8FAFC"
                    fontSize={11}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Churn Risk Panel */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem' }}>
            <AlertCircle color="var(--status-red)" size={18} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#FFF' }}>Churn Risk Alert Panel</h3>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ flex: 1, padding: '0.75rem', backgroundColor: 'var(--status-amber-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--status-amber)', fontWeight: 600 }}>HIGH RISK (45-60d)</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {churnRisk.high_risk.length}
              </div>
            </div>

            <div style={{ flex: 1, padding: '0.75rem', backgroundColor: 'var(--status-red-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--status-red)', fontWeight: 600 }}>CRITICAL RISK (60+d)</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {churnRisk.critical_risk.length}
              </div>
            </div>
          </div>

          <div style={{ maxHeight: '170px', overflowY: 'auto' }}>
            <table className="data-table" style={{ marginTop: 0 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Member</th>
                  <th style={{ textAlign: 'right' }}>Inactive</th>
                  <th style={{ textAlign: 'right' }}>Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {churnRisk.critical_risk.slice(0, 3).map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 500 }}>{m.name}</td>
                    <td style={{ textAlign: 'right' }}>{m.days_inactive}d</td>
                    <td style={{ textAlign: 'right' }}><span className="feed-type anomaly">CRITICAL</span></td>
                  </tr>
                ))}
                {churnRisk.high_risk.slice(0, 3).map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 500 }}>{m.name}</td>
                    <td style={{ textAlign: 'right' }}>{m.days_inactive}d</td>
                    <td style={{ textAlign: 'right' }}><span className="feed-type checkout">HIGH</span></td>
                  </tr>
                ))}
                {churnRisk.critical_risk.length === 0 && churnRisk.high_risk.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                      No members currently at churn risk
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
