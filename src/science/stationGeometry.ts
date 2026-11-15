import { Observer, ObserverVector } from 'astronomy-engine';
import type { Coordinates } from '../models.ts';
import type { RadioSettings } from './radioBudget.ts';
import { inertialLunarEphemeris, LUNAR_RADIUS_KM } from './ephemeris.ts';
import type { Vec3 } from './ephemeris.ts';
import { localSky } from './localSky.ts';

export function stationGeometry(site: Coordinates, time: number, heightM: number, r: RadioSettings, rotate: (v:Vec3)=>Vec3) {
  const date=new Date(time), observer=new Observer(r.stationLatitude,r.stationLongitude,r.stationHeightM);
  const position=ObserverVector(date,observer,false);
  const above=ObserverVector(date,new Observer(r.stationLatitude,r.stationLongitude,r.stationHeightM+1000),false);
  const up=rotate([above.x-position.x,above.y-position.y,above.z-position.z]);
  const earth=inertialLunarEphemeris(time).earth;
  const station=rotate([earth[0]+position.x*149597870.7,earth[1]+position.y*149597870.7,earth[2]+position.z*149597870.7]);
  const lat=site.latitude*Math.PI/180, lon=site.longitude*Math.PI/180, radius=LUNAR_RADIUS_KM+heightM/1000;
  const local:Vec3=[radius*Math.cos(lat)*Math.cos(lon),radius*Math.cos(lat)*Math.sin(lon),radius*Math.sin(lat)];
  const los=station.map((v,i)=>v-local[i]) as Vec3, rangeKm=Math.hypot(...los);
  const groundElevation=Math.asin(Math.max(-1,Math.min(1,-los.reduce((sum,v,i)=>sum+v*up[i],0)/rangeKm/Math.hypot(...up))))*180/Math.PI;
  const sky=localSky(site,station,heightM);
  return {rangeKm,groundElevation,lunarElevation:sky.elevation,lunarAzimuth:sky.azimuth};
}
