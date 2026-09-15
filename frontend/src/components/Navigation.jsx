import React from 'react';
import { Activity, BarChart2, AlertTriangle, Sliders, Radio } from 'lucide-react';

export function Navigation({ activeTab, setActiveTab, unreadAnomalyCount, isConnected }) {
  return (
    <header className="navbar">
      <div className="brand">
        <Activity className="brand-accent" size={26} />
        <span>WTF <span className="brand-accent">LIVEPULSE</span></span>
      </div>

      <nav className="nav-links">
        <button
          className={`nav-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
          id="nav-dashboard"
        >
          <Radio size={16} />
          Live Dashboard
        </button>

        <button
          className={`nav-button ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
          id="nav-analytics"
        >
          <BarChart2 size={16} />
          Analytics
        </button>

        <button
          className={`nav-button ${activeTab === 'anomalies' ? 'active' : ''}`}
          onClick={() => setActiveTab('anomalies')}
          id="nav-anomalies"
        >
          <AlertTriangle size={16} />
          Anomaly Log
          {unreadAnomalyCount > 0 && (
            <span className="badge" id="anomaly-badge-count">{unreadAnomalyCount}</span>
          )}
        </button>

        <button
          className={`nav-button ${activeTab === 'simulator' ? 'active' : ''}`}
          onClick={() => setActiveTab('simulator')}
          id="nav-simulator"
        >
          <Sliders size={16} />
          Simulator
        </button>
      </nav>

      <div className="status-indicator">
        <span className={`pulse-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
        <span style={{ color: isConnected ? 'var(--status-green)' : 'var(--status-red)' }}>
          {isConnected ? 'WS CONNECTED' : 'WS DISCONNECTED'}
        </span>
      </div>
    </header>
  );
}
