import { useState, useEffect, useCallback } from 'react';

export function useGymData() {
  const [gyms, setGyms] = useState([]);
  const [selectedGymId, setSelectedGymId] = useState('');
  const [liveSnapshot, setLiveSnapshot] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [crossGym, setCrossGym] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all gyms summary
  const fetchGyms = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/gyms');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setGyms(data);
      if (data.length > 0 && !selectedGymId) {
        setSelectedGymId(data[0].id);
      }
    } catch (err) {
      setError(`Failed to fetch gyms list: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedGymId]);

  // Fetch live snapshot for selected gym
  const fetchLiveSnapshot = useCallback(async (gymId) => {
    if (!gymId) return;
    try {
      const res = await fetch(`/api/gyms/${gymId}/live`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setLiveSnapshot(data);
    } catch (err) {
      setError(`Failed to load live snapshot: ${err.message}`);
    }
  }, []);

  // Fetch analytics for selected gym
  const fetchAnalytics = useCallback(async (gymId, dateRange = '7d') => {
    if (!gymId) return;
    try {
      const res = await fetch(`/api/gyms/${gymId}/analytics?dateRange=${dateRange}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      setError(`Failed to load analytics: ${err.message}`);
    }
  }, []);

  // Fetch cross gym ranking
  const fetchCrossGym = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/cross-gym');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setCrossGym(data);
    } catch (err) {
      console.error('Failed to load cross gym analytics:', err);
    }
  }, []);

  useEffect(() => {
    fetchGyms();
    fetchCrossGym();
  }, [fetchGyms, fetchCrossGym]);

  useEffect(() => {
    if (selectedGymId) {
      fetchLiveSnapshot(selectedGymId);
      fetchAnalytics(selectedGymId, '7d');
    }
  }, [selectedGymId, fetchLiveSnapshot, fetchAnalytics]);

  // Handle incoming real-time WebSocket events
  const handleWSEvent = useCallback((event) => {
    if (!event || !event.type) return;

    // Add to activity feed (keep max 20 events)
    setActivityFeed((prev) => [event, ...prev].slice(0, 20));

    // Update live counts instantly
    if (event.gym_id === selectedGymId) {
      if (event.type === 'CHECKIN_EVENT' || event.type === 'CHECKOUT_EVENT') {
        setLiveSnapshot((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            current_occupancy: event.current_occupancy,
            capacity_pct: event.capacity_pct
          };
        });
      } else if (event.type === 'PAYMENT_EVENT') {
        setLiveSnapshot((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            today_revenue: event.today_total
          };
        });
      }
    }

    // Also update gym list counters
    setGyms((prevGyms) =>
      prevGyms.map((g) => {
        if (g.id === event.gym_id) {
          if (event.type === 'CHECKIN_EVENT' || event.type === 'CHECKOUT_EVENT') {
            return {
              ...g,
              current_occupancy: event.current_occupancy,
              capacity_pct: event.capacity_pct
            };
          } else if (event.type === 'PAYMENT_EVENT') {
            return {
              ...g,
              today_revenue: event.today_total
            };
          }
        }
        return g;
      })
    );
  }, [selectedGymId]);

  return {
    gyms,
    selectedGymId,
    setSelectedGymId,
    liveSnapshot,
    analytics,
    crossGym,
    activityFeed,
    isLoading,
    error,
    handleWSEvent,
    fetchAnalytics
  };
}
