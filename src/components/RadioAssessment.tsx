import { useLanguage, locale } from '../i18n';
import type { MissionRequirements, SiteReport } from '../models';
import { DEFAULT_RADIO } from '../science/radioBudget';
import { formatInstant } from '../lib/playback';
export function RadioAssessment({site,mission}:{site:SiteReport;mission:MissionRequirements}) {
  const en=useLanguage()==='en', report=site.radio, settings=mission.radio ?? DEFAULT_RADIO;
  const n=(v:number)=>v.toLocaleString(locale(),{maximumFractionDigits:2});
  return <section className="terrain-assessment" aria-label={en?'Radio link budget':'Presupuesto de enlace de radio'}>
    <h4>{en?'Radio link · lunar downlink':'Enlace de radio · transmisión Luna–Tierra'}</h4>
    {!report || report.status!=='calculated' ? <p>{en?'Radio results unavailable. Analyze again; no link is assumed.':'Resultados de radio no disponibles. Vuelve a analizar; no se presupone enlace.'}</p>:<>
      <p>{report.model==='terrain'?'LOLA · 100 km':(en?'Spherical lunar horizon':'Horizonte lunar esférico')} · {en?'Ground station':'Estación terrestre'}: {settings.stationLatitude}°, {settings.stationLongitude}°, {settings.stationHeightM} m. {en?'Minimum station elevation':'Elevación mínima terrestre'}: {settings.stationMinElevationDeg}°.</p>
      <table><tbody>{[
        [en?'Both horizons clear':'Ambos horizontes despejados',n(report.geometricPercent)+' %'],
        [en?'Geometry + RF margin':'Geometría + margen RF',n(report.linkPercent)+' %'],
        [en?'Geometry + RF + energy':'Geometría + RF + energía',n(report.poweredPercent)+' %'],
        [en?'Longest combined outage':'Mayor corte combinado',n(report.longestOutageHours)+' h'],
        [en?'Additional RF margin, min / max':'Margen RF adicional, mínimo / máximo',n(report.minMarginDb)+' / '+n(report.maxMarginDb)+' dB'],
        [en?'Range, min / max':'Distancia, mínima / máxima',n(report.minRangeKm)+' / '+n(report.maxRangeKm)+' km'],
        [en?'Worst-range theoretical rate ceiling':'Techo teórico de tasa a peor distancia',n(report.minRateKbps)+' kbit/s'],
      ].map(([label,value])=><tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>)}</tbody></table>
      <p>{en?'Positive RF margin already includes your design reserve. Margin and rate ceiling describe hypothetical unobstructed propagation, even while the path is blocked. Only the availability rows apply both horizons. Cuts are clipped to the selected period.':'El margen RF positivo ya descuenta tu reserva de diseño. El margen y el techo de tasa describen propagación hipotética despejada, incluso durante ocultaciones. Solo las filas de disponibilidad aplican ambos horizontes. Los cortes se recortan al periodo elegido.'}</p>
      <details><summary>{en?'Worst-range budget and captured settings':'Desglose a peor distancia y parámetros usados'}</summary><p>{settings.frequencyGHz} GHz · {settings.transmitPowerW} W RF · Gtx {settings.transmitGainDbi} dBi · Grx {settings.receiveGainDbi} dBi · T {settings.noiseTemperatureK} K · {settings.lossesDb} dB · {settings.dataRateKbps} kbit/s · Eb/N₀ {settings.requiredEbN0Db} dB · {en?'reserve':'reserva'} {settings.designMarginDb} dB.</p><p>EIRP: {n(report.worst.eirpDbw)} dBW · FSPL: {n(report.worst.freeSpaceLossDb)} dB · Pr: {n(report.worst.receivedDbw)} dBW · C/N₀: {n(report.worst.cn0DbHz)} dB-Hz · Eb/N₀: {n(report.worst.ebN0Db)} dB.</p></details>
      <details><summary>{en?'Geometry + RF windows (without energy)':'Ventanas geometría + RF (sin energía)'}</summary>{report.windows.filter(w=>w.visible).length ? <ol>{report.windows.filter(w=>w.visible).map(w=><li key={w.start}>{formatInstant(w.start)} → {formatInstant(w.end)}</li>)}</ol>:<p>{en?'No windows in this period.':'Sin ventanas en este periodo.'}</p>}</details>
    </>}
    <p>{en?'Preliminary single-station, one-way link. No ground terrain, weather forecast, interference, Doppler/acquisition, station schedule, uplink or relay. Constant losses, noise and gains; ideal tracking. Include radio electrical consumption in the energy settings. This does not certify an operational link.':'Enlace preliminar unidireccional con una estación. Sin relieve terrestre, pronóstico meteorológico, interferencias, Doppler/adquisición, agenda de estación, enlace ascendente ni relés. Pérdidas, ruido y ganancias constantes; seguimiento ideal. Incluye el consumo eléctrico de radio en los ajustes de energía. No certifica un enlace operativo.'}</p>
    <a href="https://deepspace.jpl.nasa.gov/dsndocs/810-005/" target="_blank" rel="noreferrer">NASA/JPL · Telecommunications Link Design Handbook ↗</a>
  </section>;
}
