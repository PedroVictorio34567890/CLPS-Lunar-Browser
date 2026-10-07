import { useEffect, useRef } from 'react';
import { X, Sun, Radio, Mountain, Info } from 'lucide-react';
import type { ComparisonReport, Metric } from '../models';
import { formatCoordinates } from '../lib/coordinates';
import { CommunicationAssessment } from './CommunicationAssessment';
import { AnalysisSeries } from './AnalysisSeries';
function MetricRow({ label, metric, unit }: { label: string; metric: Metric; unit: string }) {
  return <div className="metric"><span>{label}</span><strong>{metric.status === 'pending' ? 'Pendiente de cálculo' : `${metric.value.toLocaleString('es-ES', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} ${unit}`}</strong></div>;
}
export function ComparisonPanel({ report, onClose }: { report: ComparisonReport; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current!; const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; element.showModal(); return () => { element.close(); document.body.style.overflow = overflow; }; }, []);
  return <dialog ref={dialog} className="comparison-panel" aria-labelledby="comparison-title" onCancel={onClose}>
    <div className="comparison-heading"><div><div className="eyebrow">INFORME DE MISIÓN</div><h2 id="comparison-title">Comparar lugares<span>{report.sites.length}</span></h2></div><button autoFocus className="icon-button" aria-label="Cerrar comparación" onClick={onClose}><X size={21}/></button></div>
    <div className="report-intro"><Info size={17}/><p>{report.engine === 'pending' ? 'Motor científico pendiente.' : 'Estimaciones con efemérides sobre una Luna esférica. Sin sombras del relieve: especialmente importantes en los polos. Visibilidad del centro terrestre: no garantiza un enlace de radio.'}</p></div>
    <p className="report-period">{report.period.start.replace('T', ' ')} → {report.period.end.replace('T', ' ')} UTC</p>
    {report.mission && <details className="methodology"><summary>Requisitos usados · comunicaciones prioritarias</summary><p>Ejemplos editables capturados al analizar; no son requisitos NASA.</p><p>Elevación terrestre &gt; {report.mission.minEarthElevationDeg}° · disponibilidad ≥ {report.mission.minAvailabilityPercent}% · interrupción ≤ {report.mission.maxOutageHours} h.</p><p>Energía, pendiente de simulación: operación {report.mission.operatingPowerW} W · reposo {report.mission.standbyPowerW} W · paneles {report.mission.solarPowerW} W ({report.mission.panelMode === 'fixed' ? 'fijos, geometría pendiente' : 'seguimiento solar'}) · batería {report.mission.batteryWh} Wh · carga inicial {report.mission.initialChargePercent}% · reserva {report.mission.reservePercent}%.</p></details>}
    {report.methodology && <details className="methodology"><summary>Modelo, precisión e índice exploratorio</summary><p>{report.methodology.ephemeris}</p><p>{report.methodology.sampleCount.toLocaleString('es-ES')} muestras por lugar · paso máximo {report.methodology.stepMinutes} min.</p><p><strong>{report.methodology.scoreFormula}</strong></p><ul>{report.methodology.assumptions.map(a => <li key={a}>{a}</li>)}</ul><a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noreferrer">Astronomy Engine ↗</a> · <a href="https://ssd.jpl.nasa.gov/horizons/manual.html" target="_blank" rel="noreferrer">Referencia de contraste: JPL Horizons ↗</a></details>}
    {report.sites.map(r => <article key={r.site.id} className="report-card" style={{ borderTopColor: r.site.color }}>
      <header><span className="site-number" style={{ color: r.site.color, backgroundColor: `${r.site.color}15` }}>{r.site.slot + 1}</span><div><h3>Lugar {String(r.site.slot + 1).padStart(2, '0')}</h3><span className="coords">{formatCoordinates(r.site)}</span></div></header>
      {report.mission && <><h4><Radio size={14}/> Prioridad: requisitos de comunicación</h4><CommunicationAssessment site={r} mission={report.mission}/></>}
      <h4><Sun size={14}/> Iluminación solar</h4>
      <MetricRow label="Tiempo con luz solar" metric={r.sunlightPercent} unit="%"/><MetricRow label="Máximo continuo con luz" metric={r.longestLightHours} unit="h"/><MetricRow label="Máximo continuo en oscuridad" metric={r.longestDarkHours} unit="h"/>
      <h4><Radio size={14}/> Referencia geométrica · horizonte de 0°</h4>
      <MetricRow label="Visibilidad directa" metric={r.earthVisibilityPercent} unit="%"/><MetricRow label="Interrupción más larga" metric={r.longestCommunicationOutageHours} unit="h"/>
      <div className="score"><MetricRow label="Índice luz/visibilidad · no evalúa requisitos" metric={r.viabilityScore} unit="/ 100"/></div>
      {r.series && <AnalysisSeries series={r.series}/>}
      <div className="report-warnings"><strong>Advertencias</strong>{r.warnings.map(w => <p key={w}>{w}</p>)}</div>
      <p className="recommendation"><strong>Recomendación final</strong><span>{report.mission ? 'Prioriza los umbrales de comunicación indicados arriba. Antes de elegir, valida relieve, estaciones y enlace de radio; la energía aún no está evaluada.' : r.recommendation ?? 'Pendiente de cálculo'}</span></p>
      <div className="horizon"><Mountain size={22}/><div><strong>Horizonte con relieve</strong><span>DEM, sombras y obstáculos locales pendientes</span></div><span className="micro-badge">PRÓXIMAMENTE</span></div>
    </article>)}
  </dialog>;
}
