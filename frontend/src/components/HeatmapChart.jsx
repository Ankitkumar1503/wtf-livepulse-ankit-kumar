import React from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function HeatmapChart({ heatmapData = [] }) {
  const map = {};
  let maxCount = 1;

  heatmapData.forEach((item) => {
    const key = `${item.day_of_week}_${item.hour_of_day}`;
    const count = Number(item.checkin_count);
    map[key] = count;
    if (count > maxCount) maxCount = count;
  });

  const getCellColor = (count) => {
    if (!count || count === 0) return 'rgba(255, 255, 255, 0.03)';
    const ratio = count / maxCount;
    if (ratio < 0.20) return 'rgba(59, 130, 246, 0.20)';
    if (ratio < 0.40) return 'rgba(59, 130, 246, 0.40)';
    if (ratio < 0.60) return 'rgba(59, 130, 246, 0.65)';
    if (ratio < 0.80) return 'rgba(59, 130, 246, 0.85)';
    return 'rgba(59, 130, 246, 1.0)';
  };

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <div className="heatmap-grid" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
        <div></div>
        {Array.from({ length: 24 }).map((_, h) => (
          <div key={h} style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
            {h % 3 === 0 ? `${h}h` : ''}
          </div>
        ))}
      </div>

      {DAYS.map((dayName, dIndex) => (
        <div key={dayName} className="heatmap-grid" style={{ marginBottom: '4px' }}>
          <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.78rem' }}>{dayName}</div>
          {Array.from({ length: 24 }).map((_, hIndex) => {
            const count = map[`${dIndex}_${hIndex}`] || 0;
            return (
              <div
                key={hIndex}
                className="heatmap-cell"
                title={`${dayName} ${hIndex}:00 — ${count} check-ins`}
                style={{ backgroundColor: getCellColor(count) }}
              />
            );
          })}
        </div>
      ))}

      {/* Heatmap Intensity Gradient Legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        <span>Low</span>
        <div style={{ display: 'flex', gap: '3px' }}>
          <span style={{ width: '16px', height: '12px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.03)' }}></span>
          <span style={{ width: '16px', height: '12px', borderRadius: '2px', backgroundColor: 'rgba(59, 130, 246, 0.20)' }}></span>
          <span style={{ width: '16px', height: '12px', borderRadius: '2px', backgroundColor: 'rgba(59, 130, 246, 0.40)' }}></span>
          <span style={{ width: '16px', height: '12px', borderRadius: '2px', backgroundColor: 'rgba(59, 130, 246, 0.65)' }}></span>
          <span style={{ width: '16px', height: '12px', borderRadius: '2px', backgroundColor: 'rgba(59, 130, 246, 0.85)' }}></span>
          <span style={{ width: '16px', height: '12px', borderRadius: '2px', backgroundColor: 'rgba(59, 130, 246, 1.0)' }}></span>
        </div>
        <span>High Peak</span>
      </div>
    </div>
  );
}
