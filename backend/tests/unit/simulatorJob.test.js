const simulatorJob = require('../../src/jobs/simulator');
const simulatorService = require('../../src/services/simulatorService');

describe('simulator Job Re-export Unit Test', () => {
  test('re-exports all simulatorService methods', () => {
    expect(simulatorJob.getSimulatorStatus).toBeDefined();
    expect(simulatorJob.startSimulator).toBeDefined();
    expect(simulatorJob.stopSimulator).toBeDefined();
    expect(simulatorJob.resetSimulator).toBeDefined();
    expect(simulatorJob.tickSimulator).toBeDefined();
  });
});
