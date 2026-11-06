import { test } from 'node:test';
import assert from 'node:assert/strict';
import { terrainSkyAt, horizonSilhouette } from '../src/science/terrainView.ts';
import type { TerrainSkySample } from '../src/models.ts';

test('terrain sky reproduces samples, interpolates across north and never extrapolates', () => {
  const samples: TerrainSkySample[] = [
    {time:0,sun:[-1,0,-100],earth:[0,20,-100]},
    {time:300000,sun:[1,0,-100],earth:[0,40,-100]},
  ];
  assert.deepEqual(terrainSkyAt(samples,0)!.sun.position,samples[0].sun);
  assert.deepEqual(terrainSkyAt(samples,300000)!.earth.position,samples[1].earth);
  assert.equal(terrainSkyAt(samples,150000)!.sun.azimuth,0);
  assert.equal(terrainSkyAt(samples,150000)!.sun.elevation,0);
  assert.ok(Math.abs(terrainSkyAt(samples,150000)!.earth.elevation-Math.atan2(30,100)*180/Math.PI)<1e-10);
  for(const time of [-1,300001,NaN]) assert.equal(terrainSkyAt(samples,time),null);
  assert.equal(terrainSkyAt([],0),null);
});
test('terrain silhouette follows cardinal azimuths, heights and closes the north seam', () => {
  const mesh=horizonSilhouette([{azimuth:0,elevation:30},{azimuth:90,elevation:0},{azimuth:180,elevation:10},{azimuth:270,elevation:0}]);
  assert.equal(mesh.positions.length,4*6*3);
  assert.deepEqual(mesh.outline[0],mesh.outline.at(-1));
  assert.ok(Math.abs(mesh.outline[0][1]-5)<1e-12);
  assert.ok(mesh.outline[0][2]<0);
  assert.ok(mesh.outline[1][0]>9.99);
  assert.ok(mesh.outline[2][2]>0);
  assert.ok(mesh.outline[3][0]<-9.99);
  for(const point of mesh.outline) assert.ok(Math.abs(Math.hypot(...point)-10)<1e-12);
});
