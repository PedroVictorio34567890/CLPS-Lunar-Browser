import type { MissionRequirements, SiteReport } from '../models';
import { useLanguage, locale } from '../i18n';
import { evaluateCommunications } from '../lib/mission';
import { operationalWindows, type WindowCause } from '../science/operationalWindows';
import { formatInstant } from '../lib/playback';

export function OperationalAssessment({ site, mission }: { site: SiteReport; mission: MissionRequirements }) {
  const en = useLanguage() === 'en';
  const communication = evaluateCommunications(site, mission);
  if (!communication || !site.energy) return null;
  const result = operationalWindows(communication.windows, site.energy.outages);
  const n = (value: number) => value.toLocaleString(locale(), { maximumFractionDigits: 2 });
  const availabilityPass = result.percent + 1e-9 >= mission.minAvailabilityPercent;
  const outagePass = result.longestOutageHours <= mission.maxOutageHours + 1e-9;
  const labels: Record<WindowCause, string> = en ? { available: 'Access + energy', geometry: 'No geometric access', energy: 'Energy deficit', both: 'Both constraints' } : { available: 'Acceso + energía', geometry: 'Sin acceso geométrico', energy: 'Déficit energético', both: 'Ambas limitaciones' };
  const colors = { available: '#b9e891', geometry: '#79a2d2', energy: '#f2c76d', both: '#d9889c' };
  const rows = [
    [en ? 'Joint availability' : 'Disponibilidad conjunta', `${n(result.percent)}% · ≥ ${n(mission.minAvailabilityPercent)}%`, availabilityPass],
    [en ? 'Longest joint outage' : 'Mayor interrupción conjunta', `${n(result.longestOutageHours)} h · ≤ ${n(mission.maxOutageHours)} h`, outagePass],
  ] as const;
  return <section className="communication-assessment operational-assessment" aria-label={en ? 'Communications with energy' : 'Comunicaciones con energía'}>
    <h4>{en ? 'Communications with energy' : 'Comunicaciones con energía'}</h4>
    <p className={`requirement-result ${availabilityPass && outagePass ? 'pass' : 'fail'}`}>{en ? (availabilityPass && outagePass ? 'Meets the combined model thresholds' : 'Does not meet the combined model thresholds') : (availabilityPass && outagePass ? 'Cumple los umbrales del modelo conjunto' : 'No cumple los umbrales del modelo conjunto')}</p>
    <p>{en ? 'Earth above your minimum elevation AND the full configured average load supplied. This is not certified radio coverage.' : 'Tierra sobre tu elevación mínima Y consumo medio configurado cubierto por completo. No certifica cobertura de radio.'}</p>
    {rows.map(([label, value, pass]) => <div className="requirement-line" key={label}><span>{label}</span><strong>{value} · {pass ? (en ? 'Pass' : 'Cumple') : (en ? 'Fail' : 'No cumple')}</strong></div>)}
    <div className="requirement-line"><span>{en ? 'Total joint window time' : 'Tiempo total con ambas condiciones'}</span><strong>{n(result.availableHours)} h</strong></div>
    <div className="requirement-line"><span>{en ? 'Longest joint window' : 'Ventana conjunta más larga'}</span><strong>{n(result.longestAvailableHours)} h</strong></div>
    <div className="requirement-line"><span>{en ? 'Geometric access lost to energy deficit' : 'Acceso geométrico perdido por déficit energético'}</span><strong>{n(result.lostToEnergyHours)} h</strong></div>
    <svg className="communication-band" viewBox="0 0 1000 18" preserveAspectRatio="none" role="img" aria-label={`${en ? 'Joint availability' : 'Disponibilidad conjunta'}: ${n(result.percent)}%`}>
      {result.windows.map(w => <rect key={w.start} x={(w.start - result.start) / (result.end - result.start) * 1000} width={(w.end - w.start) / (result.end - result.start) * 1000} height="18" fill={colors[w.cause]}/>)}
    </svg>
    <div className="operational-legend">{Object.entries(labels).map(([key, label]) => <span key={key}><i style={{ background: colors[key as WindowCause] }}/>{label}</span>)}</div>
    <p>{formatInstant(result.start)} → {formatInstant(result.end)}</p>
    <details><summary>{en ? 'Chronological windows and causes' : 'Ventanas y causas en orden cronológico'} ({result.windows.length})</summary><ol>{result.windows.map(w => <li key={w.start}><strong>{labels[w.cause]} · {n((w.end - w.start) / 3600000)} h</strong><span>{formatInstant(w.start)} → {formatInstant(w.end)}</span></li>)}</ol></details>
    <p>{en ? 'Adjacent unavailable intervals count as one outage even when the cause changes. Intervals are clipped to the analysis period. Reserve is a warning, not a power cutoff. Include radio consumption in the mission load; radio scheduling and partial load shedding are not modeled.' : 'Los intervalos consecutivos sin disponibilidad cuentan como un único corte aunque cambie la causa. Se recortan al periodo analizado. La reserva avisa, no desconecta. Incluye el consumo de radio en la carga de misión; no se modelan horarios de radio ni desconexión parcial de equipos.'}</p>
  </section>;
}
