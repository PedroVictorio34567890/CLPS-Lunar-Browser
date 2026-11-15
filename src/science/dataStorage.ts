import type { VisibilityWindow } from '../models.ts';

export interface DataSettings {
  generationKbps: number; capacityMB: number; initialMB: number; payloadEfficiencyPercent: number;
}
export const DEFAULT_DATA: DataSettings = {generationKbps:10,capacityMB:1024,initialMB:0,payloadEfficiencyPercent:80};
export function validData(value: unknown): value is DataSettings {
  if (!value || typeof value!=='object') return false;
  const d=value as DataSettings;
  if (Object.keys(DEFAULT_DATA).some(key=>typeof d[key as keyof DataSettings]!=='number'||!Number.isFinite(d[key as keyof DataSettings]))) return false;
  return d.generationKbps>=0 && d.generationKbps<=1e9 && d.capacityMB>0 && d.capacityMB<=1e12 &&
    d.initialMB>=0 && d.initialMB<=d.capacityMB && d.payloadEfficiencyPercent>=0 && d.payloadEfficiencyPercent<=100;
}

/** Fluid FIFO buffer, decimal MB. Only full mission supply allows generation
 * and transmission. Memory is nonvolatile; no relay or RF rate adaptation. */
export function simulateDataStorage(windows:VisibilityWindow[], outages:{start:number;end:number}[], rateKbps:number, settings:DataSettings) {
  if (!validData(settings)||!Number.isFinite(rateKbps)||rateKbps<=0||!windows.length) throw new Error('invalid-data-input');
  const start=windows[0].start,end=windows.at(-1)!.end;
  if (!Number.isFinite(start)||!Number.isFinite(end)||end<=start) throw new Error('invalid-data-period');
  const events=new Map<number,{link:number;power:number}>();
  const event=(time:number,link:number,power:number)=>{
    const old=events.get(time)??{link:0,power:0}; events.set(time,{link:old.link+link,power:old.power+power});
  };
  event(start,0,0);event(end,0,0);
  let cursor=start;
  for(const w of windows) {
    if(w.start!==cursor||!Number.isFinite(w.end)||w.end<=w.start||typeof w.visible!=='boolean') throw new Error('invalid-data-windows');
    if(w.visible) {event(w.start,1,0);event(w.end,-1,0);} cursor=w.end;
  }
  for(const outage of outages) {
    if (!Number.isFinite(outage.start)||!Number.isFinite(outage.end)||outage.end<=outage.start) throw new Error('invalid-data-energy');
    const a=Math.max(start,outage.start),b=Math.min(end,outage.end);
    if(b>a) {event(a,0,1);event(b,0,-1);}
  }
  const times=[...events.keys()].sort((a,b)=>a-b);
  const generation=settings.generationKbps/8000, transmission=rateKbps*settings.payloadEfficiencyPercent/100/8000;
  let link=0,power=0,stored=settings.initialMB,unlimited=stored,requiredCapacityMB=stored,maxStoredMB=stored;
  let generatedMB=0,transmittedMB=0,lostMB=0,notGeneratedMB=0,firstOverflow:number|null=null;
  const samples=[{time:start,storedMB:stored}];
  for(let i=0;i<times.length-1;i++) {
    const time=times[i],next=times[i+1],change=events.get(time)!;
    link+=change.link;power+=change.power;
    const seconds=(next-time)/1000, g=power===0?generation:0, tx=power===0&&link>0?transmission:0;
    const produced=g*seconds, sent=Math.min(stored+produced,tx*seconds), raw=stored+produced-sent;
    const dropped=Math.max(0,raw-settings.capacityMB), net=g-tx;
    // Preserve the empty/full kink so the occupancy graph never draws a false ramp.
    const boundary=net>0 ? (settings.capacityMB-stored)/net : net<0 ? -stored/net : Infinity;
    if(boundary>0 && boundary<seconds) samples.push({time:time+boundary*1000,storedMB:net>0?settings.capacityMB:0});
    if(dropped>1e-9 && firstOverflow===null) firstOverflow=time+Math.max(0,(settings.capacityMB-stored)/net)*1000;
    generatedMB+=produced;transmittedMB+=sent;lostMB+=dropped;notGeneratedMB+=(generation-g)*seconds;
    stored=Math.max(0,Math.min(settings.capacityMB,raw));maxStoredMB=Math.max(maxStoredMB,stored);
    // Counterfactual queue with unlimited capacity: storage needed to avoid loss.
    unlimited=Math.max(0,unlimited+(g-tx)*seconds);requiredCapacityMB=Math.max(requiredCapacityMB,unlimited);
    samples.push({time:next,storedMB:stored});
  }
  return {generatedMB,transmittedMB,lostMB,notGeneratedMB,remainingMB:stored,maxStoredMB,requiredCapacityMB,firstOverflow,samples};
}
export type DataStorageResult=ReturnType<typeof simulateDataStorage>;
