const { runAnomalyDetectionJob } = require('../services/anomalyService');
const { refreshMaterializedView } = require('../services/statsService');

let anomalyTimer = null;
let mviewTimer = null;

function startBackgroundJobs() {
  // Anomaly detector runs every 30 seconds
  anomalyTimer = setInterval(() => {
    runAnomalyDetectionJob().catch(err => {
      console.error('Anomaly detector error:', err.message);
    });
  }, 30000);

  // Materialized View refresher runs every 15 minutes
  mviewTimer = setInterval(() => {
    refreshMaterializedView().catch(err => {
      console.error('Materialized view refresh error:', err.message);
    });
  }, 15 * 60 * 1000);

  // Run initial check on startup
  runAnomalyDetectionJob().catch(() => {});
}

function stopBackgroundJobs() {
  if (anomalyTimer) clearInterval(anomalyTimer);
  if (mviewTimer) clearInterval(mviewTimer);
}

module.exports = {
  startBackgroundJobs,
  stopBackgroundJobs
};
