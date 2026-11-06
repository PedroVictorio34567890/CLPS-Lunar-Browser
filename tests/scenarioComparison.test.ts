import { test } from 'node:test';
import assert from 'node:assert/strict';
import { delayedScenario, summarizeScenario } from '../src/lib/scenarioComparison.ts';
import { makeScenario } from '../src/lib/scenarios.ts';
import { DEFAULT_MISSION } from '../src/lib/mission.ts';
import { appendSite } from '../src/lib/sites.ts';
import { sphericalEngine } from '../src/science/sphericalEngine.ts';
const make = () => makeScenario({ sites: appendSite([], { latitude: -85, longitude: 0 }, 'site'), period: { start: '2026-09-27T00:00', end: '2026-09-28T00:00' }, mission: { ...DEFAULT_MISSION, solarPowerW: 0, batteryWh: 100 } }, 'Reference', 'original', '2026-11-06T00:00:00Z');
test('delays preserve UTC duration and isolate coordinates and requirements', () => {
  const source = make(); source.period = { start: '2028-02-28T12:15', end: '2028-03-01T12:15' };
  const shifted = delayedScenario(source, 1);
  assert.deepEqual(shifted.period, { start: '2028-02-29T12:15', end: '2028-03-02T12:15' });
  assert.notEqual(shifted.id, source.id);
  shifted.sites[0].latitude = -88; shifted.mission.batteryWh = 999;
  assert.equal(source.sites[0].latitude, -85); assert.equal(source.mission.batteryWh, 100);
  assert.throws(() => delayedScenario(source, 0));
  source.period = { start: '2099-12-30T00:00', end: '2100-01-01T00:00' };
  assert.throws(() => delayedScenario(source, 1));
});
test('comparison separates geometric access from powered access and preserves site identity', async () => {
  const source = make();
  const report = await sphericalEngine.compare(source.sites, source.period, source.mission);
  const [row] = summarizeScenario(source, report);
  assert.equal(row.geometricPercent, 100);
  assert.ok(Math.abs(row.jointPercent - 100 / 24) < 1e-8);
  assert.equal(row.longestOutageHours, 23); assert.equal(row.minChargePercent, 0);
  assert.equal(row.communicationsPass, false); assert.equal(row.energyPass, false);
  assert.equal(row.site.id, 'site'); assert.equal(row.scenario.name, 'Reference');
  assert.ok(Math.abs(row.unservedWh - 2300) < 1e-7);
});
test('each row uses its own requirements and does not hide missing energy results', async () => {
  const source = make(); source.mission.minAvailabilityPercent = 0; source.mission.maxOutageHours = 24;
  const report = await sphericalEngine.compare(source.sites, source.period, source.mission);
  assert.equal(summarizeScenario(source, report)[0].communicationsPass, true);
  assert.equal(summarizeScenario(source, report)[0].energyPass, false);
  report.sites[0].energy = undefined;
  assert.throws(() => summarizeScenario(source, report), /incomplete/);
});
