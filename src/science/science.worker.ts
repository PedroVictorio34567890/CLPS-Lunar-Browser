import { sphericalEngine } from './sphericalEngine';
import { addTerrainAssessment } from './terrainAssessment';
import { addRadioAssessment } from './radioAssessment';
import { addLandingAssessment } from './landingAssessment';
import { addDataAssessment } from './dataAssessment';
import type { AnalysisPeriod, CandidateSite, MissionRequirements } from '../models';
self.onmessage = async (event: MessageEvent<{ sites: CandidateSite[]; period: AnalysisPeriod; mission?: MissionRequirements }>) => {
  try {
    const report = await sphericalEngine.compare(event.data.sites, event.data.period, event.data.mission);
    await addTerrainAssessment(report);
    await addRadioAssessment(report);
    addDataAssessment(report);
    await addLandingAssessment(report);
    self.postMessage({ report });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'No se pudo completar el cálculo.' });
  }
};
