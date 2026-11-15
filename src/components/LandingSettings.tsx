import { useLanguage } from '../i18n';
import { DEFAULT_LANDING, type LandingSettings as Settings } from '../science/landingTerrain';
export function LandingSettings({value,onChange}:{value?:Settings;onChange:(v:Settings)=>void}) {
  const en=useLanguage()==='en',v=value??DEFAULT_LANDING;
  const fields:[keyof Settings,string,string,number,number][]=[
    ['radiusM','Radio del entorno a estudiar (m)','Terrain study radius (m)',40,2000],
    ['maxSlopeDeg','Límite exploratorio de pendiente (°)','Exploratory slope limit (°)',0,90],
    ['maxReliefM','Límite de desnivel total del entorno (m)','Maximum elevation range across study area (m)',0,20000],
  ];
  return <details className="energy-settings"><summary>{en?'Terrain · slope and elevation range':'Terreno · pendientes y desniveles'}</summary>
    <p className="footnote">{en?'Editable screening examples, not NASA landing requirements. The circle is a study area, not a certified landing ellipse or a lander footprint.':'Ejemplos editables de evaluación preliminar, no requisitos de aterrizaje NASA. El círculo es una zona de estudio, no una elipse de aterrizaje certificada ni la huella de un módulo.'}</p>
    {fields.map(([key,es,english,min,max])=><label key={key}>{en?english:es}<input type="number" min={min} max={max} step="any" value={Number.isFinite(v[key])?v[key]:''} onChange={e=>onChange({...v,[key]:e.target.value===''?NaN:Number(e.target.value)})}/></label>)}
    <p className="footnote">{en?'Uses the 20 m grid where the whole area fits; otherwise the 80 m regional grid. Radius must be at least two grid steps. Small rocks, landing gear contact and ground strength are not resolved.':'Usa la malla de 20 m cuando cabe todo el entorno; en el resto, la regional de 80 m. El radio debe abarcar al menos dos pasos de malla. No resuelve rocas pequeñas, apoyo de patas ni resistencia del suelo.'}</p>
  </details>;
}
