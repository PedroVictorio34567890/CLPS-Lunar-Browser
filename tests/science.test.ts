import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { elevation, lunarEphemeris, LUNAR_RADIUS_KM } from '../src/science/ephemeris.ts';
import { exploratoryScore, visibilityStatistics } from '../src/science/statistics.ts';
import { sphericalEngine } from '../src/science/sphericalEngine.ts';
import { appendSite } from '../src/lib/sites.ts';
import { periodError } from '../src/lib/period.ts';

test('independent JPL Horizons reference: eight dates, subsolar and sub-Earth coordinates within 0.05°', () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/horizons-lunar-2026.json', import.meta.url), 'utf8'));
  const lines = fixture.result.split('$$SOE')[1].split('$$EOE')[0].trim().split('\n');
  assert.equal(lines.length, 8);
  for (let i = 0; i < lines.length; i++) {
    const values = lines[i].split(',').map((s: string) => s.trim());
    const vectors = lunarEphemeris(Date.UTC(2026, 8, 27 + i));
    for (const [name, lon, lat] of [['earth', +values[3], +values[4]], ['sun', +values[5], +values[6]]] as const) {
      const v = vectors[name];
      const actualLon = Math.atan2(v[1], v[0]) * 180 / Math.PI;
      const actualLat = Math.asin(v[2] / Math.hypot(...v)) * 180 / Math.PI;
      const longitudeError = Math.abs(((actualLon - lon + 540) % 360) - 180);
      assert.ok(longitudeError < 0.05, `${values[0]} ${name} longitude: ${longitudeError}`);
      assert.ok(Math.abs(actualLat - lat) < 0.05, `${values[0]} ${name} latitude`);
    }
  }
});

test('surface elevation includes observer displacement and respects east-positive longitude', () => {
  assert.equal(elevation({ latitude: 0, longitude: 0 }, [384400, 0, 0]), 90);
  assert.equal(elevation({ latitude: 0, longitude: 180 }, [384400, 0, 0]), -90);
  const atGeocentricLimb = elevation({ latitude: 0, longitude: 90 }, [384400, 0, 0]);
  assert.ok(atGeocentricLimb < -0.25 && atGeocentricLimb > -0.27);
  assert.ok(Math.abs(elevation({ latitude: 0, longitude: 0 }, [LUNAR_RADIUS_KM, 384400, 0])) < 1e-9);
  assert.ok(elevation({ latitude: 0, longitude: 90 }, [0, 384400, 0]) > 89.99);
  assert.ok(elevation({ latitude: -90, longitude: 123 }, [0, 0, -384400]) > 89.99);
});

test('interpolates crossings, integrates elapsed time and clips runs at the window boundaries', () => {
  const hour = 3600000;
  const result = visibilityStatistics([{ time: 0, altitude: -1 }, { time: hour, altitude: 1 }, { time: 3 * hour, altitude: 1 }, { time: 4 * hour, altitude: -1 }]);
  assert.equal(result.percent, 75);
  assert.equal(result.longestVisibleHours, 3);
  assert.equal(result.longestHiddenHours, 0.5);
  assert.equal(result.windows.length, 3);
});

test('handles constant visibility, exact horizon and partial final steps', () => {
  const full = visibilityStatistics([{ time: 0, altitude: 1 }, { time: 300000, altitude: 1 }, { time: 360000, altitude: 1 }]);
  assert.equal(full.percent, 100);
  assert.equal(full.longestVisibleHours, 0.1);
  assert.equal(full.longestHiddenHours, 0);
  const horizon = visibilityStatistics([{ time: 0, altitude: 0 }, { time: 60000, altitude: 0 }]);
  assert.equal(horizon.percent, 0);
  const tangent = visibilityStatistics([{ time: 0, altitude: 1 }, { time: 60000, altitude: 0 }, { time: 120000, altitude: 1 }]);
  assert.equal(tangent.percent, 100);
  assert.equal(tangent.windows.length, 1);
});

test('full lunation: near side sees Earth, far side does not; solar day/night alternate', async () => {
  let sites = appendSite([], { latitude: 0, longitude: 0 }, 'near');
  sites = appendSite(sites, { latitude: 0, longitude: 180 }, 'far');
  sites = appendSite(sites, { latitude: -89, longitude: 0 }, 'polar');
  const report = await sphericalEngine.compare(sites, { start: '2026-09-27T00:00', end: '2026-10-27T00:00' });
  assert.equal(report.engine, 'spherical-v1');
  assert.equal(report.methodology!.sampleCount, 8641);
  assert.equal(report.sites[0].earthVisibilityPercent.value, 100);
  assert.equal(report.sites[1].earthVisibilityPercent.value, 0);
  assert.equal(report.sites[1].longestCommunicationOutageHours.value, 720);
  for (const site of report.sites) {
    for (const key of ['sunlightPercent', 'earthVisibilityPercent', 'viabilityScore'] as const) {
      assert.equal(site[key].status, 'calculated');
      assert.ok(site[key].value! >= 0 && site[key].value! <= 100);
    }
    assert.ok(site.longestLightHours.value! + site.longestDarkHours.value! <= 720 + 1e-9);
    assert.equal(site.series!.samples.at(-1)!.time, Date.parse('2026-10-27T00:00Z'));
  }
  assert.ok(report.sites[0].sunlightPercent.value! > 45 && report.sites[0].sunlightPercent.value! < 55);
  assert.ok(report.sites[2].warnings.some(w => w.includes('1°')));
});

test('short intervals have exact endpoints and reports do not alias user inputs', async () => {
  const sites = appendSite([], { latitude: -85, longitude: 0 }, 'site');
  const period = { start: '2026-09-27T00:00', end: '2026-09-27T00:01' };
  const report = await sphericalEngine.compare(sites, period);
  assert.equal(report.methodology!.sampleCount, 2);
  sites[0].latitude = 20; period.end = '';
  assert.equal(report.sites[0].site.latitude, -85);
  assert.equal(report.period.end, '2026-09-27T00:01');
});

test('score has explicit equal weighting and invalid scientific inputs are rejected', async () => {
  assert.equal(exploratoryScore(100, 0), 50);
  assert.equal(exploratoryScore(20, 80), 50);
  assert.equal(exploratoryScore(100, 100), 100);
  const site = appendSite([], { latitude: -85, longitude: 0 }, 'site');
  const period = { start: '2026-09-27T00:00', end: '2026-10-04T00:00' };
  await assert.rejects(sphericalEngine.compare([], period));
  await assert.rejects(sphericalEngine.compare([{ ...site[0], latitude: NaN }], period));
  await assert.rejects(sphericalEngine.compare(Array(9).fill(site[0]), period));
  assert.ok(periodError({ start: '1999-12-31T00:00', end: '2000-01-02T00:00' }));
  assert.ok(periodError({ start: '2026-01-01T00:00', end: '2026-05-01T00:00' }));
});
