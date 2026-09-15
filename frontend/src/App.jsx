import React, { useState } from 'react';
import { Navigation } from './components/Navigation';
import { Dashboard } from './pages/Dashboard';
import { Analytics } from './pages/Analytics';
import { Anomalies } from './pages/Anomalies';
import { SimulatorControl } from './pages/SimulatorControl';
import { useWebSocket } from './hooks/useWebSocket';
import { useGymData } from './hooks/useGymData';
import { useAnomalies } from './hooks/useAnomalies';
import './styles/app.css';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'analytics' | 'anomalies' | 'simulator'
  const [lastWsEvent, setLastWsEvent] = useState(null);

  const {
    gyms,
    selectedGymId,
    setSelectedGymId,
    liveSnapshot,
    analytics,
    crossGym,
    activityFeed,
    isLoading: isGymsLoading,
    error: gymError,
    handleWSEvent,
    fetchAnalytics
  } = useGymData();

  const handleWebSocketMessage = (event) => {
    setLastWsEvent(event);
    handleWSEvent(event);
  };

  const { isConnected } = useWebSocket(handleWebSocketMessage);
  const { anomalies, activeUnreadCount, isLoading: isAnomaliesLoading, error: anomalyError, dismissAnomaly } = useAnomalies(lastWsEvent);

  return (
    <div className="app-container">
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadAnomalyCount={activeUnreadCount}
        isConnected={isConnected}
      />

      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard
            gyms={gyms}
            selectedGymId={selectedGymId}
            setSelectedGymId={setSelectedGymId}
            liveSnapshot={liveSnapshot}
            activityFeed={activityFeed}
            isLoading={isGymsLoading}
            error={gymError}
          />
        )}

        {activeTab === 'analytics' && (
          <Analytics
            gyms={gyms}
            selectedGymId={selectedGymId}
            setSelectedGymId={setSelectedGymId}
            analytics={analytics}
            crossGym={crossGym}
            fetchAnalytics={fetchAnalytics}
            isLoading={isGymsLoading}
          />
        )}

        {activeTab === 'anomalies' && (
          <Anomalies
            anomalies={anomalies}
            isLoading={isAnomaliesLoading}
            error={anomalyError}
            dismissAnomaly={dismissAnomaly}
          />
        )}

        {activeTab === 'simulator' && <SimulatorControl />}
      </main>
    </div>
  );
}

export default App;
