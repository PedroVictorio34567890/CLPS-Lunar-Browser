import type { VisibilityWindow } from '../models.ts';

/** Integrate time, not sample counts. Crossings of the 0° horizon are linearly
 * interpolated. Boundary runs are clipped to the requested window.
 */
export function visibilityStatistics(samples: { time: number; altitude: number }[]) {
  if (samples.length < 2) throw new Error('Se necesitan al menos dos muestras.');
  const windows: VisibilityWindow[] = [];
  const append = (start: number, end: number, visible: boolean) => {
    if (end <= start) return;
    const previous = windows.at(-1);
    if (previous && previous.visible === visible) previous.end = end;
    else windows.push({ start, end, visible });
  };
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    if (b.time <= a.time || !Number.isFinite(a.altitude) || !Number.isFinite(b.altitude)) throw new Error('Serie temporal inválida.');
    const before = a.altitude > 0, after = b.altitude > 0;
    if (before === after) append(a.time, b.time, before);
    else {
      const crossing = a.time + (b.time - a.time) * -a.altitude / (b.altitude - a.altitude);
      append(a.time, crossing, before);
      append(crossing, b.time, after);
    }
  }
  const total = samples.at(-1)!.time - samples[0].time;
  let visibleTime = 0, longestVisible = 0, longestHidden = 0;
  for (const window of windows) {
    const duration = window.end - window.start;
    if (window.visible) { visibleTime += duration; longestVisible = Math.max(longestVisible, duration); }
    else longestHidden = Math.max(longestHidden, duration);
  }
  return { percent: visibleTime / total * 100, longestVisibleHours: longestVisible / 3600000, longestHiddenHours: longestHidden / 3600000, windows };
}

// Deliberately simple and disclosed. Not an engineering feasibility verdict.
export function exploratoryScore(sunlightPercent: number, earthVisibilityPercent: number) {
  return (sunlightPercent + earthVisibilityPercent) / 2;
}
