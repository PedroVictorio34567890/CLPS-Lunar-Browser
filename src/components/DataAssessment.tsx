import { useLanguage, locale } from '../i18n';
import type { MissionRequirements, SiteReport } from '../models';
import { DEFAULT_DATA } from '../science/dataStorage';
import { DEFAULT_RADIO } from '../science/radioBudget';
import { formatInstant } from '../lib/playback';
export function DataAssessment({site,mission}:{site:SiteReport;mission:MissionRequirements}) {
  const en=useLanguage()==='en', r=site.data, d=mission.data??DEFAULT_DATA;
  const n=(v:number)=>v.toLocaleString(locale(),{maximumFractionDigits:3});
  const samples=r?.status==='calculated'?r.samples:[];
  const start=samples[0]?.time??0,end=samples.at(-1)?.time??1;
  const points=samples.map(s=>`${40+680*(s.time-start)/(end-start)},${170-140*s.storedMB/d.capacityMB}`).join(' ');
  return <section className="terrain-assessment" aria-label={en?'Data storage':'Almacenamiento de datos'}>
    <h4>{en?'Data · direct downlink and storage':'Datos · enlace directo y almacenamiento'}</h4>
    {!r||r.status!=='calculated'?<p>{en?'Storage calculation unavailable. Analyze again with radio and energy results.':'Cálculo de almacenamiento no disponible. Vuelve a analizar con resultados de radio y energía.'}</p>:<>
      <p>{r.model==='terrain'?'LOLA · 100 km':(en?'Spherical horizon':'Horizonte esférico')} · {d.generationKbps} kbit/s · {n(d.capacityMB)} MB · {en?'Initial':'Inicial'}: {n(d.initialMB)} MB · {en?'Useful downlink rate':'Tasa útil de descarga'}: {n((mission.radio??DEFAULT_RADIO).dataRateKbps*d.payloadEfficiencyPercent/100)} kbit/s ({d.payloadEfficiencyPercent}%).</p>
      <table><tbody>{[
        [en?'Generated':'Generados',r.generatedMB], [en?'Transmitted':'Transmitidos',r.transmittedMB],
        [en?'Lost to overflow':'Perdidos por saturación',r.lostMB], [en?'Pending transmission at end':'Pendientes al finalizar',r.remainingMB],
        [en?'Peak stored':'Máximo almacenado',r.maxStoredMB], [en?'Minimum storage to avoid overflow':'Memoria mínima para evitar pérdidas',r.requiredCapacityMB],
        [en?'Not generated due to energy deficit':'No generados por déficit de energía',r.notGeneratedMB],
      ].map(([label,value])=><tr key={label}><th scope="row">{label}</th><td>{n(Number(value))} MB</td></tr>)}</tbody></table>
      <p>{r.firstOverflow===null?(en?'No overflow during this period.':'Sin saturación durante este periodo.'):(en?'Overflow begins: ':'Inicio de saturación: ')+formatInstant(r.firstOverflow)}</p>
      <svg viewBox="0 0 760 210" role="img" aria-label={en?'Stored data over the selected period':'Datos almacenados durante el periodo seleccionado'} style={{width:'100%',height:'auto'}}>
        <title>{en?'Stored data (MB); top line is capacity':'Datos almacenados (MB); línea superior: capacidad'}</title>
        <path d="M40 30H720 M40 170H720" stroke="currentColor" opacity=".35"/>
        <text x="40" y="20" fill="currentColor" fontSize="12">{n(d.capacityMB)} MB</text>
        <text x="20" y="175" fill="currentColor" fontSize="12">0</text>
        <polyline points={points} fill="none" stroke="#41c9c0" strokeWidth="2"/>
        <text x="40" y="200" fill="currentColor" fontSize="11">{formatInstant(start)}</text>
        <text x="720" y="200" textAnchor="end" fill="currentColor" fontSize="11">{formatInstant(end)}</text>
      </svg>
    </>}
    <p>{en?'Generation and transmission stop when the energy model cannot supply the full mission load; nonvolatile memory retains data. The oldest data are transmitted first; incoming data are discarded when full. Required storage assumes the same period and rates, without a safety reserve. Pending data are not counted as lost.':'La generación y transmisión se detienen cuando el modelo energético no puede cubrir toda la carga de misión; la memoria no volátil conserva los datos. Se transmiten primero los más antiguos; con memoria llena se descartan los nuevos. La memoria necesaria supone el mismo periodo y tasas, sin reserva de seguridad. Los datos pendientes no se consideran perdidos.'}</p>
    <p>{en?'Relays pending: no orbit or service windows provided. Results use only the direct station link and energy availability.':'Relés pendientes: no se han aportado órbitas ni ventanas de servicio. Los resultados usan únicamente el enlace directo con la estación y la disponibilidad de energía.'}</p>
  </section>;
}
