import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextEvents, remainingTime } from '../src/science/nextEvents.ts';
import { visibilityStatistics } from '../src/science/statistics.ts';
test('next events exclude clipped endpoints and already reached transitions', () => {
  const windows = [{ start: 0, end: 10, visible: true }, { start: 10, end: 20, visible: false }, { start: 20, end: 30, visible: true }];
  assert.deepEqual(nextEvents(windows, 0), { rise: 20, set: 10 });
  assert.deepEqual(nextEvents(windows, 10), { rise: 20, set: null });
  assert.deepEqual(nextEvents(windows, 30), { rise: null, set: null });
  assert.deepEqual(nextEvents([windows[0]], 0), { rise: null, set: null });
});
test('communication threshold events differ from Earth horizon events', () => {
  const samples = [{ time: 0, altitude: 10 }, { time: 100, altitude: -10 }];
  assert.equal(nextEvents(visibilityStatistics(samples).windows, 0).set, 50);
  assert.equal(nextEvents(visibilityStatistics(samples.map(s => ({ ...s, altitude: s.altitude - 5 }))).windows, 0).set, 25);
});
test('tangency is not a rise/set and short remaining times round upward', () => {
  const windows = visibilityStatistics([{ time: 0, altitude: 1 }, { time: 10, altitude: 0 }, { time: 20, altitude: 1 }]).windows;
  assert.deepEqual(nextEvents(windows, 0), { rise: null, set: null });
  assert.deepEqual(remainingTime(1, 0), { days: 0, hours: 0, minutes: 1 });
  assert.deepEqual(remainingTime(90060000, 0), { days: 1, hours: 1, minutes: 1 });
});
