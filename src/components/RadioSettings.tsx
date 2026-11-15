import { useLanguage } from '../i18n';
import { DEFAULT_RADIO } from '../science/radioBudget';
import type { RadioSettings as Settings } from '../science/radioBudget';
export function RadioSettings({value,onChange}:{value?:Settings;onChange:(value:Settings)=>void}) {
  const en=useLanguage()==='en', radio=value ?? DEFAULT_RADIO;
  const fields: [keyof Settings,string,string,number,number][]=[
    ['frequencyGHz','Frecuencia (GHz)','Frequency (GHz)',0.000001,100],
    ['transmitPowerW','Potencia RF de transmisión (W)','Transmit RF power (W)',0.000001,1e6],
    ['transmitGainDbi','Ganancia antena lunar (dBi)','Lunar antenna gain (dBi)',-30,100],
    ['receiveGainDbi','Ganancia antena terrestre (dBi)','Ground antenna gain (dBi)',-30,100],
    ['noiseTemperatureK','Temperatura de ruido del sistema (K)','System noise temperature (K)',0.000001,1e6],
    ['lossesDb','Pérdidas totales adicionales (dB)','Total additional losses (dB)',0,100],
    ['dataRateKbps','Tasa de información (kbit/s)','Information rate (kbit/s)',0.000001,1e9],
    ['requiredEbN0Db','Eb/N₀ requerido por el módem (dB)','Required modem Eb/N₀ (dB)',-10,100],
    ['designMarginDb','Reserva de diseño del enlace (dB)','Link design reserve (dB)',0,100],
    ['stationLatitude','Latitud de estación terrestre (°)','Ground station latitude (°)',-90,90],
    ['stationLongitude','Longitud de estación terrestre (°)','Ground station longitude (°)',-180,180],
    ['stationHeightM','Altura elipsoidal de estación (m)','Station ellipsoidal height (m)',-500,10000],
    ['stationMinElevationDeg','Elevación mínima desde estación (°)','Minimum station elevation (°)',0,89.99],
  ];
  return <details className="energy-settings"><summary>{en?'Radio link · equipment and ground station':'Enlace de radio · equipo y estación terrestre'}</summary>
    <p className="footnote">{en?'Illustrative lunar-to-Earth downlink, not a DSN station. Replace examples with equipment specifications. Gains assume antenna tracking.':'Enlace descendente Luna–Tierra de ejemplo, no una estación DSN. Sustituye los ejemplos por especificaciones del equipo. Las ganancias suponen seguimiento de antenas.'}</p>
    {fields.map(([key,es,english,min,max])=><label key={key}>{en?english:es}<input type="number" min={min} max={max} step="any" value={Number.isFinite(radio[key])?radio[key]:''} onChange={e=>onChange({...radio,[key]:e.target.value===''?NaN:Number(e.target.value)})}/></label>)}
    <p className="footnote">{en?'Losses include atmosphere, pointing, polarization, cables and implementation, counted once. Eb/N₀ must match the modem, coding and target error rate. RF output is not electrical consumption: include amplifier and radio consumption in the mission load. No automatic load is added. East longitude positive.':'Las pérdidas incluyen atmósfera, apuntamiento, polarización, cables e implementación, una sola vez. Eb/N₀ debe corresponder al módem, codificación y tasa de errores. La potencia RF no es consumo eléctrico: incluye amplificador y radio en la carga de misión. No se añade carga automáticamente. Longitud este positiva.'}</p>
  </details>;
}
