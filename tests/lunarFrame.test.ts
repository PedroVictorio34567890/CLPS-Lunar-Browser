import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { frameQuaternion, rotateToMoonME, utcToTtDays } from '../src/science/lunarFrame.ts';
import { inertialLunarEphemeris, lunarEphemeris } from '../src/science/ephemeris.ts';
import type { Vec3 } from '../src/science/ephemeris.ts';
const metadata = JSON.parse(readFileSync(new URL('../src/science/frameMetadata.json', import.meta.url), 'utf8'));
const bytes = readFileSync(new URL('../public/terrain/moon-me-de421.f64', import.meta.url));
const data = Float64Array.from({length: bytes.length / 8}, (_, i) => bytes.readDoubleLE(i * 8));
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/moon-me-de421.json', import.meta.url), 'utf8')) as {ttDays:number; matrix:number[][]}[];

test('orientation binary is the verified SPICE-derived table', () => {
  assert.equal(createHash('sha256').update(bytes).digest('hex'), metadata.sha256);
  assert.equal(data.length, metadata.count * 4);
  assert.ok(metadata.maxMidpointErrorArcsec < 0.1);
  for (let i = 0; i < data.length; i += 4) assert.ok(Math.abs(Math.hypot(...data.subarray(i, i+4))-1) < 1e-12);
});
test('interpolated rotations agree with direct SPICE matrices at independent off-grid epochs', () => {
  for (const fixture of fixtures) {
    const q = frameQuaternion(metadata, data, fixture.ttDays);
    for (const vector of [[1,0,0], [0,1,0], [0,0,1], [0.3,-0.4,0.5]] as Vec3[]) {
      const expected = fixture.matrix.map(row => row.reduce((sum, x, i) => sum+x*vector[i], 0));
      const actual = rotateToMoonME(q, vector);
      const relativeError = Math.hypot(...actual.map((x,i)=>x-expected[i])) / Math.hypot(...vector);
      assert.ok(relativeError < 0.1 / 3600 * Math.PI / 180, `${fixture.ttDays}: ${relativeError}`);
      assert.ok(Math.abs(Math.hypot(...actual)-Math.hypot(...vector)) < 1e-12);
    }
  }
});
test('UTC to TT applies known leap seconds, rejects unsupported dates and invalid input', () => {
  assert.ok(Math.abs(utcToTtDays(Date.UTC(2000,0,1,12))*86400 - 64.184) < 1e-8);
  const t = Date.UTC(2017,0,1);
  assert.ok(Math.abs((utcToTtDays(t)-utcToTtDays(t-1000))*86400-2) < 1e-6);
  for (const value of [NaN, Infinity, Date.UTC(1999,11,31), Date.UTC(2050,0,1)+1]) assert.throws(()=>utcToTtDays(value));
  for (const value of [Date.UTC(2000,0,1), Date.UTC(2050,0,1)]) assert.doesNotThrow(()=>frameQuaternion(metadata,data,utcToTtDays(value)));
});
test('SLERP handles opposite quaternion signs, endpoints and refuses extrapolation', () => {
  const grid = {startTtDays:0, stepDays:1, count:2};
  const values = new Float64Array([1,0,0,0,-1,0,0,0]);
  for (const t of [0,0.5,1]) assert.deepEqual(rotateToMoonME(frameQuaternion(grid,values,t),[1,2,3]),[1,2,3]);
  for (const t of [-1,1.01,NaN]) assert.throws(()=>frameQuaternion(grid,values,t));
});
test('inertial vectors preserve spherical ephemeris distances before frame rotation', () => {
  const time = Date.UTC(2026,10,6), inertial = inertialLunarEphemeris(time), spherical = lunarEphemeris(time);
  for (const body of ['sun','earth'] as const) {
    const me = rotateToMoonME(frameQuaternion(metadata,data,utcToTtDays(time)),inertial[body]);
    assert.ok(Math.abs(Math.hypot(...me)/Math.hypot(...spherical[body])-1) < 1e-12);
  }
});
