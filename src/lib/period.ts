import type { AnalysisPeriod } from '../models.ts';
export function utcMillis(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return NaN;
  const timestamp = Date.parse(`${value}:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 16) === value ? timestamp : NaN;
}
export function periodError(period: AnalysisPeriod): string | null {
  const start = utcMillis(period.start), end = utcMillis(period.end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 'Introduce ambas fechas y horas válidas.';
  if (end <= start) return 'El final debe ser posterior al inicio.';
  if (start < Date.UTC(2000, 0, 1) || end > Date.UTC(2100, 0, 1)) return 'El modelo admite fechas entre 2000 y 2100.';
  if (end - start > 90 * 86400000) return 'El periodo máximo de esta versión es de 90 días.';
  return null;
}
export function withDuration(start: string, days: number): string {
  const ms = utcMillis(start);
  return Number.isFinite(ms) ? new Date(ms + days * 86400000).toISOString().slice(0, 16) : '';
}
export function durationDays(period: AnalysisPeriod) { return (utcMillis(period.end) - utcMillis(period.start)) / 86400000; }
