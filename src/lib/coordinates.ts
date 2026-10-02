import type { Coordinates } from '../models.ts';
const RAD = Math.PI / 180;
// Body-fixed sphere: +Y north, +X prime meridian, east toward -Z.
// Matches the NASA equirectangular map: central meridian 0°, north at top.
export function geographicToCartesian({ latitude, longitude }: Coordinates, radius = 1): [number, number, number] {
  const lat = latitude * RAD, lon = longitude * RAD;
  return [radius * Math.cos(lat) * Math.cos(lon), radius * Math.sin(lat), -radius * Math.cos(lat) * Math.sin(lon)];
}
export function cartesianToGeographic([x, y, z]: [number, number, number]): Coordinates {
  const radius = Math.hypot(x, y, z);
  if (!radius || !Number.isFinite(radius)) throw new Error('Punto 3D inválido');
  return { latitude: Math.asin(Math.max(-1, Math.min(1, y / radius))) / RAD, longitude: Math.atan2(-z, x) / RAD };
}
export function validCoordinates(c: Coordinates) {
  return Number.isFinite(c.latitude) && Number.isFinite(c.longitude) && Math.abs(c.latitude) <= 90 && Math.abs(c.longitude) <= 180;
}
// Working UI threshold, not a scientific mission eligibility constraint.
export const SOUTH_POLAR_BOUNDARY = -80;
export const isSouthPolar = (c: Coordinates) => c.latitude <= SOUTH_POLAR_BOUNDARY;
export const formatCoordinates = (c: Coordinates) => `${Math.abs(c.latitude).toFixed(3)}° ${c.latitude < 0 ? 'S' : 'N'} · ${Math.abs(c.longitude).toFixed(3)}° ${c.longitude < 0 ? 'O' : 'E'}`;
