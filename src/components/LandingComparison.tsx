import { useLanguage, locale } from '../i18n';
import type { ScenarioComparisonRow } from '../lib/scenarioComparison';
export function LandingComparison({rows}:{rows:ScenarioComparisonRow[]}) {
  const en=useLanguage()==='en',n=(v:number)=>v.toLocaleString(locale(),{maximumFractionDigits:2});
  return <div className="comparison-table-scroll"><table><caption>{en?'Static terrain screening · not landing certification':'Evaluación estática del terreno · no certifica aterrizajes'}</caption><thead><tr>
    <th>{en?'Scenario / site':'Escenario / lugar'}</th><th>{en?'DEM / radius':'DEM / radio'}</th><th>{en?'Maximum slope':'Pendiente máxima'}</th><th>{en?'Elevation range':'Desnivel total'}</th><th>{en?'RMS residual':'Residuo RMS'}</th><th>{en?'Own exploratory limits':'Límites exploratorios propios'}</th>
  </tr></thead><tbody>{rows.map(row=>{const r=row.landing;return <tr key={row.id}><th scope="row">{row.scenario.name} · {row.site.slot+1}</th>{r?.status==='calculated'?<>
    <td>{r.spacingM} m / {n(r.settings.radiusM)} m<small>{r.sourceId}</small></td><td>{n(r.maxSlopeDeg)}°</td><td>{n(r.reliefM)} m</td><td>{n(r.residualRmsM)} m</td>
    <td>{r.withinLimits?(en?'Not exceeded at DEM scale':'No superados a escala DEM'):(en?'Exceeded':'Superados')}<small>≤ {r.settings.maxSlopeDeg}° · ≤ {r.settings.maxReliefM} m</small></td>
  </>:<td colSpan={5}>{r?.status==='outside'?(en?'Outside full-area coverage':'Entorno fuera de cobertura'):r?.status==='insufficient-resolution'?(en?'Insufficient DEM resolution':'Resolución del DEM insuficiente'):(en?'Unavailable':'No disponible')}</td>}</tr>;})}</tbody></table>
  <p>{en?'Results depend on radius and DEM resolution; compare like scales. Date delays alone do not change static terrain. Fine hazards and soil strength remain unassessed.':'Los resultados dependen del radio y de la resolución del DEM; compara escalas equivalentes. Cambiar solo la fecha no altera el terreno estático. Los obstáculos finos y la resistencia del suelo siguen sin evaluarse.'}</p></div>;
}
