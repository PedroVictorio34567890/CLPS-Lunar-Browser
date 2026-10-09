import type { AnalysisPeriod, CandidateSite, ComparisonReport, MissionRequirements } from '../models.ts';
import { isSouthPolar } from '../lib/coordinates.ts';
import { periodError } from '../lib/period.ts';
export interface ScienceEngine { compare(sites: CandidateSite[], period: AnalysisPeriod, mission?: MissionRequirements): Promise<ComparisonReport> }
// Replace only this adapter when ephemerides and a terrain model are available.
export const pendingEngine: ScienceEngine = {
  async compare(sites, period) {
    if (!sites.length || periodError(period)) throw new Error('Selecciona una ubicación y un periodo válido.');
    const pending = { status: 'pending', value: null } as const;
    return { engine: 'pending', period: { ...period }, sites: sites.map(site => ({
      site: { ...site }, sunlightPercent: pending, longestLightHours: pending, longestDarkHours: pending,
      earthVisibilityPercent: pending, longestCommunicationOutageHours: pending, viabilityScore: pending,
      warnings: [...(!isSouthPolar(site) ? ['Fuera de la región de trabajo del polo sur (80° S–90° S).'] : []), 'Efemérides y relieve local aún no incorporados.'],
      recommendation: null, horizon: { status: 'pending', samples: null },
    })) };
  },
};
