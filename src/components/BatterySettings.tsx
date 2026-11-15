import { useLanguage } from '../i18n';
import { DEFAULT_BATTERY, type BatterySettings as Settings } from '../science/batterySettings';
export function BatterySettings({value,onChange}:{value?:Settings;onChange:(v:Settings)=>void}) {
  const en=useLanguage()==='en',b=value??DEFAULT_BATTERY;
  const fields:[keyof Settings,string,string,number,number][]=[
    ['chargeEfficiencyPercent','Eficiencia de carga (%)','Charging efficiency (%)',0.01,100],
    ['dischargeEfficiencyPercent','Eficiencia de descarga (%)','Discharging efficiency (%)',0.01,100],
    ['maxChargeW','Potencia máxima de carga (W; 0 = sin límite)','Maximum charging power (W; 0 = unlimited)',0,1e9],
    ['maxDischargeW','Potencia máxima de descarga (W; 0 = sin límite)','Maximum discharging power (W; 0 = unlimited)',0,1e9],
  ];
  return <details className="energy-settings"><summary>{en?'Battery · losses and power limits':'Batería · pérdidas y límites de potencia'}</summary>
    <p className="footnote">{en?'Ideal defaults: 100% efficiencies and unlimited power. Enter equipment specifications. Limits refer to the electrical bus, before charging losses and after discharge losses.':'Valores ideales iniciales: eficiencias del 100% y potencia sin límite. Introduce las especificaciones del equipo. Los límites se refieren al bus eléctrico: antes de las pérdidas de carga y después de las de descarga.'}</p>
    {fields.map(([key,es,english,min,max])=><label key={key}>{en?english:es}<input type="number" min={min} max={max} step="any" value={Number.isFinite(b[key])?b[key]:''} onChange={e=>onChange({...b,[key]:e.target.value===''?NaN:Number(e.target.value)})}/></label>)}
    <p className="footnote">{en?'Nominal solar power is specified at 1 AU; generation now follows Sun–Moon distance. The useful generation factor is separate from battery losses. No temperature, aging, eclipses or partial solar disk.':'La potencia solar nominal se especifica a 1 UA; la generación sigue ahora la distancia Sol–Luna. El factor útil de generación es independiente de las pérdidas de batería. Sin temperatura, envejecimiento, eclipses ni disco solar parcial.'}</p>
  </details>;
}
