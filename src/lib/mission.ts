import type { MissionRequirements, SiteReport } from '../models.ts';
import { visibilityStatistics } from '../science/statistics.ts';
import { DEFAULT_RADIO, validRadio } from '../science/radioBudget.ts';
import { DEFAULT_DATA, validData } from '../science/dataStorage.ts';

import { DEFAULT_BATTERY, validBattery } from '../science/batterySettings.ts';

import { DEFAULT_LANDING, validLanding } from '../science/landingTerrain.ts';

// Editable examples, not spacecraft specifications or NASA requirements.
export const DEFAULT_MISSION: MissionRequirements = {
  landing:{...DEFAULT_LANDING},
  battery:{...DEFAULT_BATTERY},
  data:{...DEFAULT_DATA},
  radio: {...DEFAULT_RADIO},
  minEarthElevationDeg: 5, minAvailabilityPercent: 90, maxOutageHours: 6,
  operatingPowerW: 100, standbyPowerW: 30, solarPowerW: 300, panelMode: 'tracking',
  batteryWh: 2000, initialChargePercent: 100, reservePercent: 20,
  operatingDutyPercent: 100, generationFactorPercent: 85, panelTiltDeg: 90, panelAzimuthDeg: 0,
};
export function missionError(m: MissionRequirements): string | null {
  const numeric = (Object.keys(DEFAULT_MISSION) as (keyof MissionRequirements)[]).filter(key => key !== 'panelMode' && key !== 'radio' && key !== 'data' && key !== 'battery' && key !== 'landing');
  if (m.landing !== undefined && !validLanding(m.landing)) return 'Revisa el radio de estudio y los límites de pendiente y desnivel.';
  if (m.battery !== undefined && !validBattery(m.battery)) return 'Revisa las eficiencias y los límites de potencia de la batería.';
  if (m.data !== undefined && !validData(m.data)) return 'Revisa la generación de datos, la memoria y la eficiencia de transmisión.';
  if (m.radio !== undefined && !validRadio(m.radio)) return 'Revisa los parámetros de radio y de la estación terrestre.';
  if (numeric.some(key => typeof m[key] !== 'number' || !Number.isFinite(m[key]))) return 'Completa todos los requisitos con números válidos.';
  if (m.minEarthElevationDeg < 0 || m.minEarthElevationDeg >= 90) return 'La elevación mínima debe estar entre 0° y menos de 90°.';
  if ([m.minAvailabilityPercent, m.initialChargePercent, m.reservePercent, m.operatingDutyPercent, m.generationFactorPercent].some(v => v < 0 || v > 100)) return 'Los porcentajes deben estar entre 0 y 100.';
  if (m.panelTiltDeg < 0 || m.panelTiltDeg > 90 || m.panelAzimuthDeg < 0 || m.panelAzimuthDeg >= 360) return 'Inclinación entre 0° y 90°; azimut entre 0° y menos de 360°.';
  if (m.maxOutageHours < 0) return 'La interrupción máxima no puede ser negativa.';
  if ([m.operatingPowerW, m.standbyPowerW, m.solarPowerW].some(v => v < 0) || m.batteryWh <= 0) return 'Las potencias deben ser positivas o cero y la capacidad de batería mayor que cero.';
  if (m.reservePercent > m.initialChargePercent) return 'La carga inicial no puede ser menor que la reserva mínima.';
  if (!['fixed', 'tracking'].includes(m.panelMode)) return 'Selecciona un modo de panel solar válido.';
  return null;
}
export function sameMission(a: MissionRequirements | undefined, b: MissionRequirements) {
  return !!a && (Object.keys(DEFAULT_MISSION) as (keyof MissionRequirements)[]).every(key => key === 'landing' ? (Object.keys(DEFAULT_LANDING) as (keyof typeof DEFAULT_LANDING)[]).every(k=>(a.landing ?? DEFAULT_LANDING)[k]===(b.landing ?? DEFAULT_LANDING)[k]) : key === 'battery' ? (Object.keys(DEFAULT_BATTERY) as (keyof typeof DEFAULT_BATTERY)[]).every(k=>(a.battery ?? DEFAULT_BATTERY)[k]===(b.battery ?? DEFAULT_BATTERY)[k]) : key === 'radio' ? (Object.keys(DEFAULT_RADIO) as (keyof typeof DEFAULT_RADIO)[]).every(k=>(a.radio ?? DEFAULT_RADIO)[k]===(b.radio ?? DEFAULT_RADIO)[k]) : key === 'data' ? (Object.keys(DEFAULT_DATA) as (keyof typeof DEFAULT_DATA)[]).every(k=>(a.data ?? DEFAULT_DATA)[k]===(b.data ?? DEFAULT_DATA)[k]) : a[key] === b[key]);
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
