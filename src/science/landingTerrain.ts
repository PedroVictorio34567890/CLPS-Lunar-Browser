import type { Coordinates } from '../models.ts';
import { validCoordinates } from '../lib/coordinates.ts';
import { southPolarXY, type DemGrid } from './terrain.ts';

export interface LandingSettings { radiusM:number; maxSlopeDeg:number; maxReliefM:number }
export const DEFAULT_LANDING:LandingSettings={radiusM:500,maxSlopeDeg:10,maxReliefM:100};
export function validLanding(value:unknown):value is LandingSettings {
  if(!value||typeof value!=='object') return false;
  const v=value as LandingSettings;
  return Object.keys(DEFAULT_LANDING).every(k=>typeof v[k as keyof LandingSettings]==='number'&&Number.isFinite(v[k as keyof LandingSettings]))&&v.radiusM>=40&&v.radiusM<=2000&&v.maxSlopeDeg>=0&&v.maxSlopeDeg<=90&&v.maxReliefM>=0&&v.maxReliefM<=20000;
}
export type LandingGrid=DemGrid & {id:string;source:string};
/** Include the full circle and a one-cell derivative stencil. No edge extrapolation. */
export function landingCoverage(grid:Omit<LandingGrid,'data'>,site:Coordinates,radiusM:number) {
  if(!validCoordinates(site)||site.latitude>=0) return false;
  const p=southPolarXY(site,grid.radiusM),k=1+(p.x*p.x+p.y*p.y)/(4*grid.radiusM**2),r=radiusM*k+grid.spacingM;
  return p.x-r>=grid.x0&&p.x+r<=grid.x0+(grid.width-1)*grid.spacingM&&p.y+r<=grid.y0&&p.y-r>=grid.y0-(grid.height-1)*grid.spacingM;
}
export type LandingResult = {status:'outside'|'unavailable'|'insufficient-resolution';spacingM?:number} | {
  status:'calculated';sourceId:string;source:string;spacingM:number;slopeBaselineM:number;settings:LandingSettings;
  sampleCount:number;minElevationM:number;maxElevationM:number;reliefM:number;meanSlopeDeg:number;p95SlopeDeg:number;maxSlopeDeg:number;
  aboveSlopePercent:number;planeSlopeDeg:number;residualRmsM:number;maxPositiveResidualM:number;maxNegativeResidualM:number;
  withinLimits:boolean;cells:{x:number;y:number;slope:number}[];cellWidthM:number;
};
export function assessLanding(grid:LandingGrid,site:Coordinates,settings:LandingSettings):LandingResult {
  if(!validLanding(settings)||!validCoordinates(site)) throw new Error('invalid-landing-input');
  if(!landingCoverage(grid,site,settings.radiusM)) return {status:'outside'};
  if(settings.radiusM<2*grid.spacingM) return {status:'insufficient-resolution',spacingM:grid.spacingM};
  if(grid.data.length!==grid.width*grid.height) throw new Error('invalid-landing-grid');
  const center=southPolarXY(site,grid.radiusM),k=1+(center.x**2+center.y**2)/(4*grid.radiusM**2),r=settings.radiusM;
  const points:{x:number;y:number;z:number;slope:number}[]=[];
  const col0=Math.ceil((center.x-r*k-grid.x0)/grid.spacingM),col1=Math.floor((center.x+r*k-grid.x0)/grid.spacingM);
  const row0=Math.ceil((grid.y0-center.y-r*k)/grid.spacingM),row1=Math.floor((grid.y0-center.y+r*k)/grid.spacingM);
  for(let row=row0;row<=row1;row++) for(let col=col0;col<=col1;col++) {
    const px=grid.x0+col*grid.spacingM,py=grid.y0-row*grid.spacingM,x=(px-center.x)/k,y=(py-center.y)/k;
    if(x*x+y*y>r*r) continue;
    const i=row*grid.width+col,z=grid.data[i],left=grid.data[i-1],right=grid.data[i+1],up=grid.data[i-grid.width],down=grid.data[i+grid.width];
    if([z,left,right,up,down].some(v=>!Number.isFinite(v))) return {status:'unavailable'};
    const scale=1+(px*px+py*py)/(4*grid.radiusM**2);
    const slope=Math.atan(Math.hypot(right-left,up-down)*scale/(2*grid.spacingM))*180/Math.PI;
    points.push({x,y,z,slope});
  }
  if(points.length<9) return {status:'insufficient-resolution',spacingM:grid.spacingM};
  // Least-squares plane in centred projected coordinates, corrected for local scale.
  const n=points.length, mx=points.reduce((s,p)=>s+p.x,0)/n,my=points.reduce((s,p)=>s+p.y,0)/n,mz=points.reduce((s,p)=>s+p.z,0)/n;
  let xx=0,yy=0,xy=0,xz=0,yz=0;
  for(const p of points){const x=p.x-mx,y=p.y-my,z=p.z-mz;xx+=x*x;yy+=y*y;xy+=x*y;xz+=x*z;yz+=y*z;}
  const det=xx*yy-xy*xy;
  if(det<=0) return {status:'unavailable'};
  const a=(xz*yy-yz*xy)/det,b=(yz*xx-xz*xy)/det;
  let sumResidual2=0,maxPositive=0,maxNegative=0;
  const slopes=points.map(p=>p.slope).sort((a,b)=>a-b);
  const elevations=points.map(p=>p.z),minElevationM=Math.min(...elevations),maxElevationM=Math.max(...elevations),reliefM=maxElevationM-minElevationM;
  const binWidth=2*r/25,bins=new Map<string,{x:number;y:number;slope:number}>();
  for(const p of points){
    const residual=p.z-(mz+a*(p.x-mx)+b*(p.y-my));sumResidual2+=residual**2;maxPositive=Math.max(maxPositive,residual);maxNegative=Math.max(maxNegative,-residual);
    const bx=Math.min(24,Math.floor((p.x+r)/binWidth)),by=Math.min(24,Math.floor((p.y+r)/binWidth)),key=`${bx}/${by}`,old=bins.get(key);
    // Plot retains the maximum measured slope in each display bin.
    bins.set(key,{x:-r+(bx+.5)*binWidth,y:-r+(by+.5)*binWidth,slope:Math.max(old?.slope??0,p.slope)});
  }
  return {status:'calculated',sourceId:grid.id,source:grid.source,spacingM:grid.spacingM,slopeBaselineM:2*grid.spacingM/k,settings:{...settings},sampleCount:n,minElevationM,maxElevationM,reliefM,
    meanSlopeDeg:slopes.reduce((s,v)=>s+v,0)/n,p95SlopeDeg:slopes[Math.ceil(.95*n)-1],maxSlopeDeg:slopes.at(-1)!,aboveSlopePercent:100*slopes.filter(v=>v>settings.maxSlopeDeg+1e-9).length/n,
    planeSlopeDeg:Math.atan(Math.hypot(a,b))*180/Math.PI,residualRmsM:Math.sqrt(sumResidual2/n),maxPositiveResidualM:maxPositive,maxNegativeResidualM:maxNegative,
    withinLimits:slopes.at(-1)!<=settings.maxSlopeDeg+1e-9&&reliefM<=settings.maxReliefM+1e-9,cells:[...bins.values()],cellWidthM:binWidth};
}
