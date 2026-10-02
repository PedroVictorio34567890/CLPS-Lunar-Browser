import { Body, GeoMoon, HelioVector, MakeTime, RotationAxis } from 'astronomy-engine';
import type { Coordinates } from '../models.ts';

export type Vec3 = [number, number, number];
export const LUNAR_RADIUS_KM = 1737.4;
const AU_KM = 149597870.7;
const RAD = Math.PI / 180;
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Right-handed lunar body frame: X at 0° longitude, Y at 90° east, Z north.
 * This scientific frame differs from the Three.js display frame (+Y north).
 * IAU node = intersection of lunar and J2000 equators; W advances eastward.
 */
export function lunarEphemeris(timestamp: number): { sun: Vec3; earth: Vec3 } {
  const time = MakeTime(new Date(timestamp)); // UTC input; library derives TT.
  const moon = GeoMoon(time);
  const earth = HelioVector(Body.Earth, time);
  const axis = RotationAxis(Body.Moon, time);
  const alpha = axis.ra * 15 * RAD, delta = axis.dec * RAD, w = axis.spin * RAD;
  const node: Vec3 = [-Math.sin(alpha), Math.cos(alpha), 0];
  const perpendicular: Vec3 = [-Math.sin(delta) * Math.cos(alpha), -Math.sin(delta) * Math.sin(alpha), Math.cos(delta)];
  const x = node.map((v, i) => v * Math.cos(w) + perpendicular[i] * Math.sin(w)) as Vec3;
  const y = node.map((v, i) => -v * Math.sin(w) + perpendicular[i] * Math.cos(w)) as Vec3;
  const z: Vec3 = [axis.north.x, axis.north.y, axis.north.z];
  const bodyFixed = (v: Vec3): Vec3 => [dot(v, x) * AU_KM, dot(v, y) * AU_KM, dot(v, z) * AU_KM];
  return {
    earth: bodyFixed([-moon.x, -moon.y, -moon.z]),
    sun: bodyFixed([-earth.x - moon.x, -earth.y - moon.y, -earth.z - moon.z]),
  };
}

/** Geometric elevation of a body's CENTER from the actual surface point.
 * Subtracting the observer position matters especially for Earth near horizon.
 */
export function elevation(site: Coordinates, body: Vec3): number {
  const lat = site.latitude * RAD, lon = site.longitude * RAD;
  const normal: Vec3 = [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
  const lineOfSight = body.map((v, i) => v - LUNAR_RADIUS_KM * normal[i]) as Vec3;
  return Math.asin(Math.max(-1, Math.min(1, dot(normal, lineOfSight) / Math.hypot(...lineOfSight)))) / RAD;
}
