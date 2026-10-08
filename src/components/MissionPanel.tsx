import { t, useLanguage } from '../i18n';
import { Radio } from 'lucide-react';
import type { MissionRequirements } from '../models';
import { missionError } from '../lib/mission';

export function MissionPanel({ mission, onChange }: { mission: MissionRequirements; onChange: (value: MissionRequirements) => void }) {
  useLanguage();
  const field = (key: Exclude<keyof MissionRequirements, 'panelMode'>, label: string, min: number, max?: number) => <label key={key}>{label}<input type="number" aria-label={label} min={min} max={max} step="any" value={Number.isFinite(mission[key]) ? mission[key] : ''} onChange={event => onChange({ ...mission, [key]: event.target.value === '' ? NaN : Number(event.target.value) })}/></label>;
  const error = missionError(mission);
  return <section className="section-block mission-panel" aria-labelledby="mission-title">
    <div className="section-heading"><h2 id="mission-title"><span className="step">03</span>  {t("Requisitos de misión")}</h2></div>
    <p className="mission-example">{t("Valores de ejemplo editables · no son requisitos NASA.")}</p>
    <h3><Radio size={15}/>  {t("Prioridad: comunicaciones")}</h3>
    <p className="mission-description">{t("Acceso directo al centro de la Tierra. Compara ventanas geométricas; no garantiza un enlace de radio.")}</p>
    {field('maxOutageHours', t("Interrupción máxima tolerable (h)"), 0)}
    {field('minAvailabilityPercent', t("Disponibilidad mínima (%)"), 0, 100)}
    {field('minEarthElevationDeg', t("Elevación terrestre mínima (°)"), 0, 89.99)}
    <p className="footnote">{t("El centro terrestre debe superar esta elevación. El margen no sustituye el relieve, una estación terrestre ni el presupuesto de enlace. Sin relés.")}</p>
    <details className="energy-settings"><summary>{t("Energía · parámetros para el siguiente paso")}</summary>
      {field('operatingPowerW', t("Consumo en operación (W)"), 0)}
      {field('standbyPowerW', t("Consumo en reposo (W)"), 0)}
      {field('solarPowerW', t("Potencia nominal de paneles (W)"), 0)}
      <label>{t("Orientación de paneles")}<select aria-label={t("Orientación de paneles")} value={mission.panelMode} onChange={event => onChange({ ...mission, panelMode: event.target.value as MissionRequirements['panelMode'] })}><option value="tracking">{t("Seguimiento del Sol")}</option><option value="fixed">{t("Orientación fija")}</option></select></label>
      {field('batteryWh', t("Capacidad de batería (Wh)"), 0.01)}
      {field('initialChargePercent', t("Carga inicial (%)"), 0, 100)}
      {field('reservePercent', t("Reserva mínima (%)"), 0, 100)}
      <p className="footnote">{t("Se guardan en el informe. El balance energético y la geometría del panel fijo todavía no se calculan.")}</p>
    </details>
    {error && <p className="error" role="alert">{t(error)}</p>}
  </section>;
}
