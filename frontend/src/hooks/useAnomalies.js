import { useState, useEffect, useCallback } from 'react';

export function useAnomalies(wsEvent) {
  const [anomalies, setAnomalies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnomalies = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/anomalies');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setAnomalies(data);
    } catch (err) {
      setError(`Failed to fetch anomalies: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  // Handle incoming WS anomaly events
  useEffect(() => {
    if (!wsEvent) return;

    if (wsEvent.type === 'ANOMALY_DETECTED') {
      const newAnomaly = {
        id: wsEvent.anomaly_id,
        gym_id: wsEvent.gym_id,
        gym_name: wsEvent.gym_name,
        type: wsEvent.anomaly_type,
        severity: wsEvent.severity,
        message: wsEvent.message,
        resolved: false,
        dismissed: false,
        detected_at: new Date().toISOString()
      };
      setAnomalies((prev) => [newAnomaly, ...prev.filter((a) => a.id !== newAnomaly.id)]);
    } else if (wsEvent.type === 'ANOMALY_RESOLVED') {
      setAnomalies((prev) =>
        prev.map((a) =>
          a.id === wsEvent.anomaly_id
            ? { ...a, resolved: true, resolved_at: wsEvent.resolved_at }
            : a
        )
      );
    }
  }, [wsEvent]);

  const dismissAnomaly = async (id) => {
    try {
      setError(null);
      const res = await fetch(`/api/anomalies/${id}/dismiss`, {
        method: 'PATCH'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dismiss anomaly');
      }
      setAnomalies((prev) => prev.filter((a) => a.id !== id));
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const activeUnreadCount = anomalies.filter((a) => !a.resolved && !a.dismissed).length;

  return {
    anomalies,
    activeUnreadCount,
    isLoading,
    error,
    dismissAnomaly,
    refreshAnomalies: fetchAnomalies
  };
}
