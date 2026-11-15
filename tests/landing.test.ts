import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessLanding, DEFAULT_LANDING, validLanding, type LandingGrid } from '../src/science/landingTerrain.ts';
import { DEFAULT_MISSION, sameMission, missionError } from '../src/lib/mission.ts';
import { copyInputs } from '../src/lib/scenarios.ts';
const pole={latitude:-90,longitude:0},settings={radiusM:100,maxSlopeDeg:10,maxReliefM:100};
function grid(fn:(x:number,y:number)=>number,spacingM=20):LandingGrid {
  const width=31,height=31,x0=-15*spacingM,y0=15*spacingM;
  return {id:'synthetic',source:'test',width,height,x0,y0,spacingM,radiusM:1737400,data:Float32Array.from({length:width*height},(_,i)=>fn(x0+i%width*spacingM,y0-Math.floor(i/width)*spacingM))};
}
test('flat terrain has zero slope, relief and residuals with a full footprint',()=>{
  const r=assessLanding(grid(()=>123),pole,settings);assert.equal(r.status,'calculated');if(r.status!=='calculated')return;
  assert.equal(r.maxSlopeDeg,0);assert.equal(r.reliefM,0);assert.equal(r.residualRmsM,0);assert.ok(r.withinLimits);assert.equal(r.sampleCount,81);assert.ok(r.cells.length<=625);
});
test('tilted plane matches analytical slope and detrending removes its slope',()=>{
  const r=assessLanding(grid((x,y)=>.2*x+.1*y+100),pole,settings);assert.equal(r.status,'calculated');if(r.status!=='calculated')return;
  const angle=Math.atan(Math.hypot(.2,.1))*180/Math.PI;
  assert.ok(Math.abs(r.maxSlopeDeg-angle)<1e-6);assert.ok(Math.abs(r.planeSlopeDeg-angle)<1e-8);assert.ok(r.residualRmsM<1e-8);assert.equal(r.aboveSlopePercent,100);assert.equal(r.withinLimits,false);
});
test('a resolved peak appears in relief, residuals and the slope map',()=>{
  const r=assessLanding(grid((x,y)=>x===0&&y===0?40:0),pole,{...settings,maxReliefM:30});assert.equal(r.status,'calculated');if(r.status!=='calculated')return;
  assert.equal(r.reliefM,40);assert.ok(r.residualRmsM>0);assert.ok(r.maxPositiveResidualM>39);assert.ok(r.maxSlopeDeg>44);assert.equal(r.withinLimits,false);assert.ok(r.cells.some(c=>c.slope>44));
});
test('coverage, resolution and missing elevation never masquerade as safe terrain',()=>{
  assert.equal(assessLanding(grid(()=>0),{latitude:0,longitude:0},settings).status,'outside');
  assert.equal(assessLanding(grid(()=>0),pole,{...settings,radiusM:300}).status,'outside');
  assert.equal(assessLanding(grid(()=>0,80),pole,settings).status,'insufficient-resolution');
  const hole=grid(()=>0);hole.data[15*31+15]=NaN;assert.equal(assessLanding(hole,pole,settings).status,'unavailable');
});
test('landing settings validate, migrate and copy independently',()=>{
  for(const patch of [{radiusM:39},{radiusM:2001},{maxSlopeDeg:91},{maxReliefM:-1},{maxSlopeDeg:NaN}]){assert.equal(validLanding({...DEFAULT_LANDING,...patch}),false);assert.ok(missionError({...DEFAULT_MISSION,landing:{...DEFAULT_LANDING,...patch}}));}
  const old={...DEFAULT_MISSION};delete old.landing;
  const copied=copyInputs({sites:[],period:{start:'2026-11-15T00:00',end:'2026-11-16T00:00'},mission:old});
  assert.deepEqual(copied.mission.landing,DEFAULT_LANDING);assert.ok(sameMission(old,copied.mission));copied.mission.landing!.radiusM=1000;
  assert.equal(DEFAULT_LANDING.radiusM,500);assert.equal(sameMission(old,copied.mission),false);
});
