import type { EnergyReport, MissionRequirements } from '../models';
import { t, locale, useLanguage } from '../i18n';
import { DEFAULT_BATTERY } from '../science/batterySettings';
import { formatInstant } from '../lib/playback';

export function EnergyAssessment({ energy: e, mission: m }: { energy: EnergyReport; mission: MissionRequirements }) {
  const en=useLanguage()==='en', battery=m.battery??DEFAULT_BATTERY;
  const n = (value: number) => value.toLocaleString(locale(), { maximumFractionDigits: 2 });
  const empty = e.unservedWh > 1e-9;
  const pass = !empty && e.firstReserveViolation === null;
  const start = e.samples[0].time, end = e.samples.at(-1)!.time;
  // Keep extrema in each bucket so a brief depletion is not hidden by chart sampling.
  const stride = Math.max(1, Math.ceil(e.samples.length / 250));
  const points = e.samples.flatMap((_, index) => {
    if (index % stride) return [];
    const bucket = e.samples.slice(index, index + stride);
    const low = bucket.reduce((a, b) => a.chargeWh < b.chargeWh ? a : b);
    const high = bucket.reduce((a, b) => a.chargeWh > b.chargeWh ? a : b);
    return [bucket[0], low, high, bucket.at(-1)!].sort((a, b) => a.time - b.time);
  }).map(p => `${(p.time - start) / (end - start) * 600},${100 - p.chargeWh / m.batteryWh * 100}`).join(' ');
  const rows: [string, string][] = [
    ['Consumo medio', `${n(e.loadW)} W`], ['Carga mínima', `${n(e.minChargeWh / m.batteryWh * 100)}% · ${n(e.minChargeWh)} Wh`],
    ['Carga final', `${n(e.finalChargeWh / m.batteryWh * 100)}%`], ['Energía generada', `${n(e.generatedWh)} Wh`],
    ['Pérdidas de batería', `${n(e.batteryLossWh??0)} Wh`], ['Demanda total', `${n(e.demandWh)} Wh`], ['Demanda sin cubrir', `${n(e.unservedWh)} Wh`], ['Excedente no almacenado', `${n(e.spilledWh)} Wh`],
  ];
  return <section className="energy-assessment" aria-label={t('Balance energético')}>
    <h4>{t('Balance energético')}</h4>
    <p>{en?'Charge / discharge efficiency':'Eficiencia de carga / descarga'}: {battery.chargeEfficiencyPercent}% / {battery.dischargeEfficiencyPercent}% · {en?'Power limits, charge / discharge':'Límites de potencia, carga / descarga'}: {battery.maxChargeW||'∞'} / {battery.maxDischargeW||'∞'} W.</p>
    <p className={`requirement-result ${pass ? 'pass' : 'fail'}`}>{t(empty ? 'Energía insuficiente para la demanda' : pass ? 'Mantiene la reserva en el modelo' : 'Cubre la demanda, pero baja de la reserva')}</p>
    {rows.map(([label, value]) => <div className="requirement-line" key={label}><span>{t(label)}</span><strong>{value}</strong></div>)}
    <figure className="battery-plot"><figcaption>{t('Carga de batería (%)')} · {t('Reserva mínima (%)')}: {n(m.reservePercent)}</figcaption><div className="battery-scale"><span>100%</span><span>0%</span></div>
      <svg viewBox="-2 -5 604 110" preserveAspectRatio="none" role="img" aria-label={t('Evolución de carga y línea de reserva')}><rect x="0" y="0" width="600" height="100" fill="#101925"/><line x1="0" x2="600" y1={100 - m.reservePercent} y2={100 - m.reservePercent} stroke="#f2c76d" strokeDasharray="6 4"/><polyline points={points} fill="none" stroke="#b9e891" strokeWidth="2" vectorEffect="non-scaling-stroke"/></svg>
      <div className="battery-dates"><span>{formatInstant(start)}</span><span>{formatInstant(end)}</span></div>
    </figure>
    <p>{t('Primera caída bajo reserva')}: {e.firstReserveViolation === null ? t('No detectada') : formatInstant(e.firstReserveViolation)}</p>
    <p>{t('Primera batería vacía')}: {e.firstEmpty === null ? t('No detectada') : formatInstant(e.firstEmpty)}</p>
    <details><summary>{t('Intervalos con demanda sin cubrir')} ({e.outages.length})</summary><ul>{e.outages.map(window => <li key={window.start}>{formatInstant(window.start)} → {formatInstant(window.end)} · {n((window.end - window.start) / 3600000)} h</li>)}</ul>{!e.outages.length && <p>{t('No detectada')}</p>}</details>
    <details><summary>{t('Hipótesis del balance')}</summary><p>{t('Consumo medio constante según el porcentaje de operación; no es un horario de actividades. La reserva avisa, pero no desconecta cargas.')}</p><p>{en?'Solar power corrected for Sun–Moon distance relative to 1 AU. Configurable battery losses and bus power limits. No temperature, aging, eclipses or partial solar disk. This spherical reference excludes terrain shadows.':'Potencia solar corregida por distancia Sol–Luna respecto a 1 UA. Pérdidas de batería y límites de potencia del bus configurables. Sin temperatura, envejecimiento, eclipses ni disco solar parcial. Esta referencia esférica no incluye sombras de relieve.'}</p><p>{t('Panel fijo: inclinación desde la horizontal y azimut desde el norte hacia el este. Seguimiento: incidencia normal ideal cuando el centro solar supera 0°.')}</p><p>{t('Integración por tramos de hasta 5 min, divididos en los cruces del horizonte. Potencia solar evaluada en el punto medio. Los eventos son estimaciones dentro del periodo.')}</p></details>
    <p>{t('La disponibilidad geométrica de comunicaciones no garantiza que haya energía para operar la radio.')}</p>
  </section>;
}
