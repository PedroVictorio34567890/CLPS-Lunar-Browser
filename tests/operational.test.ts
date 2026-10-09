import { test } from 'node:test';
import assert from 'node:assert/strict';
import { operationalWindows } from '../src/science/operationalWindows.ts';
import { simulateEnergy } from '../src/science/energy.ts';
import { DEFAULT_MISSION } from '../src/lib/mission.ts';
const H = 3600000;
test('joint access merges continuous outages across changes in cause', () => {
  const r = operationalWindows([{ start: 0, end: 4 * H, visible: true }, { start: 4 * H, end: 6 * H, visible: false }, { start: 6 * H, end: 10 * H, visible: true }], [{ start: 3 * H, end: 5 * H }, { start: 6 * H, end: 8 * H }]);
  assert.equal(r.percent, 50); assert.equal(r.longestOutageHours, 5);
  assert.equal(r.lostToEnergyHours, 3); assert.equal(r.longestAvailableHours, 3);
  assert.deepEqual(r.windows.map(w => w.cause), ['available', 'energy', 'both', 'geometry', 'energy', 'available']);
  assert.deepEqual(r.outages, [{ start: 3 * H, end: 8 * H }]);
});
test('clips and unions overlapping deficits without double counting', () => {
  const geometry = [{ start: H, end: 5 * H, visible: true }];
  const deficits = [{ start: 3 * H, end: 6 * H }, { start: 0, end: 2 * H }, { start: H, end: 4 * H }];
  const r = operationalWindows(geometry, deficits);
  assert.equal(r.percent, 0); assert.equal(r.longestOutageHours, 4);
  assert.equal(r.lostToEnergyHours, 4); assert.equal(deficits[0].end, 6 * H);
});
test('full access, no access and exact period boundaries', () => {
  const all = [{ start: 0, end: H, visible: true }];
  assert.equal(operationalWindows(all, [{ start: H, end: 2 * H }]).percent, 100);
  const none = operationalWindows([{ ...all[0], visible: false }], []);
  assert.equal(none.percent, 0); assert.equal(none.lostToEnergyHours, 0);
  assert.equal(none.longestOutageHours, 1);
  assert.throws(() => operationalWindows([], []));
});
test('energy depletion removes access but reserve crossing alone does not', () => {
  const m = { ...DEFAULT_MISSION, batteryWh: 1000, operatingPowerW: 100, reservePercent: 20 };
  const e = simulateEnergy([{ time: 0, sun: -10, earth: 20 }, { time: 12 * H, sun: -10, earth: 20 }], m);
  const r = operationalWindows([{ start: 0, end: 12 * H, visible: true }], e.outages);
  assert.equal(e.firstReserveViolation, 8 * H);
  assert.equal(r.availableHours, 10); assert.equal(r.longestOutageHours, 2);
});
