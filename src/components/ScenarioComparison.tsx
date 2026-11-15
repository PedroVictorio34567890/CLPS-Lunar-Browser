import { LandingComparison } from './LandingComparison';
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage, locale, t } from '../i18n';
import { LanguageMenu } from './LanguageMenu';
import { copyInputs } from '../lib/scenarios';
import type { SavedScenario } from '../lib/scenarios';
import { delayedScenario, summarizeScenario } from '../lib/scenarioComparison';
import type { ScenarioComparisonRow } from '../lib/scenarioComparison';
import { analysisLabel } from '../lib/activeAnalysis';
import { DEFAULT_RADIO } from '../science/radioBudget';
import { workerEngine } from '../science/workerEngine';

export function ScenarioComparison({ scenarios, onClose }: { scenarios: SavedScenario[]; onClose: () => void }) {
  const en = useLanguage() === 'en';
  const dialog = useRef<HTMLDialogElement>(null);
  const alive = useRef(true);
  // Captured when opened: library edits and working inputs cannot silently alter a comparison.
  const [catalog, setCatalog] = useState(() => scenarios.map(s => ({ ...s, ...copyInputs(s) })));
  const [selected, setSelected] = useState<string[]>(() => scenarios.slice(0, 2).map(s => s.id));
  const [sourceId, setSourceId] = useState(scenarios[0]?.id ?? '');
  const [delay, setDelay] = useState(1);
  const [rows, setRows] = useState<ScenarioComparisonRow[]>([]);
  const [reference, setReference] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const busy = progress !== null;
  const baseline = rows.find(row => row.id === reference) ?? rows[0];
  const number = (value: number) => value.toLocaleString(locale(), { maximumFractionDigits: 2 });
  useEffect(() => {
    alive.current = true;
    const node = dialog.current!, focus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; node.showModal();
    return () => { alive.current = false; node.close(); document.body.style.overflow = overflow; focus?.focus(); };
  }, []);
  function invalidate() { setRows([]); setReference(''); setError(''); }
  function toggle(id: string) {
    invalidate(); setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }
  function addDelay() {
    const source = catalog.find(s => s.id === sourceId);
    if (!source) return;
    try {
      const variant = delayedScenario(source, delay);
      if (!catalog.some(s => s.id === variant.id)) setCatalog(current => [...current, variant]);
      setSelected(current => current.includes(variant.id) ? current : [...current, variant.id]); invalidate();
    } catch { setError(en ? 'This delay falls outside the supported date range (2000–2100).' : 'Este retraso queda fuera del intervalo de fechas admitido (2000–2100).'); }
  }
  async function compare() {
    invalidate(); setProgress(0);
    const candidates = selected.map(id => catalog.find(s => s.id === id)!);
    const result: ScenarioComparisonRow[] = [];
    try {
      for (let index = 0; index < candidates.length; index++) {
        if (!alive.current) return;
        const scenario = candidates[index];
        const report = await workerEngine.compare(scenario.sites, scenario.period, scenario.mission);
        if (!alive.current) return;
        result.push(...summarizeScenario(scenario, report)); setProgress(index + 1);
      }
      setRows(result); setReference(result[0]?.id ?? '');
    } catch (reason) { if (alive.current) setError(reason instanceof Error ? reason.message : (en ? 'Comparison failed.' : 'No se pudo comparar.')); }
    finally { if (alive.current) setProgress(null); }
  }
  const metrics: { key: 'geometricPercent' | 'jointPercent' | 'longestOutageHours' | 'sunlightPercent' | 'minChargePercent' | 'unservedWh'; label: string; unit: string; deltaUnit: string }[] = [
    { key: 'geometricPercent', label: en ? 'Geometric access' : 'Acceso geométrico', unit: '%', deltaUnit: 'pp' },
    { key: 'jointPercent', label: en ? 'Access + energy' : 'Acceso + energía', unit: '%', deltaUnit: 'pp' },
    { key: 'longestOutageHours', label: en ? 'Longest joint outage' : 'Mayor corte conjunto', unit: 'h', deltaUnit: 'h' },
    { key: 'sunlightPercent', label: en ? 'Sunlight' : 'Luz solar', unit: '%', deltaUnit: 'pp' },
    { key: 'minChargePercent', label: en ? 'Minimum battery' : 'Batería mínima', unit: '%', deltaUnit: 'pp' },
    { key: 'unservedWh', label: en ? 'Unserved demand' : 'Demanda sin cubrir', unit: 'Wh', deltaUnit: 'Wh' },
  ];
  return <dialog className="scenario-comparison" ref={dialog} aria-labelledby="scenario-comparison-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <header><div><div className="eyebrow">{en ? 'SAVED SCENARIOS' : 'ESCENARIOS GUARDADOS'}</div><h2 id="scenario-comparison-title">{en ? 'Compare missions and delays' : 'Comparar misiones y retrasos'}</h2></div><LanguageMenu/><button autoFocus className="icon-button" onClick={onClose} aria-label={en ? 'Close scenario comparison' : 'Cerrar comparación de escenarios'}><X/></button></header>
    <p>{en ? 'Select 2–4 scenarios. Each site becomes a row. Uses saved versions, not unsaved working changes. This comparison does not modify your working mission or library.' : 'Selecciona de 2 a 4 escenarios. Cada lugar ocupa una fila. Se usan las versiones guardadas, no los cambios de trabajo sin guardar. Esta comparación no modifica tu misión de trabajo ni la biblioteca.'}</p>
    <fieldset disabled={busy}><legend>{en ? 'Scenarios to compare' : 'Escenarios que comparar'} ({selected.length}/4)</legend><div className="comparison-choices">{catalog.map(s => <label key={s.id}><input type="checkbox" checked={selected.includes(s.id)} disabled={!selected.includes(s.id) && selected.length >= 4} onChange={() => toggle(s.id)}/><span><strong>{s.name}</strong><small>{s.period.start.replace('T', ' ')} → {s.period.end.replace('T', ' ')} UTC · {s.sites.length} {en ? 'sites' : 'lugares'}</small></span></label>)}</div></fieldset>
    <fieldset disabled={busy}><legend>{en ? 'Try a launch delay' : 'Probar un retraso'}</legend><div className="delay-controls"><label>{en ? 'Base scenario' : 'Escenario base'}<select value={sourceId} onChange={event => setSourceId(event.target.value)}>{scenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>{en ? 'Delay' : 'Retraso'}<select value={delay} onChange={event => setDelay(Number(event.target.value))}>{[1, 3, 7, 14, 30].map(days => <option key={days} value={days}>+{days} {en ? 'days' : 'días'}</option>)}</select></label><button disabled={selected.length >= 4 || !sourceId} onClick={addDelay}>{en ? 'Add temporary variant' : 'Añadir variante temporal'}</button></div><p>{en ? 'Moves both dates by the same number of UTC days; keeps duration, sites, hardware settings and initial battery charge. This is a separate landing scenario, not continued operation through the delay. The variant is not saved.' : 'Desplaza ambas fechas el mismo número de días UTC; conserva duración, lugares, equipo y carga inicial de batería. Es otro escenario de aterrizaje, no una misión que sigue consumiendo durante el retraso. La variante no se guarda.'}</p></fieldset>
    <button className="primary" disabled={busy || selected.length < 2 || selected.length > 4} onClick={compare}>{busy ? (en ? `Calculating ${progress}/${selected.length}…` : `Calculando ${progress}/${selected.length}…`) : (en ? 'Calculate comparison' : 'Calcular comparación')}</button>
    {busy && <p role="status">{en ? 'Calculations run in sequence. Closing stops the remaining scenarios after the current calculation finishes.' : 'Los cálculos se ejecutan en secuencia. Al cerrar, no se iniciarán más escenarios cuando termine el cálculo actual.'}</p>}
    {error && <p role="alert" className="error">{t(error)}</p>}
    {!!rows.length && <><LandingComparison rows={rows}/>
      <div className="comparison-table-scroll"><table><caption>{en?'Station downlink · geometry, RF and energy':'Enlace descendente con estación · geometría, RF y energía'}</caption><thead><tr><th>{en?'Scenario / model':'Escenario / modelo'}</th><th>{en?'Minimum extra margin':'Margen adicional mínimo'}</th><th>{en?'Geometry + RF':'Geometría + RF'}</th><th>{en?'Geometry + RF + energy':'Geometría + RF + energía'}</th><th>{en?'Longest combined outage':'Mayor corte combinado'}</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><th scope="row">{row.scenario.name} · {row.site.slot+1}<small>{analysisLabel(row.modelReason,en)}</small><small>{(row.scenario.mission.radio ?? DEFAULT_RADIO).frequencyGHz} GHz · {(row.scenario.mission.radio ?? DEFAULT_RADIO).dataRateKbps} kbit/s · {(row.scenario.mission.radio ?? DEFAULT_RADIO).stationLatitude}°, {(row.scenario.mission.radio ?? DEFAULT_RADIO).stationLongitude}°</small></th>{row.radio ? <><td>{number(row.radio.minMarginDb)} dB</td><td>{number(row.radio.linkPercent)} %</td><td>{number(row.radio.poweredPercent)} %</td><td>{number(row.radio.longestOutageHours)} h</td></>:<td colSpan={4}>{en?'Radio calculation unavailable':'Cálculo de radio no disponible'}</td>}</tr>)}</tbody></table></div>
      <div className="comparison-table-scroll"><table><caption>{en?'Data storage · direct link only':'Almacenamiento de datos · solo enlace directo'}</caption><thead><tr><th>{en?'Scenario / site':'Escenario / lugar'}</th><th>{en?'Minimum memory':'Memoria mínima'}</th><th>{en?'Overflow loss':'Pérdida por saturación'}</th><th>{en?'Pending at end':'Pendientes al finalizar'}</th><th>{en?'Not generated (energy)':'No generados (energía)'}</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><th scope="row">{row.scenario.name} · {row.site.slot+1}</th>{row.data?<><td>{number(row.data.requiredCapacityMB)} MB</td><td>{number(row.data.lostMB)} MB</td><td>{number(row.data.remainingMB)} MB</td><td>{number(row.data.notGeneratedMB)} MB</td></>:<td colSpan={4}>{en?'Unavailable':'No disponible'}</td>}</tr>)}</tbody></table></div>
      <label className="comparison-reference">{en ? 'Reference row for differences' : 'Fila de referencia para las diferencias'}<select value={baseline.id} onChange={event => setReference(event.target.value)}>{rows.map(row => <option key={row.id} value={row.id}>{row.scenario.name} · {en ? 'Site' : 'Lugar'} {row.site.slot + 1} ({row.site.latitude}°, {row.site.longitude}°)</option>)}</select></label>
      <p>{en ? 'Δ = row minus reference. pp = percentage points. Different durations, sites or requirements also affect results: differences cannot automatically be attributed to dates alone. Each pass/fail uses that scenario’s own thresholds; it is not a ranking. Every row identifies its model. Differences are hidden between terrain and spherical rows.' : 'Δ = fila menos referencia. pp = puntos porcentuales. Distintas duraciones, ubicaciones o requisitos también afectan: las diferencias no se pueden atribuir automáticamente solo a las fechas. Cada cumplimiento usa los umbrales de su escenario; no es una clasificación. Cada fila identifica su modelo. No se muestran diferencias entre filas con relieve y esféricas.'}</p>
      <div className="comparison-table-scroll" tabIndex={0} role="region" aria-label={en ? 'Scenario results table, scroll horizontally' : 'Tabla de escenarios, desplazamiento horizontal'}><table><caption>{en ? 'Model results by scenario and site' : 'Resultados del modelo por escenario y lugar'}</caption><thead><tr><th scope="col">{en ? 'Scenario / site / dates (UTC)' : 'Escenario / lugar / fechas (UTC)'}</th>{metrics.map(metric => <th key={metric.key} scope="col">{metric.label}</th>)}<th scope="col">{en ? 'Thresholds' : 'Umbrales'}</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className={row.id === baseline.id ? 'reference-row' : ''}><th scope="row">{row.scenario.name}<small>{en ? 'Site' : 'Lugar'} {row.site.slot + 1} · {row.site.latitude}°, {row.site.longitude}°</small><small>{row.scenario.period.start.replace('T', ' ')} → {row.scenario.period.end.replace('T', ' ')}</small><small>{analysisLabel(row.modelReason, en)}</small><small>{en ? 'Duration' : 'Duración'}: {number((Date.parse(row.scenario.period.end + ':00Z') - Date.parse(row.scenario.period.start + ':00Z')) / 86400000)} d</small>{row.id === baseline.id && <small>{en ? 'REFERENCE' : 'REFERENCIA'}</small>}</th>{metrics.map(metric => { const delta = row[metric.key] - baseline[metric.key]; return <td key={metric.key}>{number(row[metric.key])} {metric.unit}{row.id !== baseline.id && row.model === baseline.model && <small>Δ {delta > 0 ? '+' : ''}{number(delta)} {metric.deltaUnit}</small>}</td>; })}<td>{en ? 'Access + energy' : 'Acceso + energía'}: <strong>{row.communicationsPass ? (en ? 'Pass' : 'Cumple') : (en ? 'Fail' : 'No cumple')}</strong><small>{en ? 'Reserve and demand' : 'Reserva y demanda'}: {row.energyPass ? (en ? 'Pass' : 'Cumple') : (en ? 'Fail' : 'No cumple')}</small></td></tr>)}</tbody></table></div>
      <details><summary>{en ? 'Captured requirements for each scenario' : 'Requisitos capturados de cada escenario'}</summary>{selected.map(id => { const s = rows.find(row => row.scenario.id === id)!.scenario, m = s.mission; return <article key={id}><h3>{s.name}</h3><p>{en ? 'Earth elevation / availability / maximum outage' : 'Elevación terrestre / disponibilidad / corte máximo'}: &gt; {m.minEarthElevationDeg}° / ≥ {m.minAvailabilityPercent}% / ≤ {m.maxOutageHours} h.</p><p>{en ? 'Operating / standby load / operating time' : 'Consumo operación / reposo / tiempo en operación'}: {m.operatingPowerW} W / {m.standbyPowerW} W / {m.operatingDutyPercent}%.</p><p>{en ? 'Solar power / useful factor / orientation' : 'Potencia solar / factor útil / orientación'}: {m.solarPowerW} W / {m.generationFactorPercent}% / {m.panelMode === 'tracking' ? (en ? 'tracking' : 'seguimiento') : `${en ? 'fixed: tilt' : 'fija: inclinación'} ${m.panelTiltDeg}°, ${en ? 'azimuth' : 'azimut'} ${m.panelAzimuthDeg}°`}.</p><p>{en ? 'Battery / initial charge / reserve' : 'Batería / carga inicial / reserva'}: {m.batteryWh} Wh / {m.initialChargePercent}% / {m.reservePercent}%.</p></article>; })}</details>
      <p>{en ? 'LOLA terrain within coverage; an explicitly labelled sphere elsewhere. 5-minute sampling and configurable battery losses/limits. No eclipses, stations, antennas or real radio link. Zero unmet demand does not imply the reserve is maintained. Results are clipped to each period; no mission feasibility certification.' : 'Relieve LOLA donde hay cobertura; esfera identificada expresamente en el resto. Muestreo de 5 minutos y pérdidas/límites de batería configurables. Sin eclipses, estaciones, antenas ni enlace de radio real. Demanda sin cubrir igual a cero no implica mantener la reserva. Resultados recortados a cada periodo; no certifican viabilidad de misión.'}</p>
    </>}
  </dialog>;
}
