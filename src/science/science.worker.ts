import { sphericalEngine } from './sphericalEngine';
import type { AnalysisPeriod, CandidateSite, MissionRequirements } from '../models';
self.onmessage = async (event: MessageEvent<{ sites: CandidateSite[]; period: AnalysisPeriod; mission?: MissionRequirements }>) => {
  try {
    self.postMessage({ report: await sphericalEngine.compare(event.data.sites, event.data.period, event.data.mission) });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'No se pudo completar el cálculo.' });
  }
};
