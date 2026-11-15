import { t, useLanguage } from './i18n';
import { lazy, Suspense, useState } from 'react';
import { ArrowUpRight, ChevronRight, Orbit, FlaskConical, Globe2 } from 'lucide-react';
import { Tutorial, shouldShowTutorial } from './components/Tutorial';
import { ScenarioPanel } from './components/ScenarioPanel';
import { OfficialResources } from './components/OfficialResources';
import { LocationPanel } from './components/LocationPanel';
import { LanguageMenu } from './components/LanguageMenu';
import { MissionPanel } from './components/MissionPanel';
import { DEFAULT_MISSION, missionError, sameMission } from './lib/mission';
import { TimePanel } from './components/TimePanel';
import { EventCountdowns } from './components/EventCountdowns';
import { Timeline } from './components/Timeline';
import { ComparisonPanel } from './components/ComparisonPanel';
import { usePlayback } from './hooks/usePlayback';
import { useSites } from './hooks/useSites';
import { copyInputs } from './lib/scenarios';
import { workerEngine } from './science/workerEngine';
import { periodError } from './lib/period';
import type { AnalysisPeriod, ComparisonReport } from './models';
const MoonScene = lazy(() => import('./scene/MoonScene').then(module => ({ default: module.MoonScene })));
export default function App() {
  const en = useLanguage() === 'en';
  const [tutorialOpen, setTutorialOpen] = useState(shouldShowTutorial);
  const { sites, addSite, editSite, removeSite, replaceSites } = useSites();
  const [period, setPeriod] = useState<AnalysisPeriod>({ start: '2026-09-27T00:00', end: '2026-10-04T00:00' });
  const playback = usePlayback(period);
  const [mission, setMission] = useState({ ...DEFAULT_MISSION });
  const [locationVersion, setLocationVersion] = useState(0);
  const [surfaceId, setSurfaceId] = useState('');
  const surfaceSite = sites.find(site => site.id === surfaceId);
  const [report, setReport] = useState<ComparisonReport | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const currentReport = report && sameMission(report.mission, mission) && report.period.start === period.start && report.period.end === period.end && report.sites.length === sites.length && report.sites.every((r, i) => r.site.id === sites[i].id && r.site.latitude === sites[i].latitude && r.site.longitude === sites[i].longitude) ? report : undefined;
  async function analyze() { const invalid = missionError(mission); if (invalid) { setError(invalid); return; } const snapshot = copyInputs({ sites, period, mission }); const missionSnapshot = snapshot.mission; setBusy(true); setError(''); try { setReport({ ...await workerEngine.compare(snapshot.sites, snapshot.period, missionSnapshot), mission: missionSnapshot }); setReportOpen(true); } catch (e) { setError(e instanceof Error ? e.message : t("No se pudo preparar el informe.")); } finally { setBusy(false); } }
  return <div className="app-shell"><a className="skip-link" href="#mission-configuration">{en ? 'Skip to mission setup' : 'Ir a la configuración de misión'}</a>
    <header className="topbar"><a className="brand" href={import.meta.env.BASE_URL} aria-label={t("Lunar Mission Browser, inicio")}><span className="brand-icon"><Orbit size={29}/></span><span>LUNAR<span className="brand-sub">MISSION BROWSER</span></span></a><div className="header-context"><span className="header-divider"/>CLPS <span className="muted">/</span> {t("Exploración del polo sur")}</div><div className="challenge">SPACE APPS <span>2026</span><span className="prototype">{en ? 'RESEARCH PROTOTYPE' : 'PROTOTIPO DE ESTUDIO'}</span></div><button id="tutorial-launch" className="tutorial-launch" disabled={busy} onClick={() => { if (playback.playing) playback.toggle(); setTutorialOpen(true); }}>Tutorial</button><LanguageMenu/></header>
    <div className="workspace"><aside className="configuration" id="mission-configuration" tabIndex={-1}><div className="config-intro"><div className="eyebrow">{t("PLANIFICACIÓN DE MISIÓN")}</div><h2>{t("Explorar. Seleccionar.")}<br/>{' '}{t("Comparar.")}</h2><p>{en ? 'Compare candidate sites by communications, energy and terrain.' : 'Compara lugares candidatos según sus comunicaciones, energía y terreno.'}</p><div className="quick-start"><strong>{en ? 'First visit? Start here.' : '¿Primera visita? Empieza aquí.'}</strong>{en ? 'Add the Shackleton example below, choose your dates and press Analyze and compare. You can keep the example settings to explore.' : 'Añade el ejemplo de Shackleton, elige las fechas y pulsa Analizar y comparar. Puedes conservar los ajustes de ejemplo para explorar.'}</div></div>
      <ScenarioPanel inputs={{ sites, period, mission }} busy={busy} onLoad={next => { replaceSites(next.sites); setPeriod(next.period); setMission(next.mission); playback.seek(Date.parse(next.period.start + ':00Z')); setSurfaceId(''); setReport(null); setReportOpen(false); setError(''); setLocationVersion(value => value + 1); }}/>
      <fieldset className="input-lock" disabled={busy} aria-label={en ? 'Mission inputs' : 'Datos de misión'}><LocationPanel key={locationVersion} sites={sites} onAdd={addSite} onEdit={editSite} onRemove={removeSite}/>
      <TimePanel period={period} onChange={setPeriod}/><MissionPanel mission={mission} onChange={setMission}/></fieldset>
      <div className="analyze-block"><button aria-busy={busy} className="primary full" onClick={analyze} disabled={!sites.length || !!periodError(period) || !!missionError(mission) || busy}>{busy ? t("Calculando efemérides…") : t("Analizar y comparar")}<ArrowUpRight size={18}/></button><p>{!sites.length ? t("Selecciona al menos un lugar para continuar.") : periodError(period) ? t("Corrige el periodo para continuar.") : missionError(mission) ? t("Corrige los requisitos de misión para continuar.") : t("{0} {1} para comparar.", [sites.length, sites.length === 1 ? t("lugar listo") : t("lugares listos")])}</p>{error && <p className="error" role="alert">{t(error)}</p>}</div>
    </aside><main className="main-surface"><div className="view-nav"><span className="active-tab"><Globe2 size={15}/>  {t("Superficie lunar")}</span><span className="view-trail">{t("Luna")} <ChevronRight size={12}/>  {t("Polo sur")}</span><span className="view-tag">{t("VISTA 3D")}</span></div><div className="view-selector"><button aria-pressed={!surfaceSite} onClick={() => setSurfaceId('')}>{t("Vista orbital")}</button><label>{t("Desde la superficie")}<select aria-label={t("Lugar para vista de superficie")} value={surfaceSite?.id ?? ''} onChange={event => setSurfaceId(event.target.value)} disabled={!sites.length}><option value="">{sites.length ? t("Elige un lugar") : t("Añade un lugar primero")}</option>{sites.map(site => <option key={site.id} value={site.id}>{t("Lugar")} {site.slot + 1}</option>)}</select></label></div><Suspense fallback={<div className="scene scene-fallback">{t("Preparando el explorador lunar…")}</div>}><MoonScene sites={sites} onSelect={coordinates => { if (!busy) addSite(coordinates); }} timestamp={playback.time} surfaceSite={surfaceSite} surfaceReport={currentReport?.sites.find(s => s.site.id === surfaceSite?.id)}/></Suspense><Timeline playback={playback} report={currentReport} onOpenReport={() => setReportOpen(true)}/><EventCountdowns report={currentReport} time={playback.time}/><div className="science-notice"><FlaskConical size={15}/><p><strong>{t("Cálculo geométrico disponible.")}</strong>  {en ? 'Orbital view: sphere. After analysis, surface view and events use LOLA where covered; their model is shown explicitly. No eclipses; glow and atmosphere are visual effects.' : 'Vista orbital: esfera. Tras analizar, la superficie y los eventos usan LOLA donde hay cobertura; se indica el modelo utilizado. Sin eclipses; brillo y atmósfera son efectos visuales.'}</p></div></main></div>
    <OfficialResources sites={sites} period={period}/>
    <footer className="footer"><span>CLPS LUNAR MISSION BROWSER <span className="muted">/</span>  {t("Proyecto para Space Apps 2026 · No oficial")}</span><a href="https://svs.gsfc.nasa.gov/4720/" target="_blank" rel="noreferrer">{t("Textura: NASA Scientific Visualization Studio")} <ArrowUpRight size={12}/></a></footer>
    {tutorialOpen && <Tutorial onClose={() => setTutorialOpen(false)}/>}
    {report && reportOpen && <ComparisonPanel report={report} onClose={() => setReportOpen(false)}/>}
  </div>;
}
