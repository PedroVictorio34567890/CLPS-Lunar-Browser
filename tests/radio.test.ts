import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Body, Observer, Equator, Horizon } from 'astronomy-engine';
import { DEFAULT_RADIO, radioBudget, validRadio } from '../src/science/radioBudget.ts';
import { stationGeometry } from '../src/science/stationGeometry.ts';
import { iauLunarRotation } from '../src/science/ephemeris.ts';
import { DEFAULT_MISSION, missionError, sameMission } from '../src/lib/mission.ts';
import { makeScenario, copyInputs, parseLibrary } from '../src/lib/scenarios.ts';
import { appendSite } from '../src/lib/sites.ts';
const near=(a:number,b:number,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
test('Friis budget matches independent engineering formula and physical scaling',()=>{
  const r={...DEFAULT_RADIO,frequencyGHz:2.2}, a=radioBudget(r,384400);
  near(a.freeSpaceLossDb,92.45+20*Math.log10(2.2)+20*Math.log10(384400),0.003);
  near(a.eirpDbw,10*Math.log10(20)+20);
  near(radioBudget(r,768800).marginDb-a.marginDb,-20*Math.log10(2));
  near(radioBudget({...r,transmitPowerW:40},384400).marginDb-a.marginDb,10*Math.log10(2));
  near(radioBudget({...r,dataRateKbps:200},384400).marginDb-a.marginDb,-10*Math.log10(2));
  near(radioBudget({...r,noiseTemperatureK:200},384400).marginDb-a.marginDb,-10*Math.log10(2));
  near(radioBudget({...r,designMarginDb:6},384400).marginDb-a.marginDb,-3);
  near(radioBudget({...r,dataRateKbps:a.maxRateKbps},384400).marginDb,0);
});
test('radio rejects missing, nonfinite and unphysical parameters',()=>{
  for(const r of [{...DEFAULT_RADIO,transmitPowerW:0},{...DEFAULT_RADIO,lossesDb:-1},{...DEFAULT_RADIO,dataRateKbps:NaN},{...DEFAULT_RADIO,stationLatitude:91},{...DEFAULT_RADIO,noiseTemperatureK:0},{}]) {
    assert.equal(validRadio(r),false); assert.ok(missionError({...DEFAULT_MISSION,radio:r as typeof DEFAULT_RADIO}));
  }
  assert.throws(()=>radioBudget(DEFAULT_RADIO,0));
});
test('station geometry agrees with independent equatorial-to-horizontal Moon calculation and rotates invariantly',()=>{
  for(let hour=0;hour<24;hour+=4) {
    const time=Date.UTC(2026,10,8,hour), date=new Date(time), observer=new Observer(40,-4,600);
    const eq=Equator(Body.Moon,date,observer,true,false);
    const independent=Horizon(date,observer,eq.ra,eq.dec).altitude;
    const g=stationGeometry({latitude:-85,longitude:0},time,0,DEFAULT_RADIO,iauLunarRotation(time));
    // Independent calculation targets Moon center, ours targets the surface site.
    near(g.groundElevation,independent,0.35);
    assert.ok(g.rangeKm>350000 && g.rangeKm<420000);
  }
});
test('old scenarios acquire default radio settings; saved copies do not alias and radio edits invalidate reports',()=>{
  const mission={...DEFAULT_MISSION}; delete mission.radio;
  const scenario=makeScenario({sites:appendSite([],{latitude:-85,longitude:0},'a'),mission,period:{start:'2026-11-08T00:00',end:'2026-11-09T00:00'}},'Legacy','legacy','2026-11-08T00:00:00Z');
  delete scenario.mission.radio;
  const loaded=parseLibrary(JSON.stringify({version:1,scenarios:[scenario]})).scenarios[0];
  assert.deepEqual(loaded.mission.radio,DEFAULT_RADIO);
  const copy=copyInputs(loaded); copy.mission.radio!.transmitPowerW=50;
  assert.equal(loaded.mission.radio!.transmitPowerW,20);
  assert.equal(sameMission(copy.mission,loaded.mission),false);
  assert.equal(sameMission(mission,loaded.mission),true);
});
