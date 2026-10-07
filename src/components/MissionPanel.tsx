import { Radio } from 'lucide-react';
import type { MissionRequirements } from '../models';
import { missionError } from '../lib/mission';

export function MissionPanel({ mission, onChange }: { mission: MissionRequirements; onChange: (value: MissionRequirements) => void }) {
  const field = (key: Exclude<keyof MissionRequirements, 'panelMode'>, label: string, min: number, max?: number) => <label key={key}>{label}<input type="number" aria-label={label} min={min} max={max} step="any" value={Number.isFinite(mission[key]) ? mission[key] : ''} onChange={event => onChange({ ...mission, [key]: event.target.value === '' ? NaN : Number(event.target.value) })}/></label>;
  const error = missionError(mission);
  return <section className="section-block mission-panel" aria-labelledby="mission-title">
    <div className="section-heading"><h2 id="mission-title"><span className="step">03</span> Requisitos de misión</h2></div>
    <p className="mission-example">Valores de ejemplo editables · no son requisitos NASA.</p>
    <h3><Radio size={15}/> Prioridad: comunicaciones</h3>
    <p className="mission-description">Acceso directo al centro de la Tierra. Compara ventanas geométricas; no garantiza un enlace de radio.</p>
    {field('maxOutageHours', 'Interrupción máxima tolerable (h)', 0)}
    {field('minAvailabilityPercent', 'Disponibilidad mínima (%)', 0, 100)}
    {field('minEarthElevationDeg', 'Elevación terrestre mínima (°)', 0, 89.99)}
    <p className="footnote">El centro terrestre debe superar esta elevación. El margen no sustituye el relieve, una estación terrestre ni el presupuesto de enlace. Sin relés.</p>
    <details className="energy-settings"><summary>Energía · parámetros para el siguiente paso</summary>
      {field('operatingPowerW', 'Consumo en operación (W)', 0)}
      {field('standbyPowerW', 'Consumo en reposo (W)', 0)}
      {field('solarPowerW', 'Potencia nominal de paneles (W)', 0)}
      <label>Orientación de paneles<select aria-label="Orientación de paneles" value={mission.panelMode} onChange={event => onChange({ ...mission, panelMode: event.target.value as MissionRequirements['panelMode'] })}><option value="tracking">Seguimiento del Sol</option><option value="fixed">Orientación fija</option></select></label>
      {field('batteryWh', 'Capacidad de batería (Wh)', 0.01)}
      {field('initialChargePercent', 'Carga inicial (%)', 0, 100)}
      {field('reservePercent', 'Reserva mínima (%)', 0, 100)}
      <p className="footnote">Se guardan en el informe. El balance energético y la geometría del panel fijo todavía no se calculan.</p>
    </details>
    {error && <p className="error" role="alert">{error}</p>}
  </section>;
}
