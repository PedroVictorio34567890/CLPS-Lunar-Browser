import { t, useLanguage } from '../i18n';
import { Clock3, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import type { ComparisonReport } from '../models';
import type { usePlayback } from '../hooks/usePlayback';
import { formatInstant } from '../lib/playback';

export function Timeline({ playback: p, report, onOpenReport }: {
  playback: ReturnType<typeof usePlayback>; report?: ComparisonReport; onOpenReport: () => void;
}) {
  useLanguage();
  return <section className="timeline" aria-label={t("Reproducción temporal")}>
    <div className="timeline-heading"><span><Clock3 size={14}/>  {t("Tiempo de la escena")}</span>{report && <button className="report-reopen" onClick={onOpenReport}>{t("Ver informe · paso")} {report.methodology?.stepMinutes} min</button>}</div>
    <div className="playback-heading"><time dateTime={new Date(p.time).toISOString()}>{formatInstant(p.time)}</time><span>{!p.valid ? t("Último instante válido") : p.playing ? t("Reproduciendo") : p.time >= p.end ? t("Fin del periodo") : t("En pausa")}</span></div>
    <input className="time-slider" aria-label={t("Instante de la escena")} aria-valuetext={formatInstant(p.time)} type="range" min={p.valid ? p.start : 0} max={p.valid ? p.end : 1} step="any" value={p.valid ? p.time : 0} disabled={!p.valid} onChange={event => p.seek(Number(event.target.value))}/>
    <div className="timeline-labels"><time>{p.valid ? formatInstant(p.start) : t("Corrige el periodo")}</time><time>{p.valid ? formatInstant(p.end) : ''}</time></div>
    <div className="playback-controls">
      <button aria-label={t("Ir al inicio")} title={t("Ir al inicio")} disabled={!p.valid} onClick={() => p.seek(p.start)}><SkipBack size={16}/></button>
      <button className="playback-toggle" disabled={!p.valid} onClick={p.toggle}>{p.playing ? <Pause size={16}/> : <Play size={16}/>} {p.playing ? t("Pausar") : p.valid && p.time >= p.end ? t("Reproducir de nuevo") : t("Reproducir")}</button>
      <button aria-label={t("Ir al final")} title={t("Ir al final")} disabled={!p.valid} onClick={() => p.seek(p.end)}><SkipForward size={16}/></button>
      <label>{t("Velocidad")}<select aria-label={t("Velocidad de reproducción")} value={p.speed} onChange={event => p.setSpeed(Number(event.target.value))}>{[1, 6, 24].map(speed => <option key={speed} value={speed}>{speed}  {t("h / segundo")}</option>)}</select></label>
    </div>
    {!p.valid && <p className="error">{t("Introduce un periodo válido para mover el tiempo.")}</p>}
  </section>;
}
