import { t, locale, useLanguage } from '../i18n';
import { useEffect, useRef } from 'react';
import { X, Sun, Radio, Info } from 'lucide-react';
import { RadioAssessment } from './RadioAssessment';
import { LandingAssessment } from './LandingAssessment';
import { DataAssessment } from './DataAssessment';
import { TerrainAssessment } from './TerrainAssessment';
import type { ComparisonReport, Metric } from '../models';
import { formatCoordinates } from '../i18n';
import { CommunicationAssessment } from './CommunicationAssessment';
import { OperationalAssessment } from './OperationalAssessment';
import { EnergyAssessment } from './EnergyAssessment';
import { AnalysisSeries } from './AnalysisSeries';
import { LanguageMenu } from './LanguageMenu';
import { ReportExport } from './ReportExport';
import { ReportOverview } from './ReportOverview';
function MetricRow({ label, metric, unit }: { label: string; metric: Metric; unit: string }) {
  useLanguage();
  return <div className="metric"><span>{label}</span><strong>{metric.status === 'pending' ? t("Pendiente de cálculo") : `${metric.value.toLocaleString(locale(), { maximumFractionDigits: 1, minimumFractionDigits: 1 })} ${unit}`}</strong></div>;
}
export function ComparisonPanel({ report, onClose }: { report: ComparisonReport; onClose: () => void }) {
  const en = useLanguage() === 'en';
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current!; const previousFocus = document.activeElement as HTMLElement | null; const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; element.showModal(); return () => { element.close(); document.body.style.overflow = overflow; previousFocus?.focus(); }; }, []);
  return <dialog ref={dialog} className="comparison-panel" aria-labelledby="comparison-title" onCancel={onClose}>
    <div className="report-language"><LanguageMenu/></div>
    <div className="comparison-heading"><div><div className="eyebrow">{t("INFORME DE MISIÓN")}</div><h2 id="comparison-title">{t("Comparar lugares")}<span>{report.sites.length}</span></h2></div><button autoFocus className="icon-button" aria-label={t("Cerrar comparación")} onClick={onClose}><X size={21}/></button></div>
    <div className="report-intro"><Info size={17}/><p>{report.engine === 'pending' ? t("Motor científico pendiente.") : (en ? 'LOLA terrain results appear first where covered; the spherical reference follows. Countdowns and scenario comparison use terrain where available. No model certifies a radio link.' : 'Los resultados con relieve LOLA aparecen primero donde hay cobertura; después se conserva la referencia esférica. Los contadores y el comparador de escenarios usan relieve donde está disponible. Ningún modelo certifica un enlace de radio.')}</p></div>
    <p className="report-period">{report.period.start.replace('T', ' ')} → {report.period.end.replace('T', ' ')} UTC</p>
    {report.mission && <details className="methodology"><summary>{t("Requisitos usados · comunicaciones prioritarias")}</summary><p>{t("Ejemplos editables capturados al analizar; no son requisitos NASA.")}</p><p>{t("Elevación terrestre >")} {report.mission.minEarthElevationDeg}{t("° · disponibilidad ≥")} {report.mission.minAvailabilityPercent}{t("% · interrupción ≤")} {report.mission.maxOutageHours} h.</p><p>{t("Energía: operación")} {report.mission.operatingPowerW}  {t("W · reposo")} {report.mission.standbyPowerW}  {t("W · paneles")} {report.mission.solarPowerW} W ({report.mission.panelMode === 'fixed' ? t("fijos") : t("seguimiento solar")}{t(") · batería")} {report.mission.batteryWh}  {t("Wh · carga inicial")} {report.mission.initialChargePercent}{t("% · reserva")} {report.mission.reservePercent}%.</p></details>}
    {report.mission && <p className="report-period">{t("Operación")}: {report.mission.operatingDutyPercent}% · {t("Factor útil")}: {report.mission.generationFactorPercent}%{report.mission.panelMode === 'fixed' && <> · {t("Inclinación")}: {report.mission.panelTiltDeg}° · {t("Azimut")}: {report.mission.panelAzimuthDeg}°</>}</p>}
    {report.methodology && <details className="methodology"><summary>{t("Modelo, precisión e índice exploratorio")}</summary><p>{t(report.methodology.ephemeris)}</p><p>{report.methodology.sampleCount.toLocaleString(locale())}  {t("muestras por lugar · paso máximo")} {report.methodology.stepMinutes} min.</p><p><strong>{t(report.methodology.scoreFormula)}</strong></p><ul>{report.methodology.assumptions.map(a => <li key={t(a)}>{t(a)}</li>)}</ul><a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noreferrer">Astronomy Engine ↗</a> · <a href="https://ssd.jpl.nasa.gov/horizons/manual.html" target="_blank" rel="noreferrer">{t("Referencia de contraste: JPL Horizons ↗")}</a></details>}
    <ReportOverview report={report}/>
    <details className="report-group export-group"><summary>{en?'Save your results':'Guardar los resultados'}<span>{en?'Full JSON or summary CSV':'JSON completo o resumen CSV'}</span></summary><ReportExport report={report}/></details>
    {report.sites.map(r => <article key={r.site.id} className="report-card" style={{ borderTopColor: r.site.color }}>
      <header><span className="site-number" style={{ color: r.site.color, backgroundColor: `${r.site.color}15` }}>{r.site.slot + 1}</span><div><h3>{t("Lugar")} {String(r.site.slot + 1).padStart(2, '0')}</h3><span className="coords">{formatCoordinates(r.site)}</span></div></header>
      {report.mission && <><details className="report-group" open><summary>{en?'01 · Communications':'01 · Comunicaciones'}<span>{en?'Can the mission transmit to Earth?':'¿Puede transmitir la misión a la Tierra?'}</span></summary><RadioAssessment site={r} mission={report.mission}/></details><details className="report-group"><summary>{en?'02 · Data storage':'02 · Almacenamiento de datos'}<span>{en?'What happens during outages?':'¿Qué ocurre durante los cortes?'}</span></summary><DataAssessment site={r} mission={report.mission}/></details></>}
      <details className="report-group"><summary>{en?'03 · Terrain and illumination':'03 · Terreno e iluminación'}<span>{en?'Obstacles, slopes and terrain effects':'Obstáculos, pendientes y efecto del relieve'}</span></summary><TerrainAssessment site={r} mission={report.mission}/><LandingAssessment site={r}/></details>
      <details className="report-group"><summary>{en?'04 · Spherical reference':'04 · Referencia esférica'}<span>{en?'Compare with a Moon without terrain':'Compara con una Luna sin relieve'}</span></summary>
      <h4>{en ? 'Spherical reference · without terrain' : 'Referencia esférica · sin relieve'}</h4>
      {report.mission && <><h4><Radio size={14}/>  {t("Prioridad: requisitos de comunicación")}</h4><CommunicationAssessment site={r} mission={report.mission}/></>}
      {report.mission && <OperationalAssessment site={r} mission={report.mission}/>}
      {report.mission && r.energy && <EnergyAssessment energy={r.energy} mission={report.mission}/>}
      <h4><Sun size={14}/>  {t("Iluminación solar")}</h4>
      <MetricRow label={t("Tiempo con luz solar")} metric={r.sunlightPercent} unit="%"/><MetricRow label={t("Máximo continuo con luz")} metric={r.longestLightHours} unit="h"/><MetricRow label={t("Máximo continuo en oscuridad")} metric={r.longestDarkHours} unit="h"/>
      <h4><Radio size={14}/>  {t("Referencia geométrica · horizonte de 0°")}</h4>
      <MetricRow label={t("Visibilidad directa")} metric={r.earthVisibilityPercent} unit="%"/><MetricRow label={t("Interrupción más larga")} metric={r.longestCommunicationOutageHours} unit="h"/>
      <div className="score"><MetricRow label={t("Índice luz/visibilidad · no evalúa requisitos")} metric={r.viabilityScore} unit="/ 100"/></div>
      {r.series && <AnalysisSeries series={r.series}/>}
      <div className="report-warnings"><strong>{t("Advertencias")}</strong>{r.warnings.map(w => <p key={t(w)}>{t(w)}</p>)}</div>
      <p className="recommendation"><strong>{t("Recomendación final")}</strong><span>{report.mission ? t("Revisa conjuntamente comunicaciones y balance energético. Antes de elegir, valida relieve, estaciones, enlace de radio y comportamiento real de la batería.") : t(r.recommendation ?? 'Pendiente de cálculo')}</span></p>
      </details>
    </article>)}
  </dialog>;
}
