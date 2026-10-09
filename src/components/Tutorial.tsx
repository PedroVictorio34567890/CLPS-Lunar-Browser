import { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useLanguage } from '../i18n';
import { LanguageMenu } from './LanguageMenu';
import { tutorialContent } from './tutorialContent';

const preferenceKey = 'lunar-mission-tutorial-hidden-v1';
export function shouldShowTutorial() {
  try { return localStorage.getItem(preferenceKey) !== 'true'; }
  catch { return true; }
}

export function Tutorial({ onClose }: { onClose: () => void }) {
  const lang = useLanguage();
  const en = lang === 'en';
  const steps = tutorialContent[lang];
  const [step, setStep] = useState(0);
  const [hideOnStartup, setHideOnStartup] = useState(() => !shouldShowTutorial());
  const [storageFailed, setStorageFailed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const activeTopic = useRef<HTMLButtonElement>(null);
  const current = steps[step];
  useEffect(() => {
    const element = dialog.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    heading.current?.focus();
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      // Also provide a sensible return target for the automatically opened guide.
      (previousFocus && previousFocus !== document.body ? previousFocus : document.getElementById('tutorial-launch'))?.focus();
    };
  }, []);
  useEffect(() => {
    body.current?.scrollTo(0, 0);
    heading.current?.focus();
    activeTopic.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [step]);
  function updatePreference(checked: boolean) {
    setHideOnStartup(checked);
    try { localStorage.setItem(preferenceKey, String(checked)); setStorageFailed(false); }
    catch { setStorageFailed(true); }
  }
  return <dialog ref={dialog} className="tutorial-dialog" aria-labelledby="tutorial-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="tutorial-header"><span><BookOpen size={19}/>{en ? 'Application tutorial' : 'Tutorial de la aplicación'}</span><div><LanguageMenu/><button className="icon-button" aria-label={en ? 'Close tutorial' : 'Cerrar tutorial'} onClick={onClose}><X size={21}/></button></div></header>
    <div className="tutorial-layout">
      <nav className="tutorial-index" aria-label={en ? 'Tutorial topics' : 'Temas del tutorial'}>{steps.map((item, index) => <button key={index} ref={step === index ? activeTopic : undefined} aria-current={step === index ? 'step' : undefined} onClick={() => setStep(index)}><span>{String(index + 1).padStart(2, '0')}</span>{item.title}</button>)}</nav>
      <div className="tutorial-body" ref={body}>
        <p className="tutorial-progress" aria-live="polite">{en ? 'Step' : 'Paso'} {step + 1} / {steps.length} · {current.area}</p>
        <progress value={step + 1} max={steps.length} aria-label={en ? 'Tutorial progress' : 'Progreso del tutorial'}/>
        <h2 id="tutorial-title" ref={heading} tabIndex={-1}>{current.title}</h2>
        <p className="tutorial-intro">{current.intro}</p>
        <dl>{current.items.map(([label, description]) => <div key={label}><dt>{label}</dt><dd>{description}</dd></div>)}</dl>
      </div>
    </div>
    <footer className="tutorial-footer">
      <div><label className="tutorial-preference"><input type="checkbox" checked={hideOnStartup} onChange={event => updatePreference(event.target.checked)}/>{en ? 'Do not show on startup' : 'No mostrar al abrir'}</label><p>{en ? 'Always available from Tutorial in the header.' : 'Siempre disponible desde Tutorial en la cabecera.'}</p>{storageFailed && <p role="status">{en ? 'This browser could not save your preference.' : 'Este navegador no ha podido guardar tu preferencia.'}</p>}</div>
      <div className="tutorial-actions"><button onClick={onClose}>{en ? 'Exit tutorial' : 'Salir del tutorial'}</button><button disabled={step === 0} onClick={() => setStep(value => value - 1)}><ChevronLeft size={15}/>{en ? 'Previous' : 'Anterior'}</button><button className="primary" onClick={() => step === steps.length - 1 ? onClose() : setStep(value => value + 1)}>{step === steps.length - 1 ? (en ? 'Start exploring' : 'Empezar a explorar') : (en ? 'Next' : 'Siguiente')}<ChevronRight size={15}/></button></div>
    </footer>
  </dialog>;
}
