import type { ComparisonReport } from '../models';
import { activeAnalysis } from '../lib/activeAnalysis';
import { DEFAULT_RADIO, radioBudget } from './radioBudget';
import { stationGeometry } from './stationGeometry';
import { iauLunarRotation } from './ephemeris';
import { loadLunarRotations } from './lunarFrameData';
import frameMetadata from './frameMetadata.json';
import { frameQuaternion, rotateToMoonME, utcToTtDays } from './lunarFrame';
import { horizonAt, OBSERVER_HEIGHT_M } from './terrain';
import { visibilityStatistics } from './statistics';
import { operationalWindows } from './operationalWindows';

export async function addRadioAssessment(report: ComparisonReport) {
  if (!report.mission) return;
  const mission=report.mission, settings=mission.radio ?? DEFAULT_RADIO;
  let rotations: Float64Array | null=null;
  if (report.sites.some(s=>s.terrain?.status==='local')) {
    try { rotations=await loadLunarRotations(); } catch { /* Covered sites fail explicitly below. */ }
  }
  for (const site of report.sites) {
    try {
      const active=activeAnalysis(site,mission), terrain=site.terrain?.status==='local' ? site.terrain : null;
      if (!active.series || !active.energy || (terrain && !rotations)) throw new Error('radio-missing-model');
      const geometrySamples: {time:number;altitude:number}[]=[], marginSamples: {time:number;altitude:number}[]=[];
      let minMarginDb=Infinity,maxMarginDb=-Infinity,minRangeKm=Infinity,maxRangeKm=0,minRateKbps=Infinity;
      let worst: ReturnType<typeof radioBudget> | undefined;
      for (const sample of active.series.samples) {
        const q=terrain ? frameQuaternion(frameMetadata,rotations!,utcToTtDays(sample.time)) : null;
        const rotate=q ? (v: import('./ephemeris').Vec3)=>rotateToMoonME(q,v) : iauLunarRotation(sample.time);
        const g=stationGeometry(site.site,sample.time,terrain ? terrain.elevationM+OBSERVER_HEIGHT_M : 0,settings,rotate);
        const horizon=terrain ? horizonAt(terrain.profile,g.lunarAzimuth) : 0;
        geometrySamples.push({time:sample.time,altitude:Math.min(g.groundElevation-settings.stationMinElevationDeg,g.lunarElevation-Math.max(horizon,mission.minEarthElevationDeg))});
        const budget=radioBudget(settings,g.rangeKm);
        marginSamples.push({time:sample.time,altitude:budget.marginDb});
        if (budget.marginDb<minMarginDb) {minMarginDb=budget.marginDb;worst=budget;}
        maxMarginDb=Math.max(maxMarginDb,budget.marginDb); minRateKbps=Math.min(minRateKbps,budget.maxRateKbps);
        minRangeKm=Math.min(minRangeKm,g.rangeKm);maxRangeKm=Math.max(maxRangeKm,g.rangeKm);
      }
      const geometry=visibilityStatistics(geometrySamples), radio=visibilityStatistics(marginSamples);
      // Intersect independently interpolated margin and geometry windows.
      const link=operationalWindows(geometry.windows,radio.windows.filter(w=>!w.visible));
      const windows=link.windows.map(w=>({start:w.start,end:w.end,visible:w.cause==='available'}));
      const powered=operationalWindows(windows,active.energy.outages);
      site.radio={status:'calculated',model:active.model,minMarginDb,maxMarginDb,minRateKbps,minRangeKm,maxRangeKm,worst:worst!,
        geometricPercent:geometry.percent,linkPercent:link.percent,poweredPercent:powered.percent,longestOutageHours:powered.longestOutageHours,windows};
    } catch { site.radio={status:'unavailable'}; }
  }
}
