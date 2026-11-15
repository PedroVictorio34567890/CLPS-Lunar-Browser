import { useLanguage } from '../i18n';
import { DEFAULT_DATA, type DataSettings as Settings } from '../science/dataStorage';
export function DataSettings({value,onChange}:{value?:Settings;onChange:(value:Settings)=>void}) {
  const en=useLanguage()==='en', data=value??DEFAULT_DATA;
  const fields:[keyof Settings,string,string,number,number][]=[
    ['generationKbps','Generación de datos (kbit/s)','Data generation (kbit/s)',0,1e9],
    ['capacityMB','Memoria disponible (MB)','Available storage (MB)',0.000001,1e12],
    ['initialMB','Datos iniciales almacenados (MB)','Initially stored data (MB)',0,data.capacityMB],
    ['payloadEfficiencyPercent','Eficiencia útil de transmisión (%)','Transmission payload efficiency (%)',0,100],
  ];
  return <details className="energy-settings"><summary>{en?'Data · storage during outages':'Datos · almacenamiento durante cortes'}</summary>
    <p className="footnote">{en?'Editable examples. Constant generation while powered. MB are decimal (1 MB = 1,000,000 bytes).':'Ejemplos editables. Generación constante mientras hay alimentación. MB decimales (1 MB = 1.000.000 bytes).'}</p>
    {fields.map(([key,es,english,min,max])=><label key={key}>{en?english:es}<input type="number" step="any" min={min} max={max} value={Number.isFinite(data[key])?data[key]:''} onChange={e=>onChange({...data,[key]:e.target.value===''?NaN:Number(e.target.value)})}/></label>)}
    <p className="footnote">{en?'Efficiency reduces the configured radio rate to useful payload. Include science and radio consumption in the energy load. Relay evaluation is pending orbit and service data.':'La eficiencia reduce la tasa de radio configurada a datos útiles. Incluye el consumo de instrumentos y radio en la carga energética. La evaluación de relés queda pendiente de órbitas y datos de servicio.'}</p>
  </details>;
}
