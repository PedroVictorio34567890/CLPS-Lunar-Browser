import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_DATA, simulateDataStorage as simulate, validData } from '../src/science/dataStorage.ts';
import { DEFAULT_MISSION, sameMission, missionError } from '../src/lib/mission.ts';
import { copyInputs } from '../src/lib/scenarios.ts';
import { addDataAssessment } from '../src/science/dataAssessment.ts';
import { sphericalEngine } from '../src/science/sphericalEngine.ts';
import { appendSite } from '../src/lib/sites.ts';
const d={...DEFAULT_DATA,generationKbps:8000,capacityMB:5,payloadEfficiencyPercent:100};
const w=(start:number,end:number,visible:boolean)=>({start:start*1000,end:end*1000,visible});
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('buffer fills, discards incoming overflow, then drains; conservation and minimum capacity',()=>{
  const r=simulate([w(0,10,false),w(10,20,true)],[],16000,d);
  near(r.generatedMB,20);near(r.lostMB,5);near(r.transmittedMB,15);near(r.remainingMB,0);
  near(r.requiredCapacityMB,10);assert.equal(r.firstOverflow,5000);
  assert.ok(r.samples.some(s=>s.time===5000&&s.storedMB===5));
  assert.ok(r.samples.some(s=>s.time===15000&&s.storedMB===0));
  near(r.generatedMB,r.transmittedMB+r.lostMB+r.remainingMB);
});
test('overlapping energy deficits pause production and transmission but preserve nonvolatile contents',()=>{
  const r=simulate([w(0,10,true)],[{start:2000,end:6000},{start:4000,end:8000}],8000,{...d,initialMB:3});
  near(r.generatedMB,4);near(r.transmittedMB,4);near(r.notGeneratedMB,6);near(r.remainingMB,3);near(r.lostMB,0);
});
test('efficiency changes payload service, including zero efficiency and initial-only data',()=>{
  const r=simulate([w(0,10,true)],[],8000,{...d,generationKbps:0,initialMB:5,payloadEfficiencyPercent:50});
  near(r.transmittedMB,5);near(r.remainingMB,0);near(r.requiredCapacityMB,5);
  const z=simulate([w(0,10,true)],[],8000,{...d,payloadEfficiencyPercent:0});
  near(z.transmittedMB,0);near(z.lostMB,5);
});
test('invalid storage and discontinuous windows are rejected',()=>{
  for(const patch of [{initialMB:1025},{capacityMB:0},{generationKbps:NaN},{payloadEfficiencyPercent:101}]) assert.equal(validData({...DEFAULT_DATA,...patch}),false);
  assert.throws(()=>simulate([w(0,1,true),w(2,3,true)],[],8000,d));
  assert.throws(()=>simulate([w(0,10,true)],[{start:5,end:4}],8000,d));
  assert.ok(missionError({...DEFAULT_MISSION,data:{...d,initialMB:6}}));
});
test('legacy missions receive default storage and snapshots do not share settings',()=>{
  const old={...DEFAULT_MISSION};delete old.data;
  assert.ok(sameMission(old,DEFAULT_MISSION));
  const inputs={sites:[],period:{start:'2026-11-08T00:00',end:'2026-11-09T00:00'},mission:old};
  const copy=copyInputs(inputs);assert.deepEqual(copy.mission.data,DEFAULT_DATA);
  copy.mission.data!.generationKbps=20;
  assert.equal(DEFAULT_DATA.generationKbps,10);assert.equal(sameMission(copy.mission,old),false);
});
test('assessment does not fabricate a radio link when results are unavailable',async()=>{
  const report=await sphericalEngine.compare(appendSite([],{latitude:0,longitude:0},'data'),{start:'2026-11-08T00:00',end:'2026-11-09T00:00'},DEFAULT_MISSION);
  addDataAssessment(report);assert.equal(report.sites[0].data?.status,'unavailable');
});
