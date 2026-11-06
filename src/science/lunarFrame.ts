import type { Vec3 } from './ephemeris.ts';

export interface FrameGrid { startTtDays: number; stepDays: number; count: number }
const DAY = 86400000;
const J2000 = Date.UTC(2000, 0, 1, 12);
// NAIF0012 leap-second table within the supported period. Future TAI−UTC
// is held at 37 seconds until a new leap-second table is published/imported.
const leaps = [
  [Date.UTC(2000, 0, 1), 32], [Date.UTC(2006, 0, 1), 33],
  [Date.UTC(2009, 0, 1), 34], [Date.UTC(2012, 6, 1), 35],
  [Date.UTC(2015, 6, 1), 36], [Date.UTC(2017, 0, 1), 37],
];
export function utcToTtDays(timestamp: number): number {
  if (!Number.isFinite(timestamp) || timestamp < Date.UTC(2000, 0, 1) || timestamp > Date.UTC(2050, 0, 1)) throw new Error('frame-date-range');
  const offset = leaps.filter(([date]) => timestamp >= date).at(-1)![1];
  return (timestamp - J2000 + (offset + 32.184) * 1000) / DAY;
}

/** SPICE scalar-first Hamilton quaternion; shortest-arc SLERP in TT. */
export function frameQuaternion(grid: FrameGrid, data: Float64Array, ttDays: number): number[] {
  const index = (ttDays - grid.startTtDays) / grid.stepDays;
  if (!Number.isFinite(index) || index < 0 || index > grid.count - 1 || data.length !== grid.count * 4) throw new Error('frame-coverage');
  const i = Math.min(Math.floor(index), grid.count - 2), t = index - i;
  const a = Array.from(data.subarray(i * 4, i * 4 + 4)), b = Array.from(data.subarray((i + 1) * 4, (i + 2) * 4));
  let dot = a.reduce((sum, x, k) => sum + x * b[k], 0);
  if (dot < 0) { b.forEach((v, k) => { b[k] = -v; }); dot = -dot; }
  const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
  const left = angle < 1e-8 ? 1 - t : Math.sin((1 - t) * angle) / Math.sin(angle);
  const right = angle < 1e-8 ? t : Math.sin(t * angle) / Math.sin(angle);
  const q = a.map((v, k) => left * v + right * b[k]), length = Math.hypot(...q);
  if (!Number.isFinite(length) || length < 0.5) throw new Error('frame-quaternion');
  return q.map(v => v / length);
}

export function rotateToMoonME(q: number[], v: Vec3): Vec3 {
  const [w, x, y, z] = q;
  return [
    (1-2*(y*y+z*z))*v[0] + 2*(x*y-z*w)*v[1] + 2*(x*z+y*w)*v[2],
    2*(x*y+z*w)*v[0] + (1-2*(x*x+z*z))*v[1] + 2*(y*z-x*w)*v[2],
    2*(x*z-y*w)*v[0] + 2*(y*z+x*w)*v[1] + (1-2*(x*x+y*y))*v[2],
  ];
}
