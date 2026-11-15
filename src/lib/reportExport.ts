import type { ComparisonReport, EnergyReport, VisibilityWindow } from '../models.ts';
import { missionError, DEFAULT_MISSION } from './mission.ts';
import { periodError, utcMillis } from './period.ts';
import { validCoordinates } from './coordinates.ts';

export interface ReportCheck { code: string; status: 'pass'|'warning'|'error'; siteId?: string }
export function validateReport(report: ComparisonReport): ReportCheck[] {
  const checks: ReportCheck[]=[];
  const add=(code:string,ok:boolean,siteId?:string)=>checks.push({code,status:ok?'pass':'error',siteId});
  const warn=(code:string,siteId?:string)=>checks.push({code,status:'warning',siteId});
  const start=utcMillis(report.period.start),end=utcMillis(report.period.end);
  add('inputs',!periodError(report.period)&&!!report.mission&&!missionError(report.mission)&&report.engine!=='pending'&&report.sites.length>0&&report.sites.length<=8&&new Set(report.sites.map(s=>s.site.id)).size===report.sites.length&&report.sites.every(s=>validCoordinates(s.site)));
  const finite=(v:unknown):boolean=>typeof v==='number'?Number.isFinite(v):Array.isArray(v)?v.every(finite):v!==null&&typeof v==='object'?Object.values(v).every(finite):true;
  add('finite',finite(report));
  const windows=(ws:VisibilityWindow[])=>ws.length>0&&ws[0].start===start&&ws.at(-1)!.end===end&&ws.every((w,i)=>w.end>w.start&&typeof w.visible==='boolean'&&(i===0||w.start===ws[i-1].end));
  const energy=(e:EnergyReport|undefined,id:string,code:string)=>{
    if(!e||!report.mission){add(code,false,id);return;}
    const initial=report.mission.batteryWh*report.mission.initialChargePercent/100;
    const residual=initial+e.generatedWh-e.demandWh+e.unservedWh-e.spilledWh-(e.batteryLossWh??0)-e.finalChargeWh;
    add(code,Math.abs(residual)<=1e-7*Math.max(1,initial+e.generatedWh)&&e.samples.length>0&&e.samples.every(s=>s.chargeWh>=-1e-7&&s.chargeWh<=report.mission!.batteryWh+1e-7),id);
  };
  for(const s of report.sites){
    const id=s.site.id;
    for(const [name,series] of [['sphere',s.series],['terrain',s.terrain?.status==='local'?s.terrain.series:undefined]] as const){
      if(name==='terrain'&&!series)continue;
      add(`${name}-timeline`,!!series&&series.samples.length>=2&&series.samples[0].time===start&&series.samples.at(-1)!.time===end&&series.samples.every((v,i)=>i===0||v.time>series.samples[i-1].time)&&windows(series.sunlight)&&windows(series.earthVisibility),id);
    }
    energy(s.energy,id,'sphere-energy');
    if(s.terrain?.status==='local')energy(s.terrain.energy,id,'terrain-energy');else warn('terrain-coverage',id);
    const expected=s.terrain?.status==='local'?'terrain':'sphere';
    if(s.radio?.status==='calculated')add('radio',s.radio.model===expected&&windows(s.radio.windows)&&s.radio.poweredPercent>=0&&s.radio.poweredPercent<=s.radio.linkPercent+1e-7&&s.radio.linkPercent<=s.radio.geometricPercent+1e-7&&s.radio.geometricPercent<=100,id);else warn('radio-unavailable',id);
    if(s.data?.status==='calculated'){
      const d=s.data,settings=report.mission?.data??DEFAULT_MISSION.data!;
      add('data',d.model===expected&&Math.abs(settings.initialMB+d.generatedMB-d.transmittedMB-d.lostMB-d.remainingMB)<=1e-7*Math.max(1,settings.initialMB+d.generatedMB)&&d.samples.every(v=>v.storedMB>=-1e-7&&v.storedMB<=settings.capacityMB+1e-7),id);
    }else warn('data-unavailable',id);
    if(s.landing?.status!=='calculated')warn('landing-coverage',id);
  }
  warn('scope');
  return checks;
}

export function createReportExport(report:ComparisonReport, provenance:unknown, exportedAt=new Date().toISOString()) {
  const checks=validateReport(report);
  if(checks.some(c=>c.status==='error'))throw new Error('report-consistency-error');
  return structuredClone({schema:'lunar-mission-report-v1',exportedAt,checks,
    scope:'Exploratory model, not NASA certification. Consistency checks are not independent physical validation. No relays, eclipses, sub-grid hazards or thermal/aging model. Terrain coverage is site- and date-dependent. Horizons resource reviews are exported separately.',
    units:{coordinates:'planetocentric degrees, north/east positive',period:'UTC',time:'Unix milliseconds UTC',angles:'degrees',energy:'Wh',power:'W',distance:'km unless suffix M (metres)',data:'decimal MB',rate:'kbit/s',percent:'0–100'},
    provenance,report});
}

export function reportCsv(report:ComparisonReport):string {
  if(validateReport(report).some(c=>c.status==='error'))throw new Error('report-consistency-error');
  const rows:unknown[][]=[['site_id','latitude_deg','longitude_deg','start_utc','end_utc','temporal_model','terrain_status','sunlight_percent','radio_status','radio_model','powered_link_percent','longest_radio_outage_h','minimum_battery_Wh','unserved_Wh','data_status','data_model','remaining_MB','lost_MB','landing_status','DEM_spacing_m','study_radius_m','maximum_slope_deg','relief_m','scope']];
  for(const s of report.sites){
    const t=s.terrain?.status==='local'?s.terrain:null,e=t?.energy??s.energy,r=s.radio?.status==='calculated'?s.radio:null,d=s.data?.status==='calculated'?s.data:null,l=s.landing?.status==='calculated'?s.landing:null;
    rows.push([s.site.id,s.site.latitude,s.site.longitude,report.period.start+'Z',report.period.end+'Z',t?'terrain':'sphere',s.terrain?.status??'not-calculated',t?.sunlightPercent??s.sunlightPercent.value,s.radio?.status??'not-calculated',r?.model,r?.poweredPercent,r?.longestOutageHours,e?.minChargeWh,e?.unservedWh,s.data?.status??'not-calculated',d?.model,d?.remainingMB,d?.lostMB,s.landing?.status??'not-calculated',l?.spacingM,l?.settings.radiusM,l?.maxSlopeDeg,l?.reliefM,'exploratory; see full JSON for parameters, checks, sources and limitations']);
  }
  return '\uFEFF'+rows.map(row=>row.map(value=>{
    let str=value==null?'':String(value);
    if(typeof value==='string'&&/^[\s]*[=+\-@]/.test(str))str="'"+str;
    return '"'+str.replaceAll('"','""')+'"';
  }).join(',')).join('\r\n')+'\r\n';
}
