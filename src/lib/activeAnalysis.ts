import type { MissionRequirements, SiteReport } from '../models.ts';
import { evaluateCommunications } from './mission.ts';

/** One selection policy shared by consumers; the spherical report remains an
 * explicit reference. Failed/outside terrain never acquires a terrain label. */
export function activeAnalysis(site: SiteReport, mission?: MissionRequirements) {
  const terrain = site.terrain;
  if (terrain?.status === 'local') return {
    model: 'terrain' as const, reason: 'local' as const, series: terrain.series,
    energy: terrain.energy, accessWindows: terrain.accessWindows,
    sunlightPercent: terrain.sunlightPercent, geometricPercent: terrain.accessPercent,
  };
  const communication = mission ? evaluateCommunications(site, mission) : null;
  return {
    model: 'sphere' as const, reason: terrain?.status ?? ('pending' as const), series: site.series,
    energy: site.energy, accessWindows: communication?.windows,
    sunlightPercent: site.sunlightPercent.value, geometricPercent: communication?.percent,
  };
}

export function analysisLabel(reason: ReturnType<typeof activeAnalysis>['reason'], en: boolean) {
  if (reason === 'local') return en ? 'LOLA terrain · 100 km' : 'Relieve LOLA · 100 km';
  const reasons = {
    outside: en ? 'outside LOLA site coverage' : 'fuera de cobertura local LOLA',
    unavailable: en ? 'terrain unavailable' : 'relieve no disponible',
    'frame-outside': en ? 'outside orientation dates' : 'fuera de fechas de orientación',
    pending: en ? 'terrain not calculated' : 'relieve sin calcular',
  };
  return `${en ? 'Sphere' : 'Esfera'} · ${reasons[reason]}`;
}
