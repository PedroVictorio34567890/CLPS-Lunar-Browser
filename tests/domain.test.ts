import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cartesianToGeographic, geographicToCartesian, isSouthPolar, validCoordinates } from '../src/lib/coordinates.ts';
import { periodError, withDuration, utcMillis } from '../src/lib/period.ts';
import { appendSite, MAX_SITES } from '../src/lib/sites.ts';
import { pendingEngine } from '../src/science/engine.ts';
import type { CandidateSite } from '../src/models.ts';
test('coordinate axes match the NASA map: north +Y, 0° +X, east -Z', () => {
  const near = (a: number[], b: number[]) => a.forEach((value, i) => assert.ok(Math.abs(value - b[i]) < 1e-10));
  near(geographicToCartesian({ latitude: 0, longitude: 0 }), [1, 0, 0]);
  near(geographicToCartesian({ latitude: 0, longitude: 90 }), [0, 0, -1]);
  near(geographicToCartesian({ latitude: -90, longitude: 0 }), [0, -1, 0]);
  near(geographicToCartesian({ latitude: 0, longitude: 180 }), [-1, 0, 0]);
});
test('round trips remain precise near poles and across the longitude seam', () => {
  for (const latitude of [-89.999, -85, -80, -45, 0, 45, 89.999]) for (const longitude of [-180, -179.99, -90, 0, 90, 179.99, 180]) {
    const actual = cartesianToGeographic(geographicToCartesian({ latitude, longitude }, 3));
    assert.ok(Math.abs(actual.latitude - latitude) < 1e-8);
    assert.ok(Math.abs(actual.longitude - longitude) < 1e-8);
  }
});
test('rejects invalid coordinates and zero vectors; polar boundary is inclusive', () => {
  assert.equal(validCoordinates({ latitude: NaN, longitude: 0 }), false);
  assert.equal(validCoordinates({ latitude: -91, longitude: 0 }), false);
  assert.equal(validCoordinates({ latitude: 0, longitude: 181 }), false);
  assert.equal(isSouthPolar({ latitude: -80, longitude: 0 }), true);
  assert.equal(isSouthPolar({ latitude: -79.999, longitude: 0 }), false);
  assert.throws(() => cartesianToGeographic([0, 0, 0]));
});
test('candidate cap cannot be exceeded and deleted colors can be reused uniquely', () => {
  let sites: CandidateSite[] = [];
  for (let i = 0; i < 10; i++) sites = appendSite(sites, { latitude: -85, longitude: i }, String(i));
  assert.equal(sites.length, MAX_SITES);
  assert.equal(new Set(sites.map(s => s.color)).size, MAX_SITES);
  sites = sites.filter(s => s.slot !== 3);
  sites = appendSite(sites, { latitude: -86, longitude: 0 }, 'replacement');
  assert.equal(sites.at(-1)!.slot, 3);
  assert.equal(new Set(sites.map(s => s.color)).size, MAX_SITES);
  const invalid = appendSite([], { latitude: Infinity, longitude: 0 }, 'bad');
  assert.equal(invalid.length, 0);
});
test('UTC intervals reject equal, reversed, empty and invalid calendar dates', () => {
  for (const end of ['2026-09-27T00:00', '2026-09-26T00:00', '', '2026-02-30T00:00']) assert.ok(periodError({ start: '2026-09-27T00:00', end }));
  assert.ok(Number.isNaN(utcMillis('2026-02-30T00:00')));
  assert.equal(periodError({ start: '2026-09-27T00:00', end: '2026-09-28T00:00' }), null);
});
test('quick durations cross month, year, leap day and DST without local-time drift', () => {
  assert.equal(withDuration('2026-12-31T23:30', 1), '2027-01-01T23:30');
  assert.equal(withDuration('2028-02-28T06:00', 1), '2028-02-29T06:00');
  assert.equal(withDuration('2026-03-28T12:00', 1), '2026-03-29T12:00');
  assert.equal(withDuration('', 7), '');
});
test('science adapter returns only pending metrics and immutable input snapshots', async () => {
  const sites = appendSite([], { latitude: -70, longitude: 20 }, 'site');
  const period = { start: '2026-09-27T00:00', end: '2026-10-04T00:00' };
  const report = await pendingEngine.compare(sites, period);
  for (const key of ['sunlightPercent', 'longestLightHours', 'longestDarkHours', 'earthVisibilityPercent', 'longestCommunicationOutageHours', 'viabilityScore'] as const) assert.deepEqual(report.sites[0][key], { status: 'pending', value: null });
  assert.equal(report.sites[0].recommendation, null);
  assert.equal(report.sites[0].warnings.length, 2);
  sites[0].latitude = 0; period.end = '';
  assert.equal(report.sites[0].site.latitude, -70);
  assert.equal(report.period.end, '2026-10-04T00:00');
  await assert.rejects(pendingEngine.compare([], report.period));
  await assert.rejects(pendingEngine.compare(sites, period));
});
