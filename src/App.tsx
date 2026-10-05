import { lazy, Suspense, useState } from 'react';
import { ArrowUpRight, ChevronRight, Orbit, FlaskConical, Globe2 } from 'lucide-react';
import { LocationPanel } from './components/LocationPanel';
import { TimePanel } from './components/TimePanel';
import { Timeline } from './components/Timeline';
import { ComparisonPanel } from './components/ComparisonPanel';
import { usePlayback } from './hooks/usePlayback';
import { useSites } from './hooks/useSites';
import { workerEngine } from './science/workerEngine';
import { periodError } from './lib/period';
import type { AnalysisPeriod, ComparisonReport } from './models';
const MoonScene = lazy(() => import('./scene/MoonScene').then(module => ({ default: module.MoonScene })));
export default function App() {
  const { sites, addSite, editSite, removeSite } = useSites();
  const [period, setPeriod] = useState<AnalysisPeriod>({ start: '2026-09-27T00:00', end: '2026-10-04T00:00' });
  const playback = usePlayback(period);
  const [surfaceId, setSurfaceId] = useState('');
  const surfaceSite = sites.find(site => site.id === surfaceId);
  const [report, setReport] = useState<ComparisonReport | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const currentReport = report && report.period.start === period.start && report.period.end === period.end && report.sites.length === sites.length && report.sites.every((r, i) => r.site.id === sites[i].id && r.site.latitude === sites[i].latitude && r.site.longitude === sites[i].longitude) ? report : undefined;
  async function analyze() { setBusy(true); setError(''); try { setReport(await workerEngine.compare(sites, period)); setReportOpen(true); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo preparar el informe.'); } finally { setBusy(false); } }
  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="/" aria-label="Lunar Mission Browser, inicio"><span className="brand-icon"><Orbit size={29}/></span><span>LUNAR<span className="brand-sub">MISSION BROWSER</span></span></a><div className="header-context"><span className="header-divider"/>CLPS <span className="muted">/</span> Exploración del polo sur</div><div className="challenge">SPACE APPS <span>2026</span><span className="prototype">PROTOTIPO · V0.2</span></div></header>
    <div className="workspace"><aside className="configuration"><div className="config-intro"><div className="eyebrow">PLANIFICACIÓN DE MISIÓN</div><h2>Explorar. Seleccionar.<br/>Comparar.</h2><p>Prepara lugares de aterrizaje según luz solar y comunicación con la Tierra.</p></div>
      <LocationPanel sites={sites} onAdd={addSite} onEdit={editSite} onRemove={removeSite}/>
      <TimePanel period={period} onChange={setPeriod}/>
      <div className="analyze-block"><button className="primary full" onClick={analyze} disabled={!sites.length || !!periodError(period) || busy}>{busy ? 'Calculando efemérides…' : 'Analizar y comparar'}<ArrowUpRight size={18}/></button><p>{!sites.length ? 'Selecciona al menos un lugar para continuar.' : periodError(period) ? 'Corrige el periodo para continuar.' : `${sites.length} ${sites.length === 1 ? 'lugar listo' : 'lugares listos'} para comparar.`}</p>{error && <p className="error" role="alert">{error}</p>}</div>
    </aside><main className="main-surface"><div className="view-nav"><span className="active-tab"><Globe2 size={15}/> Superficie lunar</span><span className="view-trail">Luna <ChevronRight size={12}/> Polo sur</span><span className="view-tag">VISTA 3D</span></div><div className="view-selector"><button aria-pressed={!surfaceSite} onClick={() => setSurfaceId('')}>Vista orbital</button><label>Desde la superficie<select aria-label="Lugar para vista de superficie" value={surfaceSite?.id ?? ''} onChange={event => setSurfaceId(event.target.value)} disabled={!sites.length}><option value="">{sites.length ? 'Elige un lugar' : 'Añade un lugar primero'}</option>{sites.map(site => <option key={site.id} value={site.id}>Lugar {site.slot + 1}</option>)}</select></label></div><Suspense fallback={<div className="scene scene-fallback">Preparando el explorador lunar…</div>}><MoonScene sites={sites} onSelect={addSite} timestamp={playback.time} surfaceSite={surfaceSite}/></Suspense><Timeline playback={playback} report={currentReport} onOpenReport={() => setReportOpen(true)}/><div className="science-notice"><FlaskConical size={15}/><p><strong>Cálculo geométrico disponible.</strong> Efemérides sobre esfera sin relieve. Escena sincronizada con el instante UTC seleccionado. Sin sombras del relieve ni eclipses; brillo y atmósfera estilizados.</p></div></main></div>
    <footer className="footer"><span>CLPS LUNAR MISSION BROWSER <span className="muted">/</span> Proyecto para Space Apps 2026 · No oficial</span><a href="https://svs.gsfc.nasa.gov/4720/" target="_blank" rel="noreferrer">Textura: NASA Scientific Visualization Studio <ArrowUpRight size={12}/></a></footer>
    {report && reportOpen && <ComparisonPanel report={report} onClose={() => setReportOpen(false)}/>}
  </div>;
}
