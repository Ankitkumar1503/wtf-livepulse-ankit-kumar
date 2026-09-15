const { startBackgroundJobs, stopBackgroundJobs } = require('../../src/jobs/anomalyDetector');
const anomalyService = require('../../src/services/anomalyService');
const statsService = require('../../src/services/statsService');

jest.mock('../../src/services/anomalyService', () => ({
  runAnomalyDetectionJob: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../src/services/statsService', () => ({
  refreshMaterializedView: jest.fn().mockResolvedValue(true)
}));

describe('anomalyDetector Job Coordinator Unit Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    stopBackgroundJobs();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  test('startBackgroundJobs triggers anomaly detection and materialized view refresh intervals', () => {
    startBackgroundJobs();

    // Initial startup check
    expect(anomalyService.runAnomalyDetectionJob).toHaveBeenCalledTimes(1);

    // Fast-forward 30 seconds -> anomalyDetector should fire again
    jest.advanceTimersByTime(30000);
    expect(anomalyService.runAnomalyDetectionJob).toHaveBeenCalledTimes(2);

    // Fast-forward 15 minutes -> refreshMaterializedView should fire
    jest.advanceTimersByTime(15 * 60 * 1000);
    expect(statsService.refreshMaterializedView).toHaveBeenCalled();

    stopBackgroundJobs();
  });
});
