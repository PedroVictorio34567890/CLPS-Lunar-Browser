import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateEnergy, solarPower } from '../src/science/energy.ts';
import { DEFAULT_MISSION, sameMission } from '../src/lib/mission.ts';
import { sphericalEngine } from '../src/science/sphericalEngine.ts';
const hour = 3600000;
const m = { ...DEFAULT_MISSION, batteryWh: 1000, operatingPowerW: 100, solarPowerW: 200, generationFactorPercent: 100 };
const samples = (sun: number, hours: number) => [{ time: 0, sun, earth: 0, sunAzimuth: 0 }, { time: hours * hour, sun, earth: 0, sunAzimuth: 0 }];
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
test('night battery depletion and reserve crossing match analytic solution', () => {
  const e = simulateEnergy(samples(-10, 12), m);
  near(e.firstReserveViolation!, 8 * hour); near(e.firstEmpty!, 10 * hour);
  near(e.unservedWh, 200); near(e.finalChargeWh, 0); near(e.outages[0].end - e.outages[0].start, 2 * hour);
});
test('generation surplus saturates battery and conserves energy', () => {
  const e = simulateEnergy(samples(10, 10), { ...m, initialChargePercent: 50 });
  near(e.generatedWh, 2000); near(e.demandWh, 1000); near(e.spilledWh, 500);
  near(e.finalChargeWh, 1000); assert.equal(e.firstReserveViolation, null);
  near(500 + e.generatedWh - e.demandWh + e.unservedWh - e.spilledWh, e.finalChargeWh);
});
test('horizon crossing splits tracking generation and exact partial interval', () => {
  const e = simulateEnergy([{ time: 0, sun: -1, earth: 0 }, { time: hour, sun: 1, earth: 0 }], m);
  near(e.generatedWh, 100); near(e.finalChargeWh, 1000); near(e.minChargeWh, 950);
  near(simulateEnergy(samples(-1, 1 / 60), m).demandWh, 100 / 60);
});
test('fixed panel incidence respects tilt, azimuth and night', () => {
  const fixed = { ...m, panelMode: 'fixed' as const, panelTiltDeg: 0 };
  near(solarPower(30, 0, fixed), 100);
  near(solarPower(30, 180, { ...fixed, panelTiltDeg: 90 }), 0);
  near(solarPower(30, 0, { ...fixed, panelTiltDeg: 90 }), 200 * Math.cos(Math.PI / 6));
  near(solarPower(-1, 0, fixed), 0);
  assert.throws(() => solarPower(30, undefined, fixed));
});
test('duty cycle, initial empty battery, recharge and equality at reserve', () => {
  const e = simulateEnergy(samples(-1, 2), { ...m, operatingDutyPercent: 50, standbyPowerW: 0 });
  near(e.loadW, 50); near(e.finalChargeWh, 900);
  const equality = simulateEnergy(samples(-1, 8), m); assert.equal(equality.firstReserveViolation, null);
  const empty = simulateEnergy(samples(1, 1), { ...m, initialChargePercent: 0, reservePercent: 0 });
  near(empty.unservedWh, 0); near(empty.finalChargeWh, 100);
  assert.throws(() => simulateEnergy(samples(1, 1), { ...m, panelTiltDeg: 100 }));
  assert.equal(sameMission(m, { ...m, operatingDutyPercent: 50 }), false);
});
test('worker engine calculation captures energy inputs and produces fixed-panel output', async () => {
  const mission = { ...m, panelMode: 'fixed' as const };
  const report = await sphericalEngine.compare([{ id: 'p', slot: 0, color: '#fff', latitude: -85, longitude: 0 }], { start: '2026-09-27T00:00', end: '2026-09-28T00:00' }, mission);
  mission.batteryWh = 50;
  assert.equal(report.mission!.batteryWh, 1000);
  assert.ok(report.sites[0].energy!.samples.length > 200);
  const e = report.sites[0].energy!;
  near(1000 + e.generatedWh - e.demandWh + e.unservedWh - e.spilledWh, e.finalChargeWh);
});
