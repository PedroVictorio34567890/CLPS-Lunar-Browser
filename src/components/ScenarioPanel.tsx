import { useState } from 'react';
import { useLanguage } from '../i18n';
import { ScenarioComparison } from './ScenarioComparison';
import { copyInputs, inputsKey, makeScenario, MAX_SCENARIOS, parseLibrary, SCENARIO_KEY, validInputs, writeLibrary } from '../lib/scenarios';
import type { SavedScenario, ScenarioInputs, ScenarioLibrary } from '../lib/scenarios';

function initialLibrary() {
  try { const raw = localStorage.getItem(SCENARIO_KEY); return { raw, library: parseLibrary(raw), failed: false }; }
  catch { return { raw: null, library: { version: 1, scenarios: [] } as ScenarioLibrary, failed: true }; }
}
export function ScenarioPanel({ inputs, busy, onLoad }: { inputs: ScenarioInputs; busy: boolean; onLoad: (inputs: ScenarioInputs) => void }) {
  const en = useLanguage() === 'en';
  const [store, setStore] = useState(initialLibrary);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [name, setName] = useState('');
  const [activeId, setActiveId] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [baseline, setBaseline] = useState(() => inputsKey(inputs));
  const [pending, setPending] = useState<SavedScenario | null>(null);
  const [status, setStatus] = useState<'saved' | 'loaded' | 'duplicated' | 'error' | 'conflict' | null>(null);
  const selected = store.library.scenarios.find(s => s.id === selectedId);
  const active = store.library.scenarios.find(s => s.id === activeId);
  const dirty = inputsKey(inputs) !== baseline || (active ? name.trim() !== active.name : !!name.trim());
  const canSave = validInputs(inputs) && !!name.trim() && name.trim().length <= 80 && !busy && !store.failed;
  function commit(library: ScenarioLibrary) {
    try { const raw = writeLibrary(localStorage, store.raw, library); setStore({ raw, library, failed: false }); return true; }
    catch (error) { setStatus(error instanceof Error && error.message === 'storage-conflict' ? 'conflict' : 'error'); return false; }
  }
  function save(asNew: boolean) {
    const id = !asNew && active ? active.id : crypto.randomUUID();
    const saved = makeScenario(inputs, name, id, new Date().toISOString());
    const scenarios = store.library.scenarios.filter(s => s.id !== id).concat(saved);
    if (commit({ version: 1, scenarios })) { setActiveId(id); setSelectedId(id); setName(saved.name); setBaseline(inputsKey(inputs)); setPending(null); setStatus('saved'); }
  }
  function load(scenario: SavedScenario) {
    onLoad(copyInputs(scenario)); setActiveId(scenario.id); setSelectedId(scenario.id); setName(scenario.name); setBaseline(inputsKey(scenario)); setPending(null); setStatus('loaded');
  }
  function duplicate() {
    if (!selected) return;
    const suffix = en ? ' (copy)' : ' (copia)';
    const copy = makeScenario(selected, selected.name.slice(0, 80 - suffix.length) + suffix, crypto.randomUUID(), new Date().toISOString());
    if (commit({ version: 1, scenarios: [...store.library.scenarios, copy] })) { setSelectedId(copy.id); setStatus('duplicated'); }
  }
  const messages = en ? {
    saved: 'Scenario saved in this browser.', loaded: 'Scenario loaded. Analyze again to obtain a current report.', duplicated: 'Independent copy saved and selected. Press Load to edit it. The working mission is unchanged.', error: 'Saving failed. Existing saved scenarios were not replaced. Check available browser storage.', conflict: 'Saved data changed in another tab. Reload before saving again; preserve your current work first.',
  } : {
    saved: 'Escenario guardado en este navegador.', loaded: 'Escenario cargado. Vuelve a analizar para obtener un informe vigente.', duplicated: 'Copia independiente guardada y seleccionada. Pulsa Cargar para editarla. La misión de trabajo no ha cambiado.', error: 'No se pudo guardar. No se han sustituido los escenarios guardados. Revisa el almacenamiento del navegador.', conflict: 'Los datos guardados cambiaron en otra pestaña. Recarga antes de volver a guardar; conserva antes tu trabajo actual.',
  };
  return <section className="section-block scenario-panel" aria-label={en ? 'Saved scenarios' : 'Escenarios guardados'}>
    <details open><summary>{en ? 'Saved scenarios' : 'Escenarios guardados'} <span>{store.library.scenarios.length}/{MAX_SCENARIOS}</span></summary>
      <p>{en ? 'Save sites, dates and mission requirements. Stored only in this browser; no cloud sync. Reports are recalculated after loading.' : 'Guarda lugares, fechas y requisitos. Solo en este navegador, sin sincronización en la nube. Los informes se recalculan al cargar.'}</p>
      {store.failed && <p className="error" role="alert">{en ? 'Could not read saved data. It has not been overwritten. Check browser storage or recover a compatible version.' : 'No se pudieron leer los datos guardados. No se han sobrescrito. Revisa el almacenamiento o recupera una versión compatible.'}</p>}
      <label>{en ? 'Working scenario name' : 'Nombre del escenario de trabajo'}<input maxLength={80} value={name} onChange={event => { setName(event.target.value); setStatus(null); }}/></label>
      <p className="scenario-state">{active ? `${en ? 'Working on' : 'En edición'}: ${active.name}` : (en ? 'Unsaved working mission' : 'Misión de trabajo sin guardar')} · {dirty ? (en ? 'Unsaved changes' : 'Cambios sin guardar') : (active ? (en ? 'Matches saved version' : 'Coincide con la versión guardada') : (en ? 'Name and save to keep it' : 'Pon un nombre y guarda para conservarla'))}</p>
      <div className="scenario-actions"><button disabled={!canSave || store.library.scenarios.length >= MAX_SCENARIOS} onClick={() => save(true)}>{en ? 'Save as new' : 'Guardar como nuevo'}</button><button disabled={!canSave || !active || !dirty} onClick={() => save(false)}>{en ? 'Update current' : 'Actualizar actual'}</button></div>
      {!validInputs(inputs) && <p>{en ? 'Add at least one site and correct dates and requirements before saving.' : 'Añade al menos un lugar y corrige fechas y requisitos antes de guardar.'}</p>}
      <label>{en ? 'Choose saved scenario' : 'Elegir escenario guardado'}<select value={selectedId} onChange={event => { setSelectedId(event.target.value); setPending(null); setStatus(null); }} disabled={busy || !store.library.scenarios.length}><option value="">{en ? 'Choose a scenario' : 'Elige un escenario'}</option>{store.library.scenarios.map(s => <option key={s.id} value={s.id}>{s.name} · {s.savedAt.slice(0, 19).replace('T', ' ')} UTC</option>)}</select></label>
      {selected && <p>{selected.period.start.replace('T', ' ')} → {selected.period.end.replace('T', ' ')} UTC · {selected.sites.length} {en ? 'sites' : 'lugares'}</p>}
      <div className="scenario-actions"><button disabled={!selected || busy} onClick={() => selected && (dirty ? setPending(selected) : load(selected))}>{en ? 'Load' : 'Cargar'}</button><button disabled={!selected || busy || store.library.scenarios.length >= MAX_SCENARIOS} onClick={duplicate}>{en ? 'Duplicate saved' : 'Duplicar guardado'}</button></div>
      {pending && <div className="scenario-confirm" role="group" aria-label={en ? 'Unsaved changes' : 'Cambios sin guardar'}><p>{en ? `Loading “${pending.name}” replaces your unsaved working changes. Save them first if you need them.` : `Cargar «${pending.name}» sustituye los cambios de trabajo sin guardar. Guárdalos antes si quieres conservarlos.`}</p><button disabled={busy} onClick={() => load(pending)}>{en ? 'Replace and load' : 'Sustituir y cargar'}</button><button onClick={() => setPending(null)}>{en ? 'Cancel' : 'Cancelar'}</button></div>}
      {status && <p role="status" className={status === 'error' || status === 'conflict' ? 'error' : 'scenario-feedback'}>{messages[status]}</p>}
      {store.library.scenarios.length >= MAX_SCENARIOS && <p>{en ? 'Library full. You can still load and update existing scenarios.' : 'Biblioteca llena. Puedes cargar y actualizar escenarios existentes.'}</p>}
      <p>{en ? 'Changes are not saved automatically. Clearing browser data removes saved scenarios.' : 'Los cambios no se guardan automáticamente. Borrar los datos del navegador elimina los escenarios guardados.'}</p>
      <button className="secondary full" disabled={busy || !store.library.scenarios.length} onClick={() => setComparisonOpen(true)}>{en ? 'Compare scenarios and delays' : 'Comparar escenarios y retrasos'}</button>
    </details>
    {comparisonOpen && <ScenarioComparison scenarios={store.library.scenarios} onClose={() => setComparisonOpen(false)}/>}
  </section>;
}
