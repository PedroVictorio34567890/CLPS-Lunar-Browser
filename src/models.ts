export interface Coordinates { latitude: number; longitude: number }
export interface CandidateSite extends Coordinates { id: string; slot: number; color: string }
export interface AnalysisPeriod { start: string; end: string }
export interface MissionRequirements {
  landing?: import('./science/landingTerrain').LandingSettings;
  battery?: import('./science/batterySettings').BatterySettings;
  data?: import('./science/dataStorage').DataSettings;
  radio?: import('./science/radioBudget').RadioSettings;
  minEarthElevationDeg: number;
  minAvailabilityPercent: number;
  maxOutageHours: number;
  operatingPowerW: number;
  standbyPowerW: number;
  solarPowerW: number;
  panelMode: 'tracking' | 'fixed';
  batteryWh: number;
  initialChargePercent: number;
  reservePercent: number;
  operatingDutyPercent: number;
  generationFactorPercent: number;
  panelTiltDeg: number;
  panelAzimuthDeg: number;
}
export type Metric = { status: 'pending'; value: null } | { status: 'calculated'; value: number };
export interface ElevationSample { solarDistanceKm?: number; time: number; sun: number; earth: number; sunAzimuth?: number | null; sunClearance?: number }
export interface EnergyReport {
  batteryLossWh?: number;
  samples: { time: number; chargeWh: number }[];
  generatedWh: number; demandWh: number; spilledWh: number; unservedWh: number;
  minChargeWh: number; finalChargeWh: number; loadW: number;
  firstReserveViolation: number | null; firstEmpty: number | null;
  outages: { start: number; end: number }[];
}
export interface VisibilityWindow { start: number; end: number; visible: boolean }
export interface SiteSeries {
  samples: ElevationSample[];
  sunlight: VisibilityWindow[];
  earthVisibility: VisibilityWindow[];
}
export interface TerrainSkySample { time: number; sun: [number, number, number]; earth: [number, number, number] }
export interface SiteReport {
  landing?: import('./science/landingTerrain').LandingResult;
  data?: {status:'unavailable'} | ({status:'calculated';model:'terrain'|'sphere'} & import('./science/dataStorage').DataStorageResult);
  radio?: {status:'unavailable'} | {status:'calculated'; model:'terrain'|'sphere'; minMarginDb:number; maxMarginDb:number; minRateKbps:number; minRangeKm:number; maxRangeKm:number; geometricPercent:number; linkPercent:number; poweredPercent:number; longestOutageHours:number; windows:VisibilityWindow[]; worst: ReturnType<typeof import('./science/radioBudget').radioBudget>};
  terrain?: { status: 'outside' | 'unavailable' | 'frame-outside' } | { status: 'local'; series: SiteSeries; accessWindows: VisibilityWindow[]; energy: EnergyReport; sky: TerrainSkySample[]; rangeM: number; localProfile: { azimuth: number; elevation: number }[]; nearAccessPercent: number; nearOutageHours: number; geometricOutageHours: number; elevationM: number; profile: { azimuth: number; elevation: number }[]; sunlightPercent: number; accessPercent: number; longestOutageHours: number; minChargePercent: number; unservedWh: number; jointPercent: number };
  energy?: EnergyReport;
  site: CandidateSite;
  sunlightPercent: Metric;
  longestLightHours: Metric;
  longestDarkHours: Metric;
  earthVisibilityPercent: Metric;
  longestCommunicationOutageHours: Metric;
  viabilityScore: Metric;
  warnings: string[];
  recommendation: string | null;
  horizon: { status: 'pending'; samples: null };
  series?: SiteSeries;
}
export interface ComparisonReport {
  mission?: MissionRequirements;
  engine: 'pending' | 'spherical-v1';
  period: AnalysisPeriod;
  sites: SiteReport[];
  methodology?: { ephemeris: string; stepMinutes: number; sampleCount: number; scoreFormula: string; assumptions: string[] };
}
