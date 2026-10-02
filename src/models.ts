export interface Coordinates { latitude: number; longitude: number }
export interface CandidateSite extends Coordinates { id: string; slot: number; color: string }
export interface AnalysisPeriod { start: string; end: string }
export type Metric = { status: 'pending'; value: null } | { status: 'calculated'; value: number };
export interface ElevationSample { time: number; sun: number; earth: number }
export interface VisibilityWindow { start: number; end: number; visible: boolean }
export interface SiteSeries {
  samples: ElevationSample[];
  sunlight: VisibilityWindow[];
  earthVisibility: VisibilityWindow[];
}
export interface SiteReport {
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
  engine: 'pending' | 'spherical-v1';
  period: AnalysisPeriod;
  sites: SiteReport[];
  methodology?: { ephemeris: string; stepMinutes: number; sampleCount: number; scoreFormula: string; assumptions: string[] };
}
