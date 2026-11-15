import type { ComparisonReport } from '../models.ts';
import { activeAnalysis } from '../lib/activeAnalysis.ts';
import { DEFAULT_RADIO } from './radioBudget.ts';
import { DEFAULT_DATA, simulateDataStorage } from './dataStorage.ts';
export function addDataAssessment(report:ComparisonReport) {
  if (!report.mission) return;
  for(const site of report.sites) {
    try {
      const active=activeAnalysis(site,report.mission);
      if(site.radio?.status!=='calculated'||!active.energy) throw new Error('data-link-unavailable');
      site.data={status:'calculated',model:active.model,...simulateDataStorage(site.radio.windows,active.energy.outages,
        (report.mission.radio??DEFAULT_RADIO).dataRateKbps,report.mission.data??DEFAULT_DATA)};
    } catch {site.data={status:'unavailable'};}
  }
}
