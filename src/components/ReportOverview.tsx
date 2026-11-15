import { useLanguage, locale } from '../i18n';
import type { ComparisonReport } from '../models';

/** A reading guide, not an additional scientific score. */
export function ReportOverview({report}:{report:ComparisonReport}) {
  const en=useLanguage()==='en';
  const n=(v:number|undefined|null,unit:string)=>v==null?(en?'Unavailable':'No disponible'):`${v.toLocaleString(locale(),{maximumFractionDigits:1})}${unit}`;
  return <section className="report-overview" aria-label={en?'At a glance':'De un vistazo'}>
    <h3>{en?'Your mission at a glance':'Tu misión de un vistazo'}</h3>
    <p>{en?'Start with communication outages. Then check whether power, storage and terrain meet your needs. Expand each section for the evidence.':'Empieza por los cortes de comunicación. Después revisa si la energía, la memoria y el terreno se ajustan a lo que necesitas. Abre cada sección para ver el detalle.'}</p>
    {report.sites.map(s=>{
      const terrain=s.terrain?.status==='local'?s.terrain:null;
      const radio=s.radio?.status==='calculated'?s.radio:null;
      const energy=terrain?.energy??s.energy;
      return <article key={s.site.id} className="overview-site">
        <div className="overview-title"><strong>{en?'Site':'Lugar'} {String(s.site.slot+1).padStart(2,'0')}</strong><span>{terrain?(en?'With LOLA terrain':'Con relieve LOLA'):(en?'Spherical reference · no terrain horizon':'Referencia esférica · sin horizonte de relieve')}</span></div>
        <dl className="overview-metrics">
          <div><dt>{en?'Link + power':'Enlace + energía'}</dt><dd>{n(radio?.poweredPercent,' %')}</dd></div>
          <div><dt>{en?'Longest radio outage':'Mayor corte de radio'}</dt><dd>{n(radio?.longestOutageHours,' h')}</dd></div>
          <div><dt>{en?'Minimum battery':'Batería mínima'}</dt><dd>{n(energy&&report.mission?energy.minChargeWh/report.mission.batteryWh*100:null,' %')}</dd></div>
          <div><dt>{en?'Sunlight':'Tiempo con luz'}</dt><dd>{n(terrain?.sunlightPercent??s.sunlightPercent.value,' %')}</dd></div>
        </dl>
      </article>;
    })}
    <p className="overview-note">{en?'Model estimates for the selected dates. They do not establish operational or landing safety.':'Estimaciones del modelo para las fechas elegidas. No acreditan seguridad operativa ni de aterrizaje.'}</p>
  </section>;
}
