import { Clock3 } from 'lucide-react';
import type { AnalysisPeriod } from '../models';
import { durationDays, periodError, utcMillis, withDuration } from '../lib/period';
export function TimePanel({ period, onChange }: { period: AnalysisPeriod; onChange: (p: AnalysisPeriod) => void }) {
  const error = periodError(period), days = durationDays(period);
  return <section className="section-block time-panel" aria-labelledby="time-title">
    <div className="section-heading"><h2 id="time-title"><span className="step">02</span> Periodo de análisis</h2><span className="micro-badge">UTC</span></div>
    <label>Inicio<input aria-label="Fecha y hora de inicio UTC" type="datetime-local" value={period.start} onInput={e => onChange({ ...period, start: e.currentTarget.value })} onChange={e => onChange({ ...period, start: e.target.value })}/></label>
    <label>Fin<input aria-label="Fecha y hora de finalización UTC" type="datetime-local" value={period.end} onInput={e => onChange({ ...period, end: e.currentTarget.value })} onChange={e => onChange({ ...period, end: e.target.value })}/></label>
    <div className="quick-periods">{[1, 7, 14, 30].map(d => <button key={d} disabled={!Number.isFinite(utcMillis(period.start))} className={!error && days === d ? 'selected' : ''} onClick={() => onChange({ ...period, end: withDuration(period.start, d) })}>{d === 1 ? '24 horas' : `${d} días`}</button>)}</div>
    {error ? <p className="error" role="alert">{error}</p> : <p className="duration"><Clock3 size={13}/> {Number(days.toFixed(2))} {days === 1 ? 'día' : 'días'} de observación <span>· UTC</span></p>}
  </section>;
}
