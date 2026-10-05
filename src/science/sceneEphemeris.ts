import { lunarEphemeris, LUNAR_RADIUS_KM } from './ephemeris.ts';
import type { Vec3 } from './ephemeris.ts';

// Scientific lunar frame (X, east Y, north Z) -> display (X, north Y, west Z).
export function toSceneVector([x, y, z]: Vec3): Vec3 {
  return [x / LUNAR_RADIUS_KM, z / LUNAR_RADIUS_KM, -y / LUNAR_RADIUS_KM];
}
export function sceneEphemeris(timestamp: number) {
  const { sun, earth } = lunarEphemeris(timestamp);
  return { sun: toSceneVector(sun), earth: toSceneVector(earth) };
}
