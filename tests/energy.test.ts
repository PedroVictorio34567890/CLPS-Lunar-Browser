import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateEnergy, solarPower } from '../src/science/energy.ts';
import { DEFAULT_MISSION, sameMission } from '../src/lib/mission.ts';
import { sphericalEngine } from '../src/science/sphericalEngine.ts';
import { DEFAULT_BATTERY, validBattery } from '../src/science/batterySettings.ts';
import { copyInputs } from '../src/lib/scenarios.ts';
test('legacy battery defaults, snapshots and validation remain safe',()=>{
  const old={...DEFAULT_MISSION};delete old.battery;
  const copy=copyInputs({sites:[],period:{start:'2026-09-27T00:00',end:'2026-10-04T00:00'},mission:old});
  assert.deepEqual(copy.mission.battery,DEFAULT_BATTERY);assert.ok(sameMission(old,copy.mission));
  copy.mission.battery!.maxDischargeW=40;assert.equal(DEFAULT_BATTERY.maxDischargeW,0);assert.equal(sameMission(old,copy.mission),false);
  for(const patch of [{chargeEfficiencyPercent:0},{dischargeEfficiencyPercent:101},{maxChargeW:-1},{maxDischargeW:NaN}]) assert.equal(validBattery({...DEFAULT_BATTERY,...patch}),false);
});
const hour = 3600000;
test('battery conversion losses conserve total energy and advance empty time',()=>{
  const mission={...DEFAULT_MISSION,batteryWh:1000,operatingPowerW:100,solarPowerW:0,battery:{chargeEfficiencyPercent:80,dischargeEfficiencyPercent:80,maxChargeW:0,maxDischargeW:0}};
  const e=simulateEnergy([{time:0,sun:-1,earth:0},{time:10*3600000,sun:-1,earth:0}],mission);
  assert.equal(e.firstEmpty,8*3600000);assert.equal(e.batteryLossWh,200);assert.equal(e.unservedWh,200);
  assert.equal(1000+e.generatedWh-e.demandWh+e.unservedWh-e.spilledWh-e.batteryLossWh!,e.finalChargeWh);
});
test('discharge power limit causes immediate outage despite stored energy',()=>{
  const e=simulateEnergy([{time:0,sun:-1,earth:0},{time:3600000,sun:-1,earth:0}],{...DEFAULT_MISSION,batteryWh:1000,operatingPowerW:100,battery:{chargeEfficiencyPercent:100,dischargeEfficiencyPercent:100,maxChargeW:0,maxDischargeW:40}});
  assert.equal(e.finalChargeWh,960);assert.equal(e.unservedWh,60);assert.deepEqual(e.outages,[{start:0,end:3600000}]);assert.equal(e.firstEmpty,null);
});
test('charge power limit, conversion loss and saturation are accounted separately',()=>{
  const e=simulateEnergy([{time:0,sun:90,earth:0},{time:2*3600000,sun:90,earth:0}],{...DEFAULT_MISSION,batteryWh:100,initialChargePercent:0,reservePercent:0,operatingPowerW:0,solarPowerW:200,generationFactorPercent:100,battery:{chargeEfficiencyPercent:80,dischargeEfficiencyPercent:100,maxChargeW:100,maxDischargeW:0}});
  assert.equal(e.finalChargeWh,100);assert.equal(e.batteryLossWh,25);assert.equal(e.spilledWh,275);assert.ok(e.samples.some(s=>s.time===1.25*3600000&&s.chargeWh===100));
});
test('solar generation follows inverse square distance and rejects invalid distance',()=>{
  const series=[{time:0,sun:90,earth:0,solarDistanceKm:2*149597870.7},{time:3600000,sun:90,earth:0,solarDistanceKm:2*149597870.7}];
  assert.equal(simulateEnergy(series,{...DEFAULT_MISSION,solarPowerW:400,generationFactorPercent:100}).generatedWh,100);
  assert.throws(()=>simulateEnergy(series.map(s=>({...s,solarDistanceKm:0})),DEFAULT_MISSION));
});
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
