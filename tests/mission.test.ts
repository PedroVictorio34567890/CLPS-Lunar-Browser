import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_MISSION, evaluateCommunications, missionError, sameMission } from '../src/lib/mission.ts';
import { sphericalEngine } from '../src/science/sphericalEngine.ts';
import type { SiteReport } from '../src/models.ts';

const example = (samples: { time: number; earth: number }[]) => ({ series: { samples: samples.map(sample => ({ ...sample, sun: 0 })) } }) as SiteReport;
test('communication elevation threshold changes windows and checks inclusive mission limits', () => {
  const site = example([{ time: 0, earth: 0 }, { time: 3600000, earth: 10 }, { time: 7200000, earth: 0 }]);
  const mission = { ...DEFAULT_MISSION, minEarthElevationDeg: 5, minAvailabilityPercent: 50, maxOutageHours: 0.5 };
  const result = evaluateCommunications(site, mission)!;
  assert.equal(result.percent, 50); assert.equal(result.longestHiddenHours, 0.5); assert.equal(result.passes, true);
  assert.equal(result.outages.length, 2); assert.equal(result.outages[0].end, 1800000);
  assert.equal(evaluateCommunications(site, { ...mission, minAvailabilityPercent: 50.01 })!.availabilityPass, false);
  assert.equal(evaluateCommunications(site, { ...mission, maxOutageHours: 0.49 })!.outagePass, false);
  assert.equal(evaluateCommunications(site, { ...mission, minEarthElevationDeg: 0 })!.percent, 100);
});
test('constant loss, full access and threshold equality have explicit outcomes', () => {
  const mission = { ...DEFAULT_MISSION, minEarthElevationDeg: 5, maxOutageHours: 0 };
  const constant = (earth: number) => example([{ time: 0, earth }, { time: 3600000, earth }]);
  assert.equal(evaluateCommunications(constant(6), mission)!.passes, true);
  assert.equal(evaluateCommunications(constant(5), mission)!.percent, 0);
  assert.equal(evaluateCommunications(constant(4), mission)!.outages[0].end, 3600000);
  assert.equal(evaluateCommunications({} as SiteReport, mission), null);
});
test('mission requirements validate blank, range and battery consistency and detect stale reports', () => {
  assert.equal(missionError(DEFAULT_MISSION), null);
  for (const update of [{ maxOutageHours: NaN }, { maxOutageHours: -1 }, { minEarthElevationDeg: 90 }, { minAvailabilityPercent: 101 }, { batteryWh: 0 }, { initialChargePercent: 10, reservePercent: 20 }]) assert.ok(missionError({ ...DEFAULT_MISSION, ...update }));
  const captured = { ...DEFAULT_MISSION };
  assert.equal(sameMission(captured, DEFAULT_MISSION), true);
  assert.equal(sameMission(captured, { ...DEFAULT_MISSION, maxOutageHours: 2 }), false);
  assert.equal(sameMission(captured, { ...DEFAULT_MISSION, batteryWh: 1000 }), false);
});
test('zero-degree mission reference agrees with scientific report without mutating it', async () => {
  const report = await sphericalEngine.compare([{ id: 'polar', slot: 0, color: '#fff', latitude: -89, longitude: 0 }], { start: '2026-09-27T00:00', end: '2026-10-04T00:00' });
  const before = JSON.stringify(report);
  const result = evaluateCommunications(report.sites[0], { ...DEFAULT_MISSION, minEarthElevationDeg: 0 })!;
  assert.equal(result.percent, report.sites[0].earthVisibilityPercent.value);
  assert.equal(result.longestHiddenHours, report.sites[0].longestCommunicationOutageHours.value);
  assert.equal(JSON.stringify(report), before);
});
