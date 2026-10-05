export function clampTime(time: number, start: number, end: number) {
  return Math.max(start, Math.min(end, time));
}
export function advanceTime(time: number, elapsedMs: number, hoursPerSecond: number, end: number) {
  return Math.min(end, time + Math.max(0, elapsedMs) * hoursPerSecond * 3600);
}
export function formatInstant(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 19).replace('T', ' · ') + ' UTC';
}
