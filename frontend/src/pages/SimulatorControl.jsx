import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Zap, Sliders, CheckCircle } from 'lucide-react';

export function SimulatorControl() {
  const [status, setStatus] = useState('stopped'); // 'running' | 'stopped'
  const [speed, setSpeed] = useState(1);
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetch('/api/simulator/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.status) setStatus(data.status);
        if (data.speed) setSpeed(data.speed);
      })
      .catch(() => {});
  }, []);

  const handleStart = async (selectedSpeed = speed) => {
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/simulator/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speed: selectedSpeed })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('running');
        setSpeed(selectedSpeed);
        setMessage(`Simulator engine started at ${selectedSpeed}x speed multiplier`);
      } else {
        setMessage(`Start error: ${data.error}`);
      }
    } catch (err) {
      setMessage(`Network error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/simulator/stop', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setStatus('stopped');
        setMessage('Simulator engine paused');
      }
    } catch (err) {
      setMessage(`Pause error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/simulator/reset', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setStatus('stopped');
        setMessage('Simulator reset to baseline. Open checkins cleared.');
      }
    } catch (err) {
      setMessage(`Reset error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', display: 'grid', gap: '1.5rem' }}>
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--accent-soft)', border: '1px solid rgba(0, 217, 255, 0.3)', borderRadius: 'var(--radius-md)' }}>
            <Sliders size={26} color="var(--accent-color)" />
          </div>
          <div>
            <h2 className="section-header">Real-Time Simulator Engine</h2>
            <p className="section-subheader">
              Generates realistic check-in, check-out, and payment transactions directly into PostgreSQL
            </p>
          </div>
        </div>

        {message && (
          <div style={{ padding: '0.85rem 1.1rem', backgroundColor: 'var(--accent-soft)', border: '1px solid var(--accent-color)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', color: 'var(--accent-color)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} /> {message}
          </div>
        )}

        <div style={{ padding: '1.5rem', backgroundColor: 'rgba(9, 9, 20, 0.6)', borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="kpi-title">Current Engine Status</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: status === 'running' ? 'var(--status-green)' : 'var(--status-amber)' }}>
              {status === 'running' ? `RUNNING (${speed}X SPEED)` : 'PAUSED'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            {status === 'running' ? (
              <button className="btn btn-danger-outline" onClick={handleStop} disabled={isLoading} id="btn-pause-simulator">
                <Pause size={16} /> Pause Engine
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => handleStart(speed)} disabled={isLoading} id="btn-start-simulator">
                <Play size={16} /> Start Engine
              </button>
            )}
          </div>
        </div>

        {/* Speed Selector */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
            EVENT GENERATION SPEED MULTIPLIER
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {[1, 5, 10].map((s) => (
              <button
                key={s}
                className={`btn ${speed === s ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  setSpeed(s);
                  if (status === 'running') {
                    handleStart(s);
                  }
                }}
                id={`btn-speed-${s}x`}
              >
                <Zap size={16} /> {s}x Speed {s === 1 ? '(2s)' : s === 5 ? '(400ms)' : '(200ms)'}
              </button>
            ))}
          </div>
        </div>

        {/* Reset to Baseline Button */}
        <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Reset Baseline State</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '2px' }}>
              Clears open checkins (<code style={{ color: 'var(--accent-color)' }}>checked_out IS NULL</code>) and restores baseline open checkins
            </p>
          </div>

          <button className="btn btn-danger-outline" onClick={handleReset} disabled={isLoading} id="btn-reset-simulator">
            <RotateCcw size={16} /> Reset to Baseline
          </button>
        </div>
      </div>
    </div>
  );
}
