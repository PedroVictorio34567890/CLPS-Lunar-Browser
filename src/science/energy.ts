import type { ElevationSample, EnergyReport, MissionRequirements } from '../models.ts';
import { missionError } from '../lib/mission.ts';
import { DEFAULT_BATTERY } from './batterySettings.ts';
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
 * Configurable conversion losses and bus power limits; reserve does not shed load.
 */
export function simulateEnergy(samples: ElevationSample[], m: MissionRequirements): EnergyReport {
  const error = missionError(m);
  if (error) throw new Error(error);
  if (samples.length < 2) throw new Error('Se necesitan al menos dos muestras.');
  const battery=m.battery??DEFAULT_BATTERY, chargeEfficiency=battery.chargeEfficiencyPercent/100, dischargeEfficiency=battery.dischargeEfficiencyPercent/100;
  const load = (m.operatingPowerW * m.operatingDutyPercent + m.standbyPowerW * (100 - m.operatingDutyPercent)) / 100;
  let charge = m.batteryWh * m.initialChargePercent / 100;
  const reserve = m.batteryWh * m.reservePercent / 100;
  const result: EnergyReport = { batteryLossWh:0, samples: [{ time: samples[0].time, chargeWh: charge }], generatedWh: 0, demandWh: 0, spilledWh: 0, unservedWh: 0, minChargeWh: charge, finalChargeWh: charge, loadW: load, firstReserveViolation: null, firstEmpty: charge === 0 ? samples[0].time : null, outages: [] };
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    if (!Number.isFinite(a.time) || !Number.isFinite(b.time) || b.time <= a.time || !Number.isFinite(a.sun) || !Number.isFinite(b.sun)) throw new Error('Serie temporal inválida.');
    const cuts = [0, 1];
    if (a.sun * b.sun < 0) cuts.splice(1, 0, -a.sun / (b.sun - a.sun));
    const clearanceA = a.sunClearance ?? a.sun, clearanceB = b.sunClearance ?? b.sun;
    if (!Number.isFinite(clearanceA) || !Number.isFinite(clearanceB)) throw new Error('Serie temporal inválida.');
    if (clearanceA * clearanceB < 0) {
      const crossing = -clearanceA / (clearanceB - clearanceA);
      if (!cuts.includes(crossing)) cuts.push(crossing);
    }
    cuts.sort((x, y) => x - y);
    for (let j = 1; j < cuts.length; j++) {
      const lo = cuts[j - 1], hi = cuts[j], mid = (lo + hi) / 2;
      const start = a.time + (b.time - a.time) * lo, end = a.time + (b.time - a.time) * hi;
      const hours = (end - start) / HOUR;
      const azA = a.sunAzimuth ?? b.sunAzimuth, azB = b.sunAzimuth ?? a.sunAzimuth;
      const az = azA == null || azB == null ? azA : azA + (((azB - azA + 540) % 360) - 180) * mid;
      const distanceA=a.solarDistanceKm??149597870.7, distanceB=b.solarDistanceKm??149597870.7;
      if(!Number.isFinite(distanceA)||!Number.isFinite(distanceB)||distanceA<=0||distanceB<=0) throw new Error('Serie temporal inválida.');
      const distanceFactor=(149597870.7/(distanceA+(distanceB-distanceA)*mid))**2;
      const generation = clearanceA + (clearanceB - clearanceA) * mid > 0 ? solarPower(a.sun + (b.sun - a.sun) * mid, az, m)*distanceFactor : 0;
      const net = generation-load;
      result.generatedWh+=generation*hours;result.demandWh+=load*hours;
      if(net>=0) {
        const inputW=Math.min(net,battery.maxChargeW||Infinity);
        const stored=Math.min(m.batteryWh-charge,inputW*chargeEfficiency*hours);
        const inputWh=stored/chargeEfficiency;
        result.batteryLossWh!+=inputWh-stored;result.spilledWh+=net*hours-inputWh;
        if(inputW>0&&stored<inputW*chargeEfficiency*hours&&stored>0) result.samples.push({time:start+stored/(inputW*chargeEfficiency)*HOUR,chargeWh:m.batteryWh});
        charge+=stored;
      } else {
        const deficit=-net,outputW=Math.min(deficit,battery.maxDischargeW||Infinity),drainW=outputW/dischargeEfficiency;
        const activeHours=Math.min(hours,charge/drainW),withdrawn=drainW*activeHours,served=outputW*activeHours;
        const raw=charge-drainW*hours;
        if(raw<reserve-1e-9&&result.firstReserveViolation===null) result.firstReserveViolation=start+Math.max(0,charge-reserve)/drainW*HOUR;
        if(raw<=0&&result.firstEmpty===null) result.firstEmpty=start+activeHours*HOUR;
        result.batteryLossWh!+=withdrawn-served;
        const unserved=Math.max(0,deficit*hours-served);result.unservedWh+=unserved;
        if(unserved>1e-9) {
          const lossStart=outputW<deficit?start:start+activeHours*HOUR;
          const previous=result.outages.at(-1);
          if(previous&&Math.abs(previous.end-lossStart)<1) previous.end=end;
          else result.outages.push({start:lossStart,end});
        }
        if(activeHours>0&&activeHours<hours) result.samples.push({time:start+activeHours*HOUR,chargeWh:0});
        charge=Math.max(0,charge-withdrawn);
      }
      result.minChargeWh = Math.min(result.minChargeWh, charge);
      result.samples.push({ time: end, chargeWh: charge });
    }
  }
  result.finalChargeWh = charge;
  return result;
}
