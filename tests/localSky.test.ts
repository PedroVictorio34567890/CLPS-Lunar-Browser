import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localSky } from '../src/science/localSky.ts';
import { elevation, lunarEphemeris, LUNAR_RADIUS_KM } from '../src/science/ephemeris.ts';

test('local sky uses north/east azimuths and subtracts the surface observer', () => {
  const site = { latitude: 0, longitude: 0 }, r = LUNAR_RADIUS_KM;
  for (const [body, azimuth] of [ [[r, 0, r], 0], [[r, r, 0], 90], [[r, 0, -r], 180], [[r, -r, 0], 270] ] as const) {
    const sky = localSky(site, [...body]);
    assert.equal(sky.azimuth, azimuth); assert.equal(sky.elevation, 0);
  }
  assert.equal(localSky(site, [2 * r, 0, 0]).elevation, 90);
  assert.equal(localSky(site, [2 * r, 0, 0]).azimuth, null);
  assert.equal(localSky(site, [-r, 0, 0]).elevation, -90);
});

test('surface view agrees with report elevations across poles, dates and longitudes', () => {
  for (const latitude of [-90, -89.9, -85, 0, 90]) for (const longitude of [-180, 0, 120]) {
    const site = { latitude, longitude };
    for (const timestamp of [Date.UTC(2026, 8, 27), Date.UTC(2026, 9, 4), Date.UTC(2026, 9, 18)]) {
      const bodies = lunarEphemeris(timestamp);
      for (const body of [bodies.sun, bodies.earth]) {
        const sky = localSky(site, body);
        assert.ok(Math.abs(sky.elevation - elevation(site, body)) < 1e-9);
        assert.ok(sky.position.every(Number.isFinite));
        const renderedElevation = Math.asin(sky.position[1] / Math.hypot(...sky.position)) * 180 / Math.PI;
        assert.ok(Math.abs(renderedElevation - sky.elevation) < 1e-9);
        if (sky.azimuth !== null) assert.ok(sky.azimuth >= 0 && sky.azimuth < 360);
      }
    }
  }
});
