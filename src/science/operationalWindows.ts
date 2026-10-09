import type { VisibilityWindow } from '../models.ts';

export type WindowCause = 'available' | 'geometry' | 'energy' | 'both';
export interface OperationalWindow { start: number; end: number; cause: WindowCause }

/** Intersect geometric access with full supply of the configured averaged load.
 * Half-open intervals avoid counting shared endpoints twice. Reserve is advisory.
 */
export function operationalWindows(geometry: VisibilityWindow[], deficits: { start: number; end: number }[]) {
  if (!geometry.length) throw new Error('Missing geometric windows');
  const start = geometry[0].start, end = geometry.at(-1)!.end;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error('Invalid interval');
  const events = new Map<number, { access: number; deficit: number }>();
  const add = (time: number, access: number, deficit: number) => {
    const previous = events.get(time) ?? { access: 0, deficit: 0 };
    events.set(time, { access: previous.access + access, deficit: previous.deficit + deficit });
  };
  add(start, 0, 0); add(end, 0, 0);
  let cursor = start;
  for (const window of geometry) {
    if (window.start !== cursor || !Number.isFinite(window.end) || window.end <= window.start) throw new Error('Invalid geometric windows');
    cursor = window.end;
    if (window.visible) { add(window.start, 1, 0); add(window.end, -1, 0); }
  }
  for (const window of deficits) {
    if (!Number.isFinite(window.start) || !Number.isFinite(window.end) || window.end <= window.start) throw new Error('Invalid energy interval');
    const lo = Math.max(start, window.start), hi = Math.min(end, window.end);
    if (hi > lo) { add(lo, 0, 1); add(hi, 0, -1); }
  }
  const times = [...events.keys()].sort((a, b) => a - b);
  const windows: OperationalWindow[] = [];
  let access = 0, deficit = 0;
  for (let i = 0; i < times.length - 1; i++) {
    const time = times[i], event = events.get(time)!;
    access += event.access; deficit += event.deficit;
    const cause: WindowCause = access > 0 ? (deficit > 0 ? 'energy' : 'available') : (deficit > 0 ? 'both' : 'geometry');
    const previous = windows.at(-1);
    if (previous?.cause === cause) previous.end = times[i + 1];
    else windows.push({ start: time, end: times[i + 1], cause });
  }
  let available = 0, lostToEnergy = 0, longestAvailable = 0;
  const outages: { start: number; end: number }[] = [];
  for (const window of windows) {
    const duration = window.end - window.start;
    if (window.cause === 'available') { available += duration; longestAvailable = Math.max(longestAvailable, duration); }
    else {
      if (window.cause === 'energy') lostToEnergy += duration;
      const previous = outages.at(-1);
      if (previous?.end === window.start) previous.end = window.end;
      else outages.push({ start: window.start, end: window.end });
    }
  }
  return { start, end, windows, outages, percent: available / (end - start) * 100,
    availableHours: available / 3600000, lostToEnergyHours: lostToEnergy / 3600000,
    longestAvailableHours: longestAvailable / 3600000,
    longestOutageHours: outages.reduce((max, window) => Math.max(max, window.end - window.start), 0) / 3600000 };
}
