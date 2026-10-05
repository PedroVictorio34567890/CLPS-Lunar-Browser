import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advanceTime, clampTime, formatInstant } from '../src/lib/playback.ts';
import { sceneEphemeris, toSceneVector } from '../src/science/sceneEphemeris.ts';
import { elevation, lunarEphemeris, LUNAR_RADIUS_KM } from '../src/science/ephemeris.ts';
import { geographicToCartesian } from '../src/lib/coordinates.ts';

test('display directions agree with scientific surface elevations, including polar and far-side sites', () => {
  for (const date of [Date.UTC(2026, 8, 27), Date.UTC(2026, 9, 4), Date.UTC(2026, 9, 18)]) {
    const scientific = lunarEphemeris(date), display = sceneEphemeris(date);
    for (const site of [{ latitude: -89, longitude: 40 }, { latitude: 0, longitude: 180 }, { latitude: 20, longitude: -70 }]) {
      const normal = geographicToCartesian(site, 1);
      for (const name of ['sun', 'earth'] as const) {
        const los = display[name].map((v, i) => v - normal[i]);
        const angle = Math.asin(los.reduce((sum, v, i) => sum + v * normal[i], 0) / Math.hypot(...los)) * 180 / Math.PI;
        assert.ok(Math.abs(angle - elevation(site, scientific[name])) < 1e-9);
        assert.ok(Math.abs(Math.hypot(...display[name]) * LUNAR_RADIUS_KM - Math.hypot(...scientific[name])) < 1e-6);
      }
    }
  }
  assert.deepEqual(toSceneVector([0, LUNAR_RADIUS_KM, 0]), [0, 0, -1]);
});

test('dated scene moves Sun and Earth over the selected week', () => {
  const first = sceneEphemeris(Date.UTC(2026, 8, 27));
  const last = sceneEphemeris(Date.UTC(2026, 9, 4));
  for (const name of ['sun', 'earth'] as const) assert.notDeepEqual(first[name], last[name]);
});

test('playback speed uses elapsed wall time and stops exactly at the endpoint', () => {
  const start = Date.UTC(2026, 8, 27), end = start + 86400000;
  assert.equal(advanceTime(start, 1000, 6, end), start + 6 * 3600000);
  assert.equal(advanceTime(start, 2000, 24, end), end);
  assert.equal(advanceTime(start, -100, 6, end), start);
  assert.equal(clampTime(start - 1, start, end), start);
  assert.equal(clampTime(end + 1, start, end), end);
  assert.equal(formatInstant(start), '2026-09-27 · 00:00:00 UTC');
});
