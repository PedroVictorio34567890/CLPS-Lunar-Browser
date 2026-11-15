import metadata from './terrainMetadata.json';
import regional from './regionalMetadata.json';
import type { ComparisonReport } from '../models';
import { assessLanding, DEFAULT_LANDING, landingCoverage, type LandingGrid } from './landingTerrain';

async function loadLandingGrid(fine:boolean):Promise<LandingGrid> {
  const m=fine?metadata:regional,bytes=fine?4:2;
  const response=await fetch(`${import.meta.env.BASE_URL}terrain/${fine?'shackleton-20m.f32':'south-pole-80m.i16'}`);
  if(!response.ok) throw new Error('landing-download');
  const buffer=await response.arrayBuffer();
  if(buffer.byteLength!==m.width*m.height*bytes) throw new Error('landing-size');
  const digest=await crypto.subtle.digest('SHA-256',buffer);
  if(Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')!==m.sha256) throw new Error('landing-checksum');
  const view=new DataView(buffer),data=Float32Array.from({length:m.width*m.height},(_,i)=>fine?view.getFloat32(i*4,true):view.getInt16(i*2,true)*regional.scaleM);
  return {...m,data};
}

/** Static topographic screening, independent of temporal frame/sky coverage. */
export async function addLandingAssessment(report:ComparisonReport) {
  if(!report.mission) return;
  const settings=report.mission.landing??DEFAULT_LANDING;
  // Per-analysis sharing: each selected DEM is verified once; failures never use a coarser substitute.
  const grids=new Map<boolean,Promise<LandingGrid>>();
  for(const site of report.sites){
    const fine=landingCoverage(metadata,site.site,settings.radiusM),coarse=landingCoverage(regional,site.site,settings.radiusM);
    if(!fine&&!coarse){site.landing={status:'outside'};continue;}
    const spacing=fine?metadata.spacingM:regional.spacingM;
    if(settings.radiusM<2*spacing){site.landing={status:'insufficient-resolution',spacingM:spacing};continue;}
    try{
      if(!grids.has(fine)) grids.set(fine,loadLandingGrid(fine));
      site.landing=assessLanding(await grids.get(fine)!,site.site,settings);
    }catch{site.landing={status:'unavailable'};}
  }
}
