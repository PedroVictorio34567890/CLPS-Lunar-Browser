import metadata from './terrainMetadata.json';
import frameMetadata from './frameMetadata.json';
import regionalMetadata from './regionalMetadata.json';
import type { ComparisonReport, ElevationSample, TerrainSkySample } from '../models';
import { hasLocalCoverage, localTerrainHorizon, horizonAt, OBSERVER_HEIGHT_M } from './terrain';
import { inertialLunarEphemeris } from './ephemeris';
import { utcToTtDays, frameQuaternion, rotateToMoonME } from './lunarFrame';
import { localSky } from './localSky';
import { visibilityStatistics } from './statistics';
import { simulateEnergy } from './energy';
import { operationalWindows } from './operationalWindows';

export async function addTerrainAssessment(report: ComparisonReport) {
  const covered = report.sites.filter(s => hasLocalCoverage(metadata, s.site));
  report.sites.forEach(site => { site.terrain = { status: 'outside' }; });
  if (!covered.length || !report.mission) return;
  try {
    for (const site of covered) for (const sample of site.series!.samples) utcToTtDays(sample.time);
  } catch {
    covered.forEach(site => { site.terrain = { status: 'frame-outside' }; });
    return;
  }
  try {
    const frameResponse = await fetch(`${import.meta.env.BASE_URL}terrain/moon-me-de421.f64`);
    if (!frameResponse.ok) throw new Error('frame-download');
    const frameBuffer = await frameResponse.arrayBuffer();
    if (frameBuffer.byteLength !== frameMetadata.count * 32) throw new Error('frame-size');
    const frameDigest = await crypto.subtle.digest('SHA-256', frameBuffer);
    if (Array.from(new Uint8Array(frameDigest), b => b.toString(16).padStart(2, '0')).join('') !== frameMetadata.sha256) throw new Error('frame-checksum');
    const frameView = new DataView(frameBuffer);
    const rotations = Float64Array.from({ length: frameMetadata.count * 4 }, (_, i) => frameView.getFloat64(i * 8, true));
    const response = await fetch(`${import.meta.env.BASE_URL}terrain/shackleton-20m.f32`);
    if (!response.ok) throw new Error('terrain-download');
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength !== metadata.width * metadata.height * 4) throw new Error('terrain-size');
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    if (hash !== metadata.sha256) throw new Error('terrain-checksum');
    const view = new DataView(buffer), data = new Float32Array(metadata.width * metadata.height);
    for (let i = 0; i < data.length; i++) data[i] = view.getFloat32(i * 4, true);
    const grid = { ...metadata, data };
    const regionalResponse = await fetch(`${import.meta.env.BASE_URL}terrain/south-pole-80m.i16`);
    if (!regionalResponse.ok) throw new Error('regional-download');
    const regionalBuffer = await regionalResponse.arrayBuffer();
    if (regionalBuffer.byteLength !== regionalMetadata.width * regionalMetadata.height * 2) throw new Error('regional-size');
    const regionalDigest = await crypto.subtle.digest('SHA-256', regionalBuffer);
    if (Array.from(new Uint8Array(regionalDigest), b => b.toString(16).padStart(2, '0')).join('') !== regionalMetadata.sha256) throw new Error('regional-checksum');
    const regionalView = new DataView(regionalBuffer);
    const regional = { ...regionalMetadata, data: Float32Array.from({ length: regionalMetadata.width * regionalMetadata.height }, (_, i) => regionalView.getInt16(i * 2, true) * regionalMetadata.scaleM) };
    for (const site of covered) {
      try {
        const horizon = localTerrainHorizon(grid, site.site, regional);
        const series: ElevationSample[] = [];
        const sunSamples: { time: number; altitude: number }[] = [], earthSamples: { time: number; altitude: number }[] = [];
        const nearEarthSamples: { time: number; altitude: number }[] = [];
        const earthHorizonSamples: { time: number; altitude: number }[] = [], sky: TerrainSkySample[] = [];
        for (const sample of site.series!.samples) {
          const bodies = inertialLunarEphemeris(sample.time);
          const rotation = frameQuaternion(frameMetadata, rotations, utcToTtDays(sample.time));
          const sun = localSky(site.site, rotateToMoonME(rotation, bodies.sun), horizon.elevationM + OBSERVER_HEIGHT_M);
          const earth = localSky(site.site, rotateToMoonME(rotation, bodies.earth), horizon.elevationM + OBSERVER_HEIGHT_M);
          sky.push({ time: sample.time, sun: sun.position, earth: earth.position });
          earthHorizonSamples.push({ time: sample.time, altitude: earth.elevation - horizonAt(horizon.samples, earth.azimuth) });
          const sunClearance = sun.elevation - horizonAt(horizon.samples, sun.azimuth);
          // Minimum elevation is an absolute horizontal angle, not an extra terrain margin.
          const earthClearance = earth.elevation - Math.max(report.mission.minEarthElevationDeg, horizonAt(horizon.samples, earth.azimuth));
          nearEarthSamples.push({ time: sample.time, altitude: earth.elevation - Math.max(report.mission.minEarthElevationDeg, horizonAt(horizon.localSamples, earth.azimuth)) });
          series.push({ time: sample.time, sun: sun.elevation, earth: earth.elevation, sunAzimuth: sun.azimuth, sunClearance });
          sunSamples.push({ time: sample.time, altitude: sunClearance }); earthSamples.push({ time: sample.time, altitude: earthClearance });
        }
        const light = visibilityStatistics(sunSamples), access = visibilityStatistics(earthSamples);
        const nearAccess = visibilityStatistics(nearEarthSamples);
        const energy = simulateEnergy(series, report.mission), joint = operationalWindows(access.windows, energy.outages);
        site.terrain = { status: 'local', series: { samples: series, sunlight: light.windows, earthVisibility: visibilityStatistics(earthHorizonSamples).windows },
          accessWindows: access.windows, energy, sky, rangeM: horizon.rangeM, localProfile: horizon.localSamples,
          nearAccessPercent: nearAccess.percent, nearOutageHours: nearAccess.longestHiddenHours, geometricOutageHours: access.longestHiddenHours,
          elevationM: horizon.elevationM, profile: horizon.samples, sunlightPercent: light.percent, accessPercent: access.percent, longestOutageHours: joint.longestOutageHours, jointPercent: joint.percent, minChargePercent: energy.minChargeWh / report.mission.batteryWh * 100, unservedWh: energy.unservedWh };
      } catch { site.terrain = { status: 'unavailable' }; }
    }
  } catch { covered.forEach(site => { site.terrain = { status: 'unavailable' }; }); }
}
