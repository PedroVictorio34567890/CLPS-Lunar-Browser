import type { ComparisonReport } from '../models.ts';
import type { SavedScenario } from './scenarios.ts';
import { copyInputs, validInputs } from './scenarios.ts';
import { periodError, utcMillis } from './period.ts';
import { activeAnalysis } from './activeAnalysis.ts';
import { operationalWindows } from '../science/operationalWindows.ts';

export function delayedScenario(source: SavedScenario, days: number): SavedScenario {
  if (!validInputs(source) || !Number.isInteger(days) || days < 1 || days > 30) throw new Error('invalid-delay');
  const shift = (value: string) => new Date(utcMillis(value) + days * 86400000).toISOString().slice(0, 16);
  const period = { start: shift(source.period.start), end: shift(source.period.end) };
  if (periodError(period)) throw new Error('invalid-delay-period');
  return { ...copyInputs(source), id: `${source.id}:delay:${days}`, name: `${source.name} (+${days} d)`, savedAt: source.savedAt, period };
}

export function summarizeScenario(scenario: SavedScenario, report: ComparisonReport) {
  return report.sites.map(site => {
    const active = activeAnalysis(site, scenario.mission), energy = active.energy;
    if (!active.accessWindows || !energy || active.sunlightPercent == null || active.geometricPercent == null) throw new Error('incomplete-comparison');
    const joint = operationalWindows(active.accessWindows, energy.outages);
    return {
      id: `${scenario.id}/${site.site.id}`, scenario, site: site.site,
      model: active.model, modelReason: active.reason,
      landing: site.landing,
      radio: site.radio?.status === 'calculated' ? site.radio : null,
      data: site.data?.status === 'calculated' ? site.data : null,
      geometricPercent: active.geometricPercent, jointPercent: joint.percent,
      longestOutageHours: joint.longestOutageHours, sunlightPercent: active.sunlightPercent,
      minChargePercent: energy.minChargeWh / scenario.mission.batteryWh * 100,
      unservedWh: energy.unservedWh,
      communicationsPass: joint.percent + 1e-9 >= scenario.mission.minAvailabilityPercent && joint.longestOutageHours <= scenario.mission.maxOutageHours + 1e-9,
      energyPass: energy.unservedWh <= 1e-9 && energy.firstReserveViolation === null,
    };
  });
}
export type ScenarioComparisonRow = ReturnType<typeof summarizeScenario>[number];
