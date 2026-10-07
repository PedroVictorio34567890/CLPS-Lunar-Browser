import type { MissionRequirements, SiteReport } from '../models.ts';
import { visibilityStatistics } from '../science/statistics.ts';

// Editable examples, not spacecraft specifications or NASA requirements.
export const DEFAULT_MISSION: MissionRequirements = {
  minEarthElevationDeg: 5, minAvailabilityPercent: 90, maxOutageHours: 6,
  operatingPowerW: 100, standbyPowerW: 30, solarPowerW: 300, panelMode: 'tracking',
  batteryWh: 2000, initialChargePercent: 100, reservePercent: 20,
};
export function missionError(m: MissionRequirements): string | null {
  const numeric = Object.entries(m).filter(([key]) => key !== 'panelMode');
  if (numeric.some(([, value]) => typeof value !== 'number' || !Number.isFinite(value))) return 'Completa todos los requisitos con números válidos.';
  if (m.minEarthElevationDeg < 0 || m.minEarthElevationDeg >= 90) return 'La elevación mínima debe estar entre 0° y menos de 90°.';
  if ([m.minAvailabilityPercent, m.initialChargePercent, m.reservePercent].some(v => v < 0 || v > 100)) return 'Los porcentajes deben estar entre 0 y 100.';
  if (m.maxOutageHours < 0) return 'La interrupción máxima no puede ser negativa.';
  if ([m.operatingPowerW, m.standbyPowerW, m.solarPowerW].some(v => v < 0) || m.batteryWh <= 0) return 'Las potencias deben ser positivas o cero y la capacidad de batería mayor que cero.';
  if (m.reservePercent > m.initialChargePercent) return 'La carga inicial no puede ser menor que la reserva mínima.';
  if (!['fixed', 'tracking'].includes(m.panelMode)) return 'Selecciona un modo de panel solar válido.';
  return null;
}
export function sameMission(a: MissionRequirements | undefined, b: MissionRequirements) {
  return !!a && (Object.keys(DEFAULT_MISSION) as (keyof MissionRequirements)[]).every(key => a[key] === b[key]);
}
export function evaluateCommunications(site: SiteReport, mission: MissionRequirements) {
  if (missionError(mission) || !site.series || site.series.samples.length < 2) return null;
  const statistics = visibilityStatistics(site.series.samples.map(sample => ({ time: sample.time, altitude: sample.earth - mission.minEarthElevationDeg })));
  const availabilityPass = statistics.percent + 1e-9 >= mission.minAvailabilityPercent;
  const outagePass = statistics.longestHiddenHours <= mission.maxOutageHours + 1e-9;
  return { ...statistics, availabilityPass, outagePass, passes: availabilityPass && outagePass,
    outages: statistics.windows.filter(window => !window.visible).sort((a, b) => (b.end - b.start) - (a.end - a.start)),
  };
}
