export interface BatterySettings { chargeEfficiencyPercent:number; dischargeEfficiencyPercent:number; maxChargeW:number; maxDischargeW:number }
// Ideal defaults preserve existing scenarios. Zero power limit means unlimited.
export const DEFAULT_BATTERY:BatterySettings={chargeEfficiencyPercent:100,dischargeEfficiencyPercent:100,maxChargeW:0,maxDischargeW:0};
export function validBattery(value:unknown):value is BatterySettings {
  if(!value||typeof value!=='object') return false;
  const b=value as BatterySettings;
  return Object.keys(DEFAULT_BATTERY).every(k=>Number.isFinite(b[k as keyof BatterySettings]))&&b.chargeEfficiencyPercent>0&&b.chargeEfficiencyPercent<=100&&b.dischargeEfficiencyPercent>0&&b.dischargeEfficiencyPercent<=100&&b.maxChargeW>=0&&b.maxDischargeW>=0&&b.maxChargeW<=1e9&&b.maxDischargeW<=1e9;
}
