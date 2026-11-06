import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { southPolarXY, demHeight, hasLocalCoverage, localTerrainHorizon, horizonAt } from '../src/science/terrain.ts';
import { simulateEnergy } from '../src/science/energy.ts';
import { DEFAULT_MISSION } from '../src/lib/mission.ts';
const metadata = JSON.parse(readFileSync(new URL('../src/science/terrainMetadata.json', import.meta.url), 'utf8'));
const near = (a: number, b: number, epsilon = 1e-7) => assert.ok(Math.abs(a-b) < epsilon, `${a} != ${b}`);
test('a synthetic ridge at 1 km blocks north by the analytic spherical angle', () => {
  const grid={width:401,height:401,x0:-4000,y0:4000,spacingM:20,radiusM:1737400,data:new Float32Array(401*401)};
  for(let c=0;c<401;c++) grid.data[150*401+c]=100;
  const profile=localTerrainHorizon(grid,{latitude:-90,longitude:0}).samples;
  const angle=1000/grid.radiusM;
  const expected=Math.atan2((grid.radiusM+100)*Math.cos(angle)-(grid.radiusM+2),(grid.radiusM+100)*Math.sin(angle))*180/Math.PI;
  near(profile[0].elevation,expected,0.001);
  near(profile[360].elevation,0);
});
test('south polar projection has correct axes and rejects incomplete coverage', () => {
  const R = 1737400, north = southPolarXY({latitude:-89,longitude:0},R), east = southPolarXY({latitude:-89,longitude:90},R);
  near(north.x,0); assert.ok(north.y>30000); near(east.x,north.y); near(east.y,0);
  assert.equal(hasLocalCoverage(metadata, metadata.demo),true);
  assert.equal(hasLocalCoverage(metadata,{latitude:-85,longitude:0}),false);
  assert.equal(hasLocalCoverage(metadata,{latitude:-90,longitude:0}),false);
});
test('flat spherical terrain has zero added obstruction, missing data never becomes flat', () => {
  const grid = {width:401,height:401,x0:-4000,y0:4000,spacingM:20,radiusM:1737400,data:new Float32Array(401*401)};
  const site = {latitude:-90,longitude:0};
  near(demHeight(grid,site)!,0);
  const flat = localTerrainHorizon(grid,site);
  assert.equal(flat.samples.length,720); assert.ok(flat.samples.every(s=>s.elevation===0));
  grid.data.fill(NaN); assert.equal(demHeight(grid,site),null);
  assert.throws(()=>localTerrainHorizon(grid,site),/nodata/);
});
test('horizon interpolation closes the north seam and handles undefined zenith azimuth', () => {
  const profile=[{azimuth:0,elevation:2},{azimuth:90,elevation:6},{azimuth:180,elevation:10},{azimuth:270,elevation:4}];
  near(horizonAt(profile,45),4); near(horizonAt(profile,315),3);
  near(horizonAt(profile,-45),3); near(horizonAt(profile,360),2); near(horizonAt(profile,null),10);
});
test('shipped NASA-derived raster matches provenance checksum and produces finite horizon', () => {
  const bytes=readFileSync(new URL('../public/terrain/shackleton-20m.f32',import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),metadata.sha256);
  assert.equal(bytes.length,metadata.width*metadata.height*4);
  const data = Float32Array.from({length:bytes.length/4},(_,i)=>bytes.readFloatLE(i*4));
  const result=localTerrainHorizon({...metadata,data},metadata.demo);
  assert.ok(result.elevationM>700 && result.elevationM<800);
  assert.ok(result.samples.every(s=>Number.isFinite(s.elevation)&&s.elevation>=0&&s.elevation<90));
});
test('terrain shadow gates fixed-panel power without changing incidence elevation', () => {
  const mission={...DEFAULT_MISSION,solarPowerW:200,generationFactorPercent:100,panelMode:'fixed' as const,panelTiltDeg:0,operatingPowerW:0};
  const energy=simulateEnergy([{time:0,sun:30,earth:5,sunAzimuth:0,sunClearance:-1},{time:3600000,sun:30,earth:5,sunAzimuth:0,sunClearance:1}],mission);
  near(energy.generatedWh,50);
  const dark=simulateEnergy([{time:0,sun:30,earth:5,sunClearance:-1},{time:3600000,sun:30,earth:5,sunClearance:-1}],{...mission,panelMode:'tracking'});
  near(dark.generatedWh,0);
});
