import { Clock3 } from 'lucide-react';
import type { AnalysisPeriod, ComparisonReport } from '../models';
import { periodError } from '../lib/period';
export function Timeline({ period, report, onOpenReport }: { period: AnalysisPeriod; report?: ComparisonReport; onOpenReport: () => void }) {
  const valid = !periodError(period);
  return <section className="timeline" aria-label="Ventana temporal del análisis">
    <div className="timeline-heading"><span><Clock3 size={14}/> Ventana de observación</span>{report ? <button className="report-reopen" onClick={onOpenReport}>Ver informe · paso {report.methodology?.stepMinutes} min</button> : <span className="timeline-pending">Ejecuta el análisis para calcular</span>}</div>
    <div className="timeline-track"><span/><span/><span/><span/><span/><span/><span/><span/><span/></div>
    <div className="timeline-labels"><time>{valid ? period.start.replace('T', ' · ') + ' UTC' : 'Inicio inválido'}</time><span>{report ? 'Modelo esférico' : 'Efemérides disponibles'}</span><time>{valid ? period.end.replace('T', ' · ') + ' UTC' : 'Fin inválido'}</time></div>
  </section>;
}
