export interface RadioSettings {
  frequencyGHz: number; transmitPowerW: number; transmitGainDbi: number;
  receiveGainDbi: number; noiseTemperatureK: number; lossesDb: number;
  dataRateKbps: number; requiredEbN0Db: number; designMarginDb: number;
  stationLatitude: number; stationLongitude: number; stationHeightM: number; stationMinElevationDeg: number;
}
// Illustrative user equipment, not a DSN station specification or allocation.
export const DEFAULT_RADIO: RadioSettings = {
  frequencyGHz:8.4, transmitPowerW:20, transmitGainDbi:20, receiveGainDbi:55,
  noiseTemperatureK:100, lossesDb:3, dataRateKbps:100, requiredEbN0Db:4, designMarginDb:3,
  stationLatitude:40, stationLongitude:-4, stationHeightM:600, stationMinElevationDeg:10,
};
export function validRadio(value: unknown): value is RadioSettings {
  if (!value || typeof value!=='object') return false;
  const r=value as RadioSettings;
  if (Object.keys(DEFAULT_RADIO).some(k=>typeof r[k as keyof RadioSettings]!=='number' || !Number.isFinite(r[k as keyof RadioSettings]))) return false;
  return r.frequencyGHz>=1e-6 && r.frequencyGHz<=100 && r.transmitPowerW>=1e-6 && r.transmitPowerW<=1e6 &&
    r.transmitGainDbi>=-30 && r.transmitGainDbi<=100 && r.receiveGainDbi>=-30 && r.receiveGainDbi<=100 &&
    r.noiseTemperatureK>=1e-6 && r.noiseTemperatureK<=1e6 && r.lossesDb>=0 && r.lossesDb<=100 &&
    r.dataRateKbps>=1e-6 && r.dataRateKbps<=1e9 && r.requiredEbN0Db>=-10 && r.requiredEbN0Db<=100 &&
    r.designMarginDb>=0 && r.designMarginDb<=100 && Math.abs(r.stationLatitude)<=90 && Math.abs(r.stationLongitude)<=180 &&
    r.stationHeightM>=-500 && r.stationHeightM<=10000 && r.stationMinElevationDeg>=0 && r.stationMinElevationDeg<90;
}
/** One-way downlink, information bit rate. Gains refer to boresight; losses
 * include pointing, atmosphere, polarization and implementation, once only. */
export function radioBudget(r: RadioSettings, rangeKm: number) {
  if (!validRadio(r) || !Number.isFinite(rangeKm) || rangeKm<1e-6) throw new Error('invalid-radio-budget');
  const eirpDbw=10*Math.log10(r.transmitPowerW)+r.transmitGainDbi;
  const freeSpaceLossDb=20*Math.log10(4*Math.PI*rangeKm*1000*r.frequencyGHz*1e9/299792458);
  const receivedDbw=eirpDbw-freeSpaceLossDb-r.lossesDb+r.receiveGainDbi;
  const noiseDensityDbwHz=10*Math.log10(1.380649e-23*r.noiseTemperatureK);
  const cn0DbHz=receivedDbw-noiseDensityDbwHz;
  const ebN0Db=cn0DbHz-10*Math.log10(r.dataRateKbps*1000);
  const marginDb=ebN0Db-r.requiredEbN0Db-r.designMarginDb;
  return {eirpDbw,freeSpaceLossDb,receivedDbw,cn0DbHz,ebN0Db,marginDb,
    maxRateKbps:10**((cn0DbHz-r.requiredEbN0Db-r.designMarginDb)/10)/1000};
}
