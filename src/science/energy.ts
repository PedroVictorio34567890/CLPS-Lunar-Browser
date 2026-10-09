import type { ElevationSample, EnergyReport, MissionRequirements } from '../models.ts';
import { missionError } from '../lib/mission.ts';
const HOUR = 3600000;
const RAD = Math.PI / 180;
export function solarPower(elevation: number, azimuth: number | null | undefined, m: MissionRequirements) {
  if (elevation <= 0) return 0;
  let incidence = 1;
  if (m.panelMode === 'fixed') {
    if (azimuth === undefined) throw new Error('Falta el azimut solar para el panel fijo.');
    const h = elevation * RAD, tilt = m.panelTiltDeg * RAD;
    incidence = Math.max(0, Math.sin(h) * Math.cos(tilt) + Math.cos(h) * Math.sin(tilt) * Math.cos(((azimuth ?? 0) - m.panelAzimuthDeg) * RAD));
  }
  return m.solarPowerW * m.generationFactorPercent / 100 * incidence;
}
/** Piecewise constant midpoint power. Split intervals at interpolated sunrise/sunset.
 * Ideal battery; continuous averaged load, no automatic load shedding at reserve.
 */
export function simulateEnergy(samples: ElevationSample[], m: MissionRequirements): EnergyReport {
  const error = missionError(m);
  if (error) throw new Error(error);
  if (samples.length < 2) throw new Error('Se necesitan al menos dos muestras.');
  const load = (m.operatingPowerW * m.operatingDutyPercent + m.standbyPowerW * (100 - m.operatingDutyPercent)) / 100;
  let charge = m.batteryWh * m.initialChargePercent / 100;
  const reserve = m.batteryWh * m.reservePercent / 100;
  const result: EnergyReport = { samples: [{ time: samples[0].time, chargeWh: charge }], generatedWh: 0, demandWh: 0, spilledWh: 0, unservedWh: 0, minChargeWh: charge, finalChargeWh: charge, loadW: load, firstReserveViolation: null, firstEmpty: charge === 0 ? samples[0].time : null, outages: [] };
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    if (!Number.isFinite(a.time) || !Number.isFinite(b.time) || b.time <= a.time || !Number.isFinite(a.sun) || !Number.isFinite(b.sun)) throw new Error('Serie temporal inválida.');
    const cuts = [0, 1];
    if (a.sun * b.sun < 0) cuts.splice(1, 0, -a.sun / (b.sun - a.sun));
    for (let j = 1; j < cuts.length; j++) {
      const lo = cuts[j - 1], hi = cuts[j], mid = (lo + hi) / 2;
      const start = a.time + (b.time - a.time) * lo, end = a.time + (b.time - a.time) * hi;
      const hours = (end - start) / HOUR;
      const azA = a.sunAzimuth ?? b.sunAzimuth, azB = b.sunAzimuth ?? a.sunAzimuth;
      const az = azA == null || azB == null ? azA : azA + (((azB - azA + 540) % 360) - 180) * mid;
      const generation = solarPower(a.sun + (b.sun - a.sun) * mid, az, m);
      const net = generation - load;
      result.generatedWh += generation * hours; result.demandWh += load * hours;
      const raw = charge + net * hours;
      if (net < 0) {
        if (raw < reserve - 1e-9 && result.firstReserveViolation === null) result.firstReserveViolation = start + Math.max(0, charge - reserve) / -net * HOUR;
        if (raw <= 0 && result.firstEmpty === null) result.firstEmpty = start + charge / -net * HOUR;
        if (raw < 0) {
          const lossStart = start + charge / -net * HOUR;
          result.unservedWh += -raw;
          const previous = result.outages.at(-1);
          if (previous && Math.abs(previous.end - lossStart) < 1) previous.end = end;
          else result.outages.push({ start: lossStart, end });
          if (lossStart > start) result.samples.push({ time: lossStart, chargeWh: 0 });
        }
      } else if (net > 0 && raw > m.batteryWh) {
        const fullTime = start + (m.batteryWh - charge) / net * HOUR;
        if (fullTime > start) result.samples.push({ time: fullTime, chargeWh: m.batteryWh });
        result.spilledWh += raw - m.batteryWh;
      }
      charge = Math.max(0, Math.min(m.batteryWh, raw));
      result.minChargeWh = Math.min(result.minChargeWh, charge);
      result.samples.push({ time: end, chargeWh: charge });
    }
  }
  result.finalChargeWh = charge;
  return result;
}
