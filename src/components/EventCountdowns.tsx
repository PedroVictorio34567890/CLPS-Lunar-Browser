import { useMemo, useState } from 'react';
import { useLanguage } from '../i18n';
import type { ComparisonReport } from '../models';
import { activeAnalysis, analysisLabel } from '../lib/activeAnalysis';
import { formatInstant } from '../lib/playback';
import { nextEvents, remainingTime } from '../science/nextEvents';

export function EventCountdowns({ report, time }: { report?: ComparisonReport; time: number }) {
  const en = useLanguage() === 'en';
  const [siteId, setSiteId] = useState('');
  const site = report?.sites.find(s => s.site.id === siteId) ?? report?.sites[0];
  const active = useMemo(() => site ? activeAnalysis(site, report?.mission) : null, [site, report?.mission]);
  const sun = active?.series ? nextEvents(active.series.sunlight, time) : null;
  const earth = active?.series ? nextEvents(active.series.earthVisibility, time) : null;
  const access = active?.accessWindows ? nextEvents(active.accessWindows, time) : null;
  const terrain = active?.model === 'terrain';
  const radio = site?.radio?.status === 'calculated' ? site.radio : null;
  const groups = [
    { title: terrain ? (en ? 'Sun · terrain horizon' : 'Sol · horizonte del relieve') : (en ? 'Sun · center at 0°' : 'Sol · centro a 0°'), events: sun, rise: en ? 'Next sunrise' : 'Próxima salida', set: en ? 'Next sunset' : 'Próxima puesta' },
    { title: terrain ? (en ? 'Earth · terrain horizon' : 'Tierra · horizonte del relieve') : (en ? 'Earth · center at 0°' : 'Tierra · centro a 0°'), events: earth, rise: en ? 'Next Earthrise' : 'Próxima salida', set: en ? 'Next Earthset' : 'Próxima puesta' },
    { title: `${en ? 'Geometric access' : 'Acceso geométrico'} · > ${report?.mission?.minEarthElevationDeg ?? 0}°`, events: access, rise: en ? 'Access recovery' : 'Recuperación del acceso', set: en ? 'Access loss' : 'Pérdida del acceso' },
  ];
  if (radio) groups.push({title:en?'Station link · geometry + RF':'Enlace con estación · geometría + RF',events:nextEvents(radio.windows,time),rise:en?'Link recovery':'Recuperación del enlace',set:en?'Link loss':'Pérdida del enlace'});
  function countdown(event: number) {
    const delta = remainingTime(event, time);
    return `${delta.days ? `${delta.days} d · ` : ''}${delta.hours} h · ${delta.minutes} min`;
  }
  return <section className="event-countdowns" aria-label={en ? 'Upcoming events' : 'Próximos eventos'}>
    <details><summary>{en ? 'Upcoming events · Sun, Earth and access' : 'Próximos eventos · Sol, Tierra y acceso'}</summary>
      {!site?.series ? <p>{en ? 'Run Analyze and compare with your current settings to calculate events. Then move the scene time to see the countdowns.' : 'Pulsa Analizar y comparar con la configuración actual para calcular los eventos. Después mueve el tiempo de la escena para ver los contadores.'}</p> : <>
        <label>{en ? 'Site for countdowns' : 'Lugar de los contadores'}<select value={site.site.id} onChange={event => setSiteId(event.target.value)}>{report!.sites.map(s => <option key={s.site.id} value={s.site.id}>{en ? 'Site' : 'Lugar'} {s.site.slot + 1} · {s.site.latitude}°, {s.site.longitude}°</option>)}</select></label>
        <p>{en ? 'From scene time' : 'Desde el instante de la escena'}: {formatInstant(time)}</p>
        <p>{radio ? (en?'The station-link countdown includes both horizons and RF margin, not energy or station scheduling.':'El contador de enlace con estación incluye ambos horizontes y el margen RF, no energía ni agenda de estación.') : (en?'Station radio link not calculated or unavailable.':'Enlace de radio con estación sin calcular o no disponible.')}</p>
        <p><strong>{active && analysisLabel(active.reason, en)}</strong>. {terrain ? (en ? 'Access must clear both the terrain and your elevation threshold.' : 'El acceso debe superar el relieve y tu umbral de elevación.') : (en ? 'Terrain is not applied to these countdowns.' : 'Estos contadores no aplican relieve.')}</p>
        <div className="event-grid">{groups.map(group => <article key={group.title}><h3>{group.title}</h3>{(['rise', 'set'] as const).map(kind => {
          const event = group.events?.[kind];
          return <div className="event-reading" key={kind}><span>{group[kind]}</span>{event == null ? <strong>{en ? 'No further event detected in this period' : 'Sin otro evento detectado en este periodo'}</strong> : <><strong>≈ {countdown(event)}</strong><time dateTime={new Date(event).toISOString()}>{formatInstant(event)}</time></>}</div>;
        })}</article>)}</div>
        <p>{en ? 'Search ends at' : 'Búsqueda hasta'} {formatInstant(site.series.samples.at(-1)!.time)}. {en ? 'No event detected does not mean permanent visibility or darkness. Extend the dates and analyze again to look further ahead.' : 'No detectar un evento no significa visibilidad u oscuridad permanente. Amplía las fechas y vuelve a analizar para buscar más adelante.'}</p>
        <p>{en ? 'Approximate center crossings, sampled every 5 min and interpolated. Rounded up to minutes. Horizon according to the model shown above; no refraction or eclipses. Access events use your Earth elevation threshold, not energy or radio coverage. The countdown site is independent of the camera.' : 'Cruces aproximados del centro, con muestras cada 5 min e interpolación. Tiempo restante redondeado hacia arriba a minutos. Horizonte según el modelo indicado arriba; sin refracción ni eclipses. El acceso usa tu umbral de elevación terrestre, no la energía ni la cobertura de radio. El lugar del contador es independiente de la cámara.'}</p>
      </>}
    </details>
  </section>;
}
