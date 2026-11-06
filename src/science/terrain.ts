import type { Coordinates } from '../models.ts';
export interface DemGrid { width: number; height: number; x0: number; y0: number; spacingM: number; radiusM: number; data: Float32Array }
const RAD = Math.PI / 180;
export const TERRAIN_RANGE_M = 3000;
export const REGIONAL_RANGE_M = 100000;
export const OBSERVER_HEIGHT_M = 2;
export function southPolarXY(site: Coordinates, radiusM: number) {
  const rho = 2 * radiusM * Math.tan((90 + site.latitude) * RAD / 2);
  return { x: rho * Math.sin(site.longitude * RAD), y: rho * Math.cos(site.longitude * RAD) };
}
export function demHeight(grid: DemGrid, site: Coordinates): number | null {
  const { x, y } = southPolarXY(site, grid.radiusM);
  const col = (x - grid.x0) / grid.spacingM, row = (grid.y0 - y) / grid.spacingM;
  if (!Number.isFinite(col) || !Number.isFinite(row) || col < 0 || row < 0 || col >= grid.width - 1 || row >= grid.height - 1) return null;
  const c = Math.floor(col), r = Math.floor(row), u = col - c, v = row - r;
  const samples = [grid.data[r * grid.width + c], grid.data[r * grid.width + c + 1], grid.data[(r + 1) * grid.width + c], grid.data[(r + 1) * grid.width + c + 1]];
  if (samples.some(value => !Number.isFinite(value))) return null;
  return samples[0]*(1-u)*(1-v) + samples[1]*u*(1-v) + samples[2]*(1-u)*v + samples[3]*u*v;
}
export function hasLocalCoverage(grid: Omit<DemGrid, 'data'>, site: Coordinates) {
  const { x, y } = southPolarXY(site, grid.radiusM);
  const margin = TERRAIN_RANGE_M + grid.spacingM * 2;
  return site.latitude < -89 && x > grid.x0 + margin && x < grid.x0 + (grid.width - 1) * grid.spacingM - margin && y < grid.y0 - margin && y > grid.y0 - (grid.height - 1) * grid.spacingM + margin;
}
/** Radial geodesic rays. Angles relative to the observer's radial horizontal;
 * exact spherical curvature, bilinear elevations, 20 m radial / 0.5° azimuth step.
 * A floor of zero keeps the spherical baseline: only additional local blocking.
 */
export function localTerrainHorizon(grid: DemGrid, site: Coordinates, regional?: DemGrid) {
  if (!hasLocalCoverage(grid, site)) throw new Error('terrain-outside');
  if (regional && (regional.radiusM !== grid.radiusM || regional.spacingM !== 80)) throw new Error('terrain-regional-grid');
  const height = demHeight(grid, site);
  if (height === null) throw new Error('terrain-nodata');
  const lat = site.latitude * RAD, lon = site.longitude * RAD;
  const up = [Math.cos(lat)*Math.cos(lon), Math.cos(lat)*Math.sin(lon), Math.sin(lat)];
  const north = [-Math.sin(lat)*Math.cos(lon), -Math.sin(lat)*Math.sin(lon), Math.cos(lat)];
  const east = [-Math.sin(lon), Math.cos(lon), 0];
  const samples: { azimuth: number; elevation: number }[] = [];
  const localSamples: { azimuth: number; elevation: number }[] = [];
  for (let azimuth = 0; azimuth < 360; azimuth += 0.5) {
    const a = azimuth * RAD, direction = north.map((n, i) => n*Math.cos(a)+east[i]*Math.sin(a));
    let horizon = 0;
    const obstruction = (source: DemGrid, distance: number) => {
      const angle = distance / grid.radiusM;
      const unit = up.map((u, i) => u*Math.cos(angle)+direction[i]*Math.sin(angle));
      const target = { latitude: Math.asin(Math.max(-1, Math.min(1, unit[2]))) / RAD, longitude: Math.atan2(unit[1], unit[0]) / RAD };
      const z = demHeight(source, target);
      if (z === null) throw new Error('terrain-nodata');
      const vertical = (grid.radiusM + z)*Math.cos(angle) - (grid.radiusM + height + OBSERVER_HEIGHT_M);
      const horizontal = (grid.radiusM + z)*Math.sin(angle);
      return Math.atan2(vertical, horizontal) / RAD;
    };
    for (let distance = grid.spacingM; distance <= TERRAIN_RANGE_M; distance += grid.spacingM) {
      horizon = Math.max(horizon, obstruction(grid, distance));
    }
    localSamples.push({ azimuth, elevation: horizon });
    if (regional) {
      // Include both transition and endpoint. A missing sample aborts the
      // whole result; incomplete rays must never be interpreted as clear.
      for (let distance = TERRAIN_RANGE_M; distance < REGIONAL_RANGE_M; distance += regional.spacingM) {
        horizon = Math.max(horizon, obstruction(regional, distance));
      }
      horizon = Math.max(horizon, obstruction(regional, REGIONAL_RANGE_M));
    }
    samples.push({ azimuth, elevation: horizon });
  }
  return { elevationM: height, samples, localSamples, rangeM: regional ? REGIONAL_RANGE_M : TERRAIN_RANGE_M };
}
export function horizonAt(samples: { azimuth: number; elevation: number }[], azimuth: number | null) {
  if (azimuth === null) return Math.max(...samples.map(s => s.elevation));
  const position = ((azimuth % 360 + 360) % 360) / 360 * samples.length;
  const index = Math.floor(position), fraction = position - index;
  return samples[index].elevation*(1-fraction) + samples[(index+1)%samples.length].elevation*fraction;
}
