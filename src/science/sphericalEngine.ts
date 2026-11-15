import type { ComparisonReport, ElevationSample, Metric } from '../models.ts';
import type { ScienceEngine } from './engine.ts';
import { isSouthPolar, validCoordinates } from '../lib/coordinates.ts';
import { MAX_SITES } from '../lib/sites.ts';
import { periodError, utcMillis } from '../lib/period.ts';
import { elevation, lunarEphemeris } from './ephemeris.ts';
import { exploratoryScore, visibilityStatistics } from './statistics.ts';

import { localSky } from './localSky.ts';
import { simulateEnergy } from './energy.ts';
import { missionError } from '../lib/mission.ts';
export const STEP_MINUTES = 5;
const metric = (value: number): Metric => ({ status: 'calculated', value });
export const sphericalEngine: ScienceEngine = {
  async compare(inputSites, inputPeriod, inputMission) {
    const mission = inputMission ? { ...inputMission, ...(inputMission.landing ? {landing:{...inputMission.landing}} : {}), ...(inputMission.battery ? {battery:{...inputMission.battery}} : {}), ...(inputMission.radio ? {radio:{...inputMission.radio}} : {}), ...(inputMission.data ? {data:{...inputMission.data}} : {}) } : undefined;
    if (mission && missionError(mission)) throw new Error(missionError(mission)!);
    const sites = inputSites.map(site => ({ ...site }));
    const period = { ...inputPeriod };
    const invalidPeriod = periodError(period);
    if (invalidPeriod) throw new Error(invalidPeriod);
    if (!sites.length || sites.length > MAX_SITES || sites.some(site => !validCoordinates(site))) throw new Error('Selecciona entre 1 y 8 lugares con coordenadas válidas.');
    const start = utcMillis(period.start), end = utcMillis(period.end);
    const steps = Math.ceil((end - start) / (STEP_MINUTES * 60000));
    const series: ElevationSample[][] = sites.map(() => []);
    // Ephemerides are shared by every candidate; exact endpoints are included.
    for (let index = 0; index <= steps; index++) {
      const time = Math.min(end, start + index * STEP_MINUTES * 60000);
      const { sun, earth } = lunarEphemeris(time);
      sites.forEach((site, i) => series[i].push({ time, solarDistanceKm: Math.hypot(...sun), sun: elevation(site, sun), earth: elevation(site, earth), sunAzimuth: localSky(site, sun).azimuth }));
    }
    const report: ComparisonReport = {
      engine: 'spherical-v1', period, mission,
      methodology: {
        ephemeris: 'Astronomy Engine 2.1.19 · orientación lunar IAU analítica',
        stepMinutes: STEP_MINUTES, sampleCount: steps + 1,
        scoreFormula: 'Índice = 0,5 × % de luz + 0,5 × % de visibilidad terrestre. No pondera la duración de las interrupciones.',
        assumptions: [
          'Esfera de radio 1737,4 km, altura del observador 0 m y horizonte plano a 0°. Sin DEM, pendientes ni sombras de cráteres o montañas.',
          'Luz: centro del Sol por encima de 0°. Comunicación: centro de la Tierra por encima de 0°; no representa una estación terrestre ni garantiza un enlace de radio.',
          'Vectores geométricos simultáneos J2000 convertidos al marco lunar IAU; UTC de entrada y conversión interna a TT. Sin correcciones de tiempo de luz ni aberración.',
          'Geometría sin eclipses, tamaño angular de discos, atmósfera terrestre, relés ni antenas. La energía, si hay requisitos, se evalúa por separado con pérdidas y límites de batería configurables.',
          'Cruces de horizonte interpolados entre muestras de 5 min. Eventos más cortos pueden omitirse; no equivale a una precisión científica de 5 min.',
          'Las duraciones continuas están recortadas al periodo seleccionado; pueden prolongarse fuera de él.',
        ],
      },
      sites: sites.map((site, i) => {
        const samples = series[i];
        const light = visibilityStatistics(samples.map(s => ({ time: s.time, altitude: s.sun })));
        const communication = visibilityStatistics(samples.map(s => ({ time: s.time, altitude: s.earth })));
        const nearHorizon = samples.some(s => Math.abs(s.sun) < 1 || Math.abs(s.earth) < 1);
        return {
          site, energy: mission ? simulateEnergy(samples, mission) : undefined,
          sunlightPercent: metric(light.percent), longestLightHours: metric(light.longestVisibleHours), longestDarkHours: metric(light.longestHiddenHours),
          earthVisibilityPercent: metric(communication.percent), longestCommunicationOutageHours: metric(communication.longestHiddenHours),
          viabilityScore: metric(exploratoryScore(light.percent, communication.percent)),
          warnings: [
            'Estimación geométrica sin relieve. No acredita la viabilidad de una misión.',
            ...(!isSouthPolar(site) ? ['Fuera de la región de trabajo del polo sur (80° S–90° S).'] : []),
            ...(nearHorizon ? ['Sol o Tierra a menos de 1° del horizonte: resultado especialmente sensible al relieve y al modelo de orientación.'] : []),
            ...(light.longestHiddenHours > 0 ? [`Reserva energética a dimensionar: hasta ${light.longestHiddenHours.toFixed(1)} h de oscuridad dentro de esta ventana.`] : []),
            ...(communication.longestHiddenHours > 0 ? [`Posible necesidad de relé: hasta ${communication.longestHiddenHours.toFixed(1)} h sin visibilidad del centro terrestre.`] : []),
          ],
          recommendation: 'Comparar este índice con los demás lugares y validar relieve, energía y telecomunicaciones antes de elegir.',
          horizon: { status: 'pending', samples: null },
          series: { samples, sunlight: light.windows, earthVisibility: communication.windows },
        };
      }),
    };
    const best = Math.max(...report.sites.map(site => site.viabilityScore.value ?? 0));
    for (const result of report.sites) {
      if (report.sites.length > 1 && Math.abs((result.viabilityScore.value ?? 0) - best) < 0.05) {
        result.recommendation = 'Mayor índice exploratorio entre los candidatos (posible empate). Priorizar su estudio del relieve, energía y enlace; no implica aptitud de aterrizaje.';
      }
    }
    return report;
  },
};
