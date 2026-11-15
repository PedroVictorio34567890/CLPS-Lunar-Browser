import { useState } from 'react';
import { useLanguage } from '../i18n';
import type { ComparisonReport } from '../models';
import { createReportExport, reportCsv, validateReport } from '../lib/reportExport';
import fine from '../science/terrainMetadata.json';
import regional from '../science/regionalMetadata.json';
import frame from '../../public/terrain/frame-metadata.json';

const labels:Record<string,[string,string]>={
  inputs:['Entradas y periodo','Inputs and period'],finite:['Valores numéricos finitos','Finite numerical values'],
  'sphere-timeline':['Cronología esférica','Spherical timeline'],'terrain-timeline':['Cronología con relieve','Terrain timeline'],
  'sphere-energy':['Conservación y capacidad de batería · esfera','Energy conservation and battery capacity · sphere'],
  'terrain-energy':['Conservación y capacidad de batería · relieve','Energy conservation and battery capacity · terrain'],
  radio:['Ventanas, modelo y disponibilidad de radio','Radio windows, model and availability'],data:['Conservación, modelo y capacidad de datos','Data conservation, model and capacity'],
  'terrain-coverage':['Sin horizonte de relieve: revisar referencia esférica','No terrain horizon: review spherical reference'],
  'radio-unavailable':['Radio no calculada','Radio not calculated'],'data-unavailable':['Datos no calculados','Data not calculated'],
  'landing-coverage':['Terreno local no evaluado: consultar cobertura o resolución','Local terrain not assessed: check coverage or resolution'],
  scope:['Modelo exploratorio: validación física completa pendiente','Exploratory model: comprehensive physical validation pending'],
};
export function ReportExport({report}:{report:ComparisonReport}){
  const en=useLanguage()==='en',[status,setStatus]=useState<'download'|'error'|null>(null);
  const message=status==='download'?(en?'Download requested. Check your browser downloads.':'Descarga solicitada. Revisa las descargas del navegador.'):status==='error'?(en?'Export failed. Review the consistency checks.':'No se pudo exportar. Revisa los controles de coherencia.') : '';
  const checks=validateReport(report),blocked=checks.some(c=>c.status==='error');
  function download(kind:'json'|'csv'){
    try{
      const content=kind==='json'?JSON.stringify(createReportExport(report,{fineDEM:fine,regionalDEM:regional,orientation:frame,ephemeris:'Astronomy Engine 2.1.19',references:['https://pgda.gsfc.nasa.gov/products/78','https://naif.jpl.nasa.gov/pub/naif/generic_kernels/','https://ssd.jpl.nasa.gov/horizons/','https://deepspace.jpl.nasa.gov/dsndocs/810-005/'],aiAssistance:'OpenAI ChatGPT/Codex: code, tests and documentation. Source datasets retain their original attribution.'}),null,2):reportCsv(report);
      const url=URL.createObjectURL(new Blob([content],{type:kind==='json'?'application/json':'text/csv;charset=utf-8'}));
      const a=document.createElement('a');a.href=url;a.download=`lunar-mission-${report.period.start.slice(0,10)}.${kind}`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      setStatus('download');
    }catch{setStatus('error');}
  }
  return <section className="terrain-assessment" aria-label={en?'Validation and export':'Validación y exportación'}>
    <h3>{en?'Review and export report':'Revisar y exportar informe'}</h3>
    <p>{blocked?(en?'Inconsistencies detected. Export blocked; recalculate the report.':'Se detectaron incoherencias. Exportación bloqueada; vuelve a calcular el informe.'):(en?'Numerical consistency checks passed. Review coverage and model limitations.':'Controles de coherencia numérica superados. Revisa la cobertura y los límites del modelo.')}</p>
    <details><summary>{en?'View checks and pending validation':'Ver controles y validaciones pendientes'}</summary><ul>{checks.map((c,i)=><li key={i}>{c.status==='pass'?'✓':c.status==='error'?'✕':'!'} {c.siteId?`${en?'Site':'Lugar'} ${(report.sites.find(s=>s.site.id===c.siteId)?.site.slot??0)+1}: `:''}{labels[c.code]?.[en?1:0]??c.code}</li>)}</ul></details>
    <p>{en?'JSON includes captured inputs, full series and windows, both temporal models, radio, energy, storage, terrain, source metadata and checks. CSV is a summary per site: empty cells mean unavailable, not zero. Field names and units are stable in English.':'El JSON incluye entradas capturadas, series y ventanas completas, ambos modelos temporales, radio, energía, almacenamiento, terreno, metadatos de fuentes y controles. El CSV resume cada lugar: las celdas vacías significan no disponible, no cero. Los nombres de campos y unidades se mantienen en inglés.'}</p>
    <div className="report-export-actions"><button disabled={blocked} onClick={()=>download('json')}>{en?'Download full JSON':'Descargar JSON completo'}</button><button disabled={blocked} onClick={()=>download('csv')}>{en?'Download summary CSV':'Descargar resumen CSV'}</button></div>
    <p>{en?'These checks do not certify mission feasibility. No relay service, eclipses, small hazards or thermal aging are evaluated. Horizons comparisons remain in the separate resource-review export.':'Estos controles no certifican viabilidad de misión. No se evalúan servicios de relé, eclipses, obstáculos pequeños ni envejecimiento térmico. Los contrastes Horizons permanecen en la exportación separada de revisión de recursos.'}</p>
    {message&&<p role="status">{message}</p>}
  </section>;
}
