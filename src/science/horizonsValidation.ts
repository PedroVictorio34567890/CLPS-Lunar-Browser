import { lunarEphemeris } from './ephemeris.ts';
import type { AnalysisPeriod } from '../models.ts';
import { utcMillis, periodError } from '../lib/period.ts';

/** Strictly accepts the geocentric Moon observer table (14,15), not a terrain or relay product. */
export function compareHorizons(text:string,period:AnalysisPeriod) {
  if(text.length>2_000_000||periodError(period)) throw new Error('invalid-horizons');
  const input=JSON.parse(text);
  if(input.error||input.signature?.version!=='1.2'||input.signature?.source!=='NASA/JPL Horizons API'||typeof input.result!=='string') throw new Error('invalid-horizons');
  const raw:string=input.result, header=raw.split('$$SOE')[0];
  if(!/Target body name:\s*Moon \(301\)/.test(header)||!/Center body name:\s*Earth \(399\)/.test(header)||!/Center-site name:\s*GEOCENTRIC/.test(header)||!/Date__\(UT\)/.test(header)||!header.includes('ObsSub-LON')||!header.includes('SunSub-LAT')||raw.split('$$SOE').length!==2||raw.split('$$EOE').length!==2) throw new Error('invalid-horizons');
  const lines=raw.split('$$SOE')[1].split('$$EOE')[0].trim().split('\n');
  if(lines.length<2||lines.length>5000) throw new Error('invalid-horizons');
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let previous=-Infinity;
  const rows=lines.map(line=>{
    const parts=line.split(',').map(x=>x.trim());
    const match=parts[0].match(/^(\d{4})-([A-Za-z]{3})-(\d{2}) (\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?$/);
    if(!match||parts.length!==8||parts[7]!==''||parts.slice(3,7).some(x=>!/^[-+]?\d+(\.\d+)?$/.test(x))) throw new Error('invalid-horizons');
    const [,year,month,day,hour,minute,second='0',fraction='0']=match;
    const m=months.indexOf(month), time=Date.UTC(+year,m,+day,+hour,+minute,+second,Math.round(Number('0.'+fraction)*1000));
    if(m<0||+day<1||+day>new Date(Date.UTC(+year,m+1,0)).getUTCDate()||+hour>23||+minute>59||+second>59||time<=previous||time<utcMillis(period.start)-1||time>utcMillis(period.end)+1) throw new Error('invalid-horizons');
    previous=time;
    const values=parts.slice(3,7).map(Number);
    if(values.some((v,i)=>Math.abs(v)>(i%2?90:360))) throw new Error('invalid-horizons');
    const vectors=lunarEphemeris(time);
    const error=(body:'sun'|'earth',offset:number)=>{
      const v=vectors[body],lon=Math.atan2(v[1],v[0])*180/Math.PI,lat=Math.asin(v[2]/Math.hypot(...v))*180/Math.PI;
      return {longitude:Math.abs(((lon-values[offset]+540)%360+360)%360-180),latitude:Math.abs(lat-values[offset+1])};
    };
    return {time,earth:error('earth',0),sun:error('sun',2)};
  });
  if(Math.abs(rows[0].time-utcMillis(period.start))>1||Math.abs(rows.at(-1)!.time-utcMillis(period.end))>1) throw new Error('invalid-horizons');
  return {rows,version:'1.2',maxEarthDeg:Math.max(...rows.flatMap(r=>[r.earth.latitude,r.earth.longitude])),maxSunDeg:Math.max(...rows.flatMap(r=>[r.sun.latitude,r.sun.longitude]))};
}
