import type { MissionRequirements, SiteReport } from '../models';
import { evaluateCommunications } from '../lib/mission';
import { formatInstant } from '../lib/playback';

const number = (value: number) => value.toLocaleString('es-ES', { maximumFractionDigits: 2 });
export function CommunicationAssessment({ site, mission }: { site: SiteReport; mission: MissionRequirements }) {
  const result = evaluateCommunications(site, mission);
  if (!result) return <p>Evaluación de comunicaciones pendiente.</p>;
  const start = site.series!.samples[0].time, end = site.series!.samples.at(-1)!.time;
  return <section className="communication-assessment" aria-label={`Requisitos de comunicación del lugar ${site.site.slot + 1}`}>
    <p className={`requirement-result ${result.passes ? 'pass' : 'fail'}`}>{result.passes ? 'Cumple los umbrales geométricos' : 'No cumple los umbrales geométricos'}</p>
    <p>Centro terrestre por encima de {number(mission.minEarthElevationDeg)}°. No certifica cobertura de radio.</p>
    <div className="requirement-line"><span>Disponibilidad ≥ {number(mission.minAvailabilityPercent)}%</span><strong>{number(result.percent)}% · {result.availabilityPass ? 'Cumple' : 'No cumple'}</strong></div>
    <div className="requirement-line"><span>Interrupción continua ≤ {number(mission.maxOutageHours)} h</span><strong>{number(result.longestHiddenHours)} h · {result.outagePass ? 'Cumple' : 'No cumple'}</strong></div>
    <div className="requirement-line"><span>Ventana continua más larga</span><strong>{number(result.longestVisibleHours)} h</strong></div>
    <svg className="communication-band" viewBox="0 0 1000 18" preserveAspectRatio="none" role="img" aria-label={`Disponibilidad geométrica con elevación mínima ${mission.minEarthElevationDeg} grados. ${number(result.percent)} por ciento disponible.`}>
      {result.windows.map((window, i) => <rect key={i} x={(window.start - start) / (end - start) * 1000} y="0" width={(window.end - window.start) / (end - start) * 1000} height="18" fill={window.visible ? '#79caff' : '#654349'}/>)}
    </svg><p>Azul: sobre el umbral · rojo: sin acceso geométrico. Inicio → fin del periodo.</p>
    <details><summary>Interrupciones ({result.outages.length}) · de mayor a menor</summary>
      {!result.outages.length ? <p>Sin interrupciones detectadas en el periodo.</p> : <ol>{result.outages.map(window => <li key={window.start}><strong>{number((window.end - window.start) / 3600000)} h</strong><span>{formatInstant(window.start)} → {formatInstant(window.end)}</span>{(window.start === start || window.end === end) && <small>Recortada por el límite del periodo; puede prolongarse fuera de él.</small>}</li>)}</ol>}
    </details>
    <p>Umbrales evaluados sin redondear. Muestreo de 5 min y cruces interpolados: pueden omitirse cortes breves. No incluye relieve, estaciones, relés ni calidad del enlace.</p>
  </section>;
}
