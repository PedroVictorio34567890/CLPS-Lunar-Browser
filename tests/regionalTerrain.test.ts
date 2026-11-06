import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { localTerrainHorizon, demHeight, REGIONAL_RANGE_M } from '../src/science/terrain.ts';
const metadata = JSON.parse(readFileSync(new URL('../src/science/regionalMetadata.json', import.meta.url),'utf8'));
const localMetadata = JSON.parse(readFileSync(new URL('../src/science/terrainMetadata.json', import.meta.url),'utf8'));
const localGrid = () => ({width:401,height:401,x0:-4000,y0:4000,spacingM:20,radiusM:1737400,data:new Float32Array(401*401)});
const regionalGrid = () => ({width:3001,height:3001,x0:-120000,y0:120000,spacingM:80,radiusM:1737400,data:new Float32Array(3001*3001)});

test('a ridge beyond 3 km raises the combined horizon without changing the local profile', () => {
  const local=localGrid(), regional=regionalGrid(), site={latitude:-90,longitude:0};
  // Plateau around y=10 km, wide enough to be crossed by a sampled ray.
  for(let r=1370;r<=1380;r++) for(let c=1490;c<=1510;c++) regional.data[r*regional.width+c]=500;
  const result=localTerrainHorizon(local,site,regional);
  assert.equal(result.rangeM,100000);
  assert.ok(result.localSamples.every(s=>s.elevation===0));
  assert.ok(result.samples[0].elevation>2.5 && result.samples[0].elevation<3.1);
  assert.equal(result.samples[360].elevation,0);
  assert.ok(result.samples.every((s,i)=>s.elevation>=result.localSamples[i].elevation));
});
test('spherical curvature keeps a low distant ridge below the observer horizontal', () => {
  const regional=regionalGrid();
  for(let r=250;r<=260;r++) regional.data.fill(500,r*regional.width,(r+1)*regional.width);
  const result=localTerrainHorizon(localGrid(),{latitude:-90,longitude:0},regional);
  assert.ok(result.samples.every(s=>s.elevation===0));
});
test('regional gaps, coverage edges and mismatched reference spheres fail instead of returning partial horizons', () => {
  const grid=localGrid(), site={latitude:-90,longitude:0};
  assert.throws(()=>localTerrainHorizon(grid,site,{...grid,spacingM:80}),/terrain-nodata/);
  const bad=regionalGrid(); bad.data.fill(NaN);
  assert.throws(()=>localTerrainHorizon(grid,site,bad),/terrain-nodata/);
  assert.throws(()=>localTerrainHorizon(grid,site,{...bad,radiusM:1700000}),/terrain-regional-grid/);
});
test('official regional derivative retains native spacing, scaling and valid full ray coverage at Shackleton', () => {
  const bytes=readFileSync(new URL('../public/terrain/south-pole-80m.i16',import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),metadata.sha256);
  assert.equal(bytes.length,metadata.width*metadata.height*2);
  assert.equal(metadata.spacingM,80); assert.equal(metadata.scaleM,0.5);
  assert.equal(metadata.rangeM,REGIONAL_RANGE_M);
  const regional={...metadata,data:Float32Array.from({length:bytes.length/2},(_,i)=>bytes.readInt16LE(i*2)*metadata.scaleM)};
  const localBytes=readFileSync(new URL('../public/terrain/shackleton-20m.f32',import.meta.url));
  const local={...localMetadata,data:Float32Array.from({length:localBytes.length/4},(_,i)=>localBytes.readFloatLE(i*4))};
  assert.ok(Number.isFinite(demHeight(regional,localMetadata.demo)));
  const result=localTerrainHorizon(local,localMetadata.demo,regional);
  assert.equal(result.rangeM,100000);
  assert.ok(result.samples.every((s,i)=>Number.isFinite(s.elevation)&&s.elevation>=result.localSamples[i].elevation));
  assert.ok(result.samples.some((s,i)=>s.elevation>result.localSamples[i].elevation+0.01));
});
