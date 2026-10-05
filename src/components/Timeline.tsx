import { Clock3, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import type { ComparisonReport } from '../models';
import type { usePlayback } from '../hooks/usePlayback';
import { formatInstant } from '../lib/playback';

export function Timeline({ playback: p, report, onOpenReport }: {
  playback: ReturnType<typeof usePlayback>; report?: ComparisonReport; onOpenReport: () => void;
}) {
  return <section className="timeline" aria-label="Reproducción temporal">
    <div className="timeline-heading"><span><Clock3 size={14}/> Tiempo de la escena</span>{report && <button className="report-reopen" onClick={onOpenReport}>Ver informe · paso {report.methodology?.stepMinutes} min</button>}</div>
    <div className="playback-heading"><time dateTime={new Date(p.time).toISOString()}>{formatInstant(p.time)}</time><span>{!p.valid ? 'Último instante válido' : p.playing ? 'Reproduciendo' : p.time >= p.end ? 'Fin del periodo' : 'En pausa'}</span></div>
    <input className="time-slider" aria-label="Instante de la escena" aria-valuetext={formatInstant(p.time)} type="range" min={p.valid ? p.start : 0} max={p.valid ? p.end : 1} step="any" value={p.valid ? p.time : 0} disabled={!p.valid} onChange={event => p.seek(Number(event.target.value))}/>
    <div className="timeline-labels"><time>{p.valid ? formatInstant(p.start) : 'Corrige el periodo'}</time><time>{p.valid ? formatInstant(p.end) : ''}</time></div>
    <div className="playback-controls">
      <button aria-label="Ir al inicio" title="Ir al inicio" disabled={!p.valid} onClick={() => p.seek(p.start)}><SkipBack size={16}/></button>
      <button className="playback-toggle" disabled={!p.valid} onClick={p.toggle}>{p.playing ? <Pause size={16}/> : <Play size={16}/>} {p.playing ? 'Pausar' : p.valid && p.time >= p.end ? 'Reproducir de nuevo' : 'Reproducir'}</button>
      <button aria-label="Ir al final" title="Ir al final" disabled={!p.valid} onClick={() => p.seek(p.end)}><SkipForward size={16}/></button>
      <label>Velocidad<select aria-label="Velocidad de reproducción" value={p.speed} onChange={event => p.setSpeed(Number(event.target.value))}>{[1, 6, 24].map(speed => <option key={speed} value={speed}>{speed} h / segundo</option>)}</select></label>
    </div>
    {!p.valid && <p className="error">Introduce un periodo válido para mover el tiempo.</p>}
  </section>;
}
