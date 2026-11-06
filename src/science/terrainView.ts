import type { TerrainSkySample } from '../models.ts';
import type { Vec3 } from './ephemeris.ts';

/** Interpolate only inside the calculated report; never extrapolate stale sky. */
export function terrainSkyAt(samples: TerrainSkySample[], time: number) {
  if (samples.length < 2 || !Number.isFinite(time) || time < samples[0].time || time > samples.at(-1)!.time) return null;
  let low = 0, high = samples.length - 1;
  while (high - low > 1) { const mid = (low + high) >> 1; if (samples[mid].time <= time) low = mid; else high = mid; }
  const a = samples[low], b = samples[high], fraction = (time-a.time)/(b.time-a.time);
  const body = (name: 'sun' | 'earth') => {
    const position = a[name].map((v,i)=>v+(b[name][i]-v)*fraction) as Vec3;
    const distance = Math.hypot(...position);
    return { position, elevation: Math.asin(Math.max(-1,Math.min(1,position[1]/distance)))*180/Math.PI,
      azimuth: Math.hypot(position[0],position[2])/distance < 1e-12 ? null : (Math.atan2(position[0],-position[2])*180/Math.PI+360)%360 };
  };
  return { sun: body('sun'), earth: body('earth') };
}

/** Angular silhouette at arbitrary rendering radius, NOT a terrain mesh or
 * distances to individual peaks. Triangles close the north seam. */
export function horizonSilhouette(profile: {azimuth:number;elevation:number}[]) {
  const edge = (sample: {azimuth:number;elevation:number}, elevation: number): Vec3 => {
    const a=sample.azimuth*Math.PI/180, h=elevation*Math.PI/180;
    return [10*Math.cos(h)*Math.sin(a),10*Math.sin(h),-10*Math.cos(h)*Math.cos(a)];
  };
  const positions: number[] = [];
  const outline = profile.map(s=>edge(s,s.elevation));
  for(let i=0;i<profile.length;i++) {
    const a=profile[i], b=profile[(i+1)%profile.length];
    const bottomA=edge(a,0), bottomB=edge(b,0), topA=outline[i], topB=outline[(i+1)%profile.length];
    positions.push(...bottomA,...bottomB,...topB,...bottomA,...topB,...topA);
  }
  return { positions: new Float32Array(positions), outline: [...outline,outline[0]] };
}
