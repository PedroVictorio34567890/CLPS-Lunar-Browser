import type { Coordinates } from '../models.ts';
import { LUNAR_RADIUS_KM } from './ephemeris.ts';
import type { Vec3 } from './ephemeris.ts';

const RAD = Math.PI / 180;
const dot = (a: Vec3, b: Vec3) => a.reduce((sum, v, i) => sum + v * b[i], 0);
/** Topocentric sky, observer at zero height on the same sphere as the report.
 * Azimuth: north=0°, east=90°. At a geographic pole longitude defines the meridian.
 */
export function localSky(site: Coordinates, body: Vec3, heightM = 0) {
  const lat = site.latitude * RAD, lon = site.longitude * RAD;
  const up: Vec3 = [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
  const east: Vec3 = [-Math.sin(lon), Math.cos(lon), 0];
  const north: Vec3 = [-Math.sin(lat) * Math.cos(lon), -Math.sin(lat) * Math.sin(lon), Math.cos(lat)];
  const los = body.map((v, i) => v - (LUNAR_RADIUS_KM + heightM / 1000) * up[i]) as Vec3;
  const e = dot(los, east), n = dot(los, north), u = dot(los, up);
  const distance = Math.hypot(...los);
  return {
    position: [e / LUNAR_RADIUS_KM, u / LUNAR_RADIUS_KM, -n / LUNAR_RADIUS_KM] as Vec3,
    elevation: Math.asin(Math.max(-1, Math.min(1, u / distance))) / RAD,
    azimuth: Math.hypot(e, n) / distance < 1e-12 ? null : (Math.atan2(e, n) / RAD + 360) % 360,
  };
}
