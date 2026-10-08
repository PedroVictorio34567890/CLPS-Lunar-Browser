import { Languages } from 'lucide-react';
import { setLanguage, useLanguage } from '../i18n';

export function LanguageMenu() {
  const language = useLanguage();
  return <label className="language-menu">
    <Languages size={15} aria-hidden="true"/>
    <span className="sr-only">{language === 'en' ? 'Language' : 'Idioma'}</span>
    <select value={language} onChange={event => setLanguage(event.target.value === 'en' ? 'en' : 'es')}>
      <option value="es" lang="es">Español</option>
      <option value="en" lang="en">English</option>
    </select>
  </label>;
}
