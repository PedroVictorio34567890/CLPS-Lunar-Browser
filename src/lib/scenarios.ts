import type { AnalysisPeriod, CandidateSite, MissionRequirements } from '../models.ts';
import { missionError, DEFAULT_MISSION } from './mission.ts';
import { periodError } from './period.ts';
import { validCoordinates } from './coordinates.ts';
import { MAX_SITES, SITE_COLORS } from './sites.ts';

export const SCENARIO_KEY = 'lunar-mission-scenarios-v1';
export interface ScenarioInputs { sites: CandidateSite[]; period: AnalysisPeriod; mission: MissionRequirements }
export interface SavedScenario extends ScenarioInputs { id: string; name: string; savedAt: string }
export interface ScenarioLibrary { version: 1; scenarios: SavedScenario[] }
export const MAX_SCENARIOS = 50;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export function validInputs(value: unknown): value is ScenarioInputs {
  if (!object(value) || !Array.isArray(value.sites) || value.sites.length < 1 || value.sites.length > MAX_SITES || !object(value.period) || !object(value.mission)) return false;
  const { sites, period, mission } = value;
  if (typeof period.start !== 'string' || typeof period.end !== 'string' || periodError(period as unknown as AnalysisPeriod) || missionError(mission as unknown as MissionRequirements)) return false;
  const ids = new Set(), slots = new Set();
  for (const site of sites) {
    if (!object(site) || typeof site.latitude !== 'number' || typeof site.longitude !== 'number' || !validCoordinates(site as unknown as CandidateSite) || typeof site.id !== 'string' || !site.id || !Number.isInteger(site.slot) || (site.slot as number) < 0 || (site.slot as number) >= MAX_SITES || site.color !== SITE_COLORS[site.slot as number] || ids.has(site.id) || slots.has(site.slot)) return false;
    ids.add(site.id); slots.add(site.slot);
  }
  return true;
}

// Explicit fields keep fingerprints stable and prevent reports or extra data being saved.
export function copyInputs(value: ScenarioInputs): ScenarioInputs {
  return {
    sites: value.sites.map(s => ({ id: s.id, slot: s.slot, color: s.color, latitude: s.latitude, longitude: s.longitude })),
    period: { start: value.period.start, end: value.period.end },
    mission: Object.fromEntries(Object.keys(DEFAULT_MISSION).map(key => [key, value.mission[key as keyof MissionRequirements]])) as unknown as MissionRequirements,
  };
}
export const inputsKey = (value: ScenarioInputs) => JSON.stringify(copyInputs(value));
export function parseLibrary(raw: string | null): ScenarioLibrary {
  if (raw === null) return { version: 1, scenarios: [] };
  const parsed: unknown = JSON.parse(raw);
  if (!object(parsed) || parsed.version !== 1 || !Array.isArray(parsed.scenarios) || parsed.scenarios.length > MAX_SCENARIOS) throw new Error('invalid-library');
  const ids = new Set<string>();
  for (const scenario of parsed.scenarios) {
    if (!object(scenario) || !validInputs(scenario) || typeof scenario.id !== 'string' || !scenario.id || ids.has(scenario.id) || typeof scenario.name !== 'string' || !scenario.name.trim() || scenario.name.length > 80 || typeof scenario.savedAt !== 'string' || !Number.isFinite(Date.parse(scenario.savedAt))) throw new Error('invalid-library');
    ids.add(scenario.id);
  }
  return { version: 1, scenarios: (parsed.scenarios as SavedScenario[]).map(s => ({ ...copyInputs(s), id: s.id, name: s.name, savedAt: s.savedAt })) };
}
export function makeScenario(inputs: ScenarioInputs, name: string, id: string, savedAt: string): SavedScenario {
  if (!validInputs(inputs) || !name.trim() || name.trim().length > 80) throw new Error('invalid-scenario');
  return { ...copyInputs(inputs), name: name.trim(), id, savedAt };
}
export function writeLibrary(storage: Pick<Storage, 'getItem' | 'setItem'>, previous: string | null, library: ScenarioLibrary): string {
  if (storage.getItem(SCENARIO_KEY) !== previous) throw new Error('storage-conflict');
  const next = JSON.stringify(library);
  parseLibrary(next);
  storage.setItem(SCENARIO_KEY, next);
  return next;
}
