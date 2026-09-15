const {
  evaluateZeroCheckins,
  evaluateCapacityBreach,
  evaluateCapacityBreachResolved,
  evaluateRevenueDrop,
  evaluateRevenueDropResolved
} = require('../../src/services/anomalyService');

describe('Anomaly Detection Pure Logic Unit Tests', () => {
  describe('zero_checkins rule', () => {
    test('1. fires warning when gym active, inside operating hours, and no checkin in > 2 hours', () => {
      const result = evaluateZeroCheckins({
        gymStatus: 'active',
        lastCheckinTime: '2026-09-15T10:00:00Z',
        currentTimeStr: '14:00:00',
        opensAt: '06:00:00',
        closesAt: '22:00:00',
        twoHoursAgoTime: '2026-09-15T12:00:00Z'
      });
      expect(result).toBe(true);
    });

    test('2. does NOT fire when gym is closed outside operating hours', () => {
      const result = evaluateZeroCheckins({
        gymStatus: 'active',
        lastCheckinTime: '2026-09-15T01:00:00Z',
        currentTimeStr: '04:00:00', // 4am is outside 6am-10pm
        opensAt: '06:00:00',
        closesAt: '22:00:00',
        twoHoursAgoTime: '2026-09-15T02:00:00Z'
      });
      expect(result).toBe(false);
    });

    test('3. does NOT fire when gym status is inactive or maintenance', () => {
      const result = evaluateZeroCheckins({
        gymStatus: 'maintenance',
        lastCheckinTime: '2026-09-15T08:00:00Z',
        currentTimeStr: '14:00:00',
        opensAt: '06:00:00',
        closesAt: '22:00:00',
        twoHoursAgoTime: '2026-09-15T12:00:00Z'
      });
      expect(result).toBe(false);
    });
  });

  describe('capacity_breach rule', () => {
    test('4. fires critical severity when occupancy exceeds 90%', () => {
      const result = evaluateCapacityBreach({ currentOccupancy: 95, capacity: 100 });
      expect(result).toBe(true);
    });

    test('5. does NOT fire when occupancy is 90% or lower', () => {
      const result = evaluateCapacityBreach({ currentOccupancy: 90, capacity: 100 });
      expect(result).toBe(false);
    });

    test('6. auto-resolves capacity breach when occupancy drops below 85%', () => {
      const isResolved = evaluateCapacityBreachResolved({ currentOccupancy: 84, capacity: 100 });
      expect(isResolved).toBe(true);
    });

    test('7. does NOT auto-resolve capacity breach when occupancy remains at 85% or above', () => {
      const isResolved = evaluateCapacityBreachResolved({ currentOccupancy: 86, capacity: 100 });
      expect(isResolved).toBe(false);
    });
  });

  describe('revenue_drop rule', () => {
    test('8. fires warning when today revenue is >=30% below last week same day (<70%)', () => {
      const result = evaluateRevenueDrop({ todayRevenue: 600, sameDayLastWeekRevenue: 1000 });
      expect(result).toBe(true);
    });

    test('9. does NOT fire when revenue is only 20% lower (80% of last week)', () => {
      const result = evaluateRevenueDrop({ todayRevenue: 800, sameDayLastWeekRevenue: 1000 });
      expect(result).toBe(false);
    });

    test('10. auto-resolves revenue drop when revenue recovers to within 20% (>=80%) of last week', () => {
      const isResolved = evaluateRevenueDropResolved({ todayRevenue: 850, sameDayLastWeekRevenue: 1000 });
      expect(isResolved).toBe(true);
    });

    test('11. does NOT auto-resolve revenue drop when revenue remains below 80% of last week', () => {
      const isResolved = evaluateRevenueDropResolved({ todayRevenue: 750, sameDayLastWeekRevenue: 1000 });
      expect(isResolved).toBe(false);
    });
  });
});
