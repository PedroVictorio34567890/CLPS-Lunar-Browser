import { t, useLanguage } from '../i18n';
import { useState } from 'react';
import { MapPin, Plus, Pencil, Trash2, AlertTriangle, X, Check } from 'lucide-react';
import type { CandidateSite, Coordinates } from '../models';
import { isSouthPolar } from '../lib/coordinates';
import { formatCoordinates } from '../i18n';
import { MAX_SITES } from '../lib/sites';
interface Props { sites: CandidateSite[]; onAdd: (c: Coordinates) => void; onEdit: (id: string, c: Coordinates) => void; onRemove: (id: string) => void }
export function LocationPanel({ sites, onAdd, onEdit, onRemove }: Props) {
  useLanguage();
  const [editing, setEditing] = useState<string | null>(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const clear = () => { setEditing(null); setLatitude(''); setLongitude(''); };
  const atLimit = sites.length >= MAX_SITES;
  return <section className="locations section-block" aria-labelledby="locations-title">
    <div className="section-heading"><h2 id="locations-title"><span className="step">01</span>  {t("Lugares candidatos")}</h2><span className="counter">{sites.length} / 8</span></div>
    <p className="muted intro">{t("Pulsa sobre la Luna o introduce coordenadas.")}</p>
    <form className="coordinate-form" onSubmit={event => {
      event.preventDefault();
      if (!latitude.trim() || !longitude.trim()) return;
      const c = { latitude: Number(latitude), longitude: Number(longitude) };
      if (editing) onEdit(editing, c); else onAdd(c);
      clear();
    }}>
      {editing && <div className="edit-heading">{t("Editando lugar")} {sites.find(s => s.id === editing)!.slot + 1}<button type="button" className="icon-button" aria-label={t("Cancelar edición")} onClick={clear}><X size={15}/></button></div>}
      <div className="field-pair"><label>{t("Latitud")} <span>°</span><input aria-label={t("Latitud")} type="number" min="-90" max="90" step="any" required placeholder="−85.000" value={latitude} onChange={e => setLatitude(e.target.value)}/></label><label>{t("Longitud")} <span>°</span><input aria-label={t("Longitud")} type="number" min="-180" max="180" step="any" required placeholder="0.000" value={longitude} onChange={e => setLongitude(e.target.value)}/></label></div>
      <div className="coordinate-hint">{t("Sur y oeste: valores negativos")}</div>
      <button className="secondary full" disabled={atLimit && !editing} type="submit">{editing ? <Check size={15}/> : <Plus size={15}/>} {editing ? t("Guardar coordenadas") : t("Añadir ubicación")}</button>
    </form>
    {atLimit && <p role="status" className="notice">{t("Has alcanzado el máximo de 8 lugares. Elimina uno para añadir otro.")}</p>}
    <div className="site-list" aria-live="polite">
      {!sites.length && <div className="empty-sites"><MapPin size={23}/><p>{t("Tu próxima misión empieza aquí.")}</p><span>{t("Selecciona el primer lugar para explorar.")}</span></div>}
      {sites.map(site => <article className={`site-row ${editing === site.id ? 'editing' : ''}`} key={site.id}>
        <span className="site-number" style={{ color: site.color, backgroundColor: `${site.color}15` }}>{site.slot + 1}</span>
        <div className="site-details"><strong>{t("Lugar")} {String(site.slot + 1).padStart(2, '0')}</strong><span className="coords">{formatCoordinates(site)}</span>{!isSouthPolar(site) && <span className="polar-warning"><AlertTriangle size={11}/>  {t("Fuera del polo sur")}</span>}</div>
        <button className="icon-button" title={t("Editar coordenadas")} aria-label={t("Editar lugar {0}", [site.slot + 1])} onClick={() => { setEditing(site.id); setLatitude(String(site.latitude)); setLongitude(String(site.longitude)); }}><Pencil size={14}/></button>
        <button className="icon-button" title={t("Eliminar ubicación")} aria-label={t("Eliminar lugar {0}", [site.slot + 1])} onClick={() => { onRemove(site.id); if (editing === site.id) clear(); }}><Trash2 size={14}/></button>
      </article>)}
    </div>
    <p className="footnote"><span className="tiny-dot"/>  {t("Región de trabajo: 80° S a 90° S.")}<br/>{t("Puedes seleccionar lugares fuera de esta región.")}</p>
  </section>;
}
