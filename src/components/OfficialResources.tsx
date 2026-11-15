import { useState } from 'react';
import { useLanguage, locale } from '../i18n';
import type { AnalysisPeriod, CandidateSite } from '../models';
import { OFFICIAL_RESOURCES, RESOURCE_REVIEW_DATE, TREK_POLAR, horizonsQuery, polarTile } from '../lib/officialResources';
import { periodError } from '../lib/period';
import { compareHorizons } from '../science/horizonsValidation';

function PolarPreview({site}:{site:CandidateSite}) {
  const en=useLanguage()==='en', [zoom,setZoom]=useState(6);
  const [loaded,setLoaded]=useState(''),[failed,setFailed]=useState('');
  const tile=polarTile(site,zoom);
  return <>
    <label>{en?'Map detail':'Detalle del mapa'}<select value={zoom} onChange={e=>setZoom(Number(e.target.value))}>{[4,5,6,7,8,9].map(z=><option key={z} value={z}>{z}</option>)}</select></label>
    {!tile?<p role="status">{en?'Outside this polar layer. Use QuickMap or Moon Trek to explore other regions.':'Fuera de esta capa polar. Usa QuickMap o Moon Trek para consultar otras regiones.'}</p>:<>
      <div className="official-map">
        <img src={tile.url} alt={en?'LOLA south polar shaded relief from NASA Moon Trek':'Relieve sombreado LOLA del polo sur de NASA Moon Trek'} onLoad={()=>setLoaded(tile.url)} onError={()=>setFailed(tile.url)}/>
        {loaded===tile.url&&failed!==tile.url&&<span className="official-map-marker" style={{left:`${tile.x}%`,top:`${tile.y}%`}} aria-label={en?'Selected location':'Lugar seleccionado'}>+</span>}
      </div>
      <p role="status">{failed===tile.url?(en?'Map unavailable or no tile coverage. Scientific calculations remain available.':'Mapa no disponible o sin cobertura de tesela. Los cálculos científicos siguen disponibles.'):loaded!==tile.url?(en?'Loading NASA map…':'Cargando mapa NASA…'):(en?'Map loaded. Blank areas may have no data.':'Mapa cargado. Las zonas vacías pueden no tener datos.')}</p>
      <p>{en?'Tile width':'Anchura de tesela'}: {(tile.spanM/1000).toLocaleString(locale(),{maximumFractionDigits:2})} km · {en?'Polar stereographic, not north-up everywhere.':'Estereográfica polar; el norte local no siempre apunta hacia arriba.'}</p>
    </>}
    <p>{en?'Static shaded relief, not illumination at mission time. An image, not numerical elevations. This layer does not extend the calculation DEM coverage or certify landing safety.':'Relieve sombreado estático, no iluminación a la hora de la misión. Es una imagen, no elevaciones numéricas. Esta capa no amplía la cobertura del DEM de cálculo ni certifica un aterrizaje.'}</p>
    <a href={`${TREK_POLAR}/1.0.0/WMTSCapabilities.xml`} target="_blank" rel="noreferrer">NASA Moon Trek · LOLA · WMTS ↗</a>
  </>;
}

export function OfficialResources({sites,period}:{sites:CandidateSite[];period:AnalysisPeriod}) {
  const en=useLanguage()==='en';
  const [selected,setSelected]=useState(''),[opened,setOpened]=useState(false),[text,setText]=useState(''),[error,setError]=useState('');
  const [validation,setValidation]=useState<{periodKey:string;result:ReturnType<typeof compareHorizons>}|null>(null);
  const site=sites.find(s=>s.id===selected)??sites[0], periodKey=JSON.stringify(period), validPeriod=!periodError(period);
  const current=validation?.periodKey===periodKey?validation.result:null;
  function verify() {try {setValidation({periodKey,result:compareHorizons(text,period)});setError('');}catch{setValidation(null);setError(en?'Invalid response: use the prepared geocentric query, JSON API v1.2, with the current start and end dates. Surface queries cannot be imported here.':'Respuesta no válida: usa la consulta geocéntrica preparada, JSON API v1.2, con el inicio y fin actuales. Las consultas de superficie no se importan aquí.');}}
  function exportReview() {
    const record={schema:'lunar-resource-review-v1',reviewed:RESOURCE_REVIEW_DATE,exportedAt:new Date().toISOString(),period,sites,resources:OFFICIAL_RESOURCES,map:{layer:'LRO_LOLA_Shade_SPole875_5mp_v04',capabilities:`${TREK_POLAR}/1.0.0/WMTSCapabilities.xml`,purpose:'visual-context-only'},horizons:current?{query:horizonsQuery(period),comparison:current,originalResponse:JSON.parse(text),scope:'geocentric apparent subpoints versus local geometric IAU model; not terrain or relay validation'}:null,relayStatus:'pending-orbits-and-service-windows'};
    const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='lunar-resource-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <details className="official-resources" onToggle={e=>setOpened(e.currentTarget.open)}>
    <summary>{en?'Official resources · maps and verification':'Recursos oficiales · mapas y verificación'}</summary>
    {opened&&<div className="official-resource-content">
      <p>{en?'Resources reviewed':'Recursos revisados'}: {RESOURCE_REVIEW_DATE}. {en?'These portals are not a new mission data delivery. Relay coverage still requires orbit and service data.':'Estos portales no equivalen a una entrega nueva de datos de misión. La cobertura de relés sigue necesitando órbitas y datos de servicio.'}</p>
      <div className="official-resource-grid">{OFFICIAL_RESOURCES.map(r=><article key={r.name}><h3><a href={r.url} target="_blank" rel="noreferrer">{r.name} ↗</a></h3><small>{r.owner}</small><p>{en?r.en:r.es}</p></article>)}</div>
      <div className="official-resource-grid"><section><h3>{en?'Inspect a candidate site':'Examinar un lugar candidato'}</h3>
        {!site?<p>{en?'Add a candidate site to view its map.':'Añade un lugar candidato para ver su mapa.'}</p>:<>
          <label>{en?'Location for official maps':'Lugar para mapas oficiales'}<select value={site.id} onChange={e=>setSelected(e.target.value)}>{sites.map(s=><option key={s.id} value={s.id}>{en?'Site':'Lugar'} {s.slot+1} · {s.latitude.toFixed(5)}°, {s.longitude.toFixed(5)}°</option>)}</select></label>
          <p>{en?'North latitude / east longitude (degrees). Copy these into the search tools in QuickMap or Moon Trek.':'Latitud norte / longitud este (grados). Copia estas coordenadas en las herramientas de búsqueda de QuickMap o Moon Trek.'}</p>
          <input readOnly aria-label={en?'Coordinates to copy':'Coordenadas para copiar'} value={`${site.latitude.toFixed(6)}, ${site.longitude.toFixed(6)}`}/>
          <PolarPreview site={site}/>
          {validPeriod&&<p><a href={horizonsQuery(period,site,'sun')} target="_blank" rel="noreferrer">{en?'Sun from this site':'Sol desde este lugar'} ↗</a> · <a href={horizonsQuery(period,site,'earth')} target="_blank" rel="noreferrer">{en?'Earth from this site':'Tierra desde este lugar'} ↗</a></p>}
          <p>{en?'Surface queries: eight instants, reference elevation 0 km, apparent azimuth/elevation, no terrain. Not station or relay windows.':'Consultas de superficie: ocho instantes, altura de referencia 0 km, azimut/elevación aparentes, sin relieve. No son ventanas de estación ni de relé.'}</p>
        </>}
      </section><section><h3>{en?'Check ephemerides with Horizons':'Contrastar efemérides con Horizons'}</h3>
        <p>{period.start.replace('T',' ')} → {period.end.replace('T',' ')} UTC</p>
        <ol><li>{validPeriod?<a href={horizonsQuery(period)} target="_blank" rel="noreferrer">{en?'Open prepared geocentric query':'Abrir consulta geocéntrica preparada'} ↗</a>:(en?'Correct mission dates first.':'Corrige las fechas de misión primero.')}</li><li>{en?'Copy the complete JSON response into the field below, or load the saved JSON file.':'Copia la respuesta JSON completa en el campo inferior o carga el archivo JSON guardado.'}</li><li>{en?'Press Compare. The model and saved scenarios remain unchanged.':'Pulsa Contrastar. El modelo y los escenarios guardados conservan sus datos.'}</li></ol>
        <p>{en?'The JPL API is opened externally in accordance with its browser-access policy. No background requests.':'La API de JPL se abre externamente conforme a su política de acceso desde navegadores. Sin consultas en segundo plano.'} <a href="https://ssd-api.jpl.nasa.gov/doc/" target="_blank" rel="noreferrer">JPL ↗</a></p>
        <label>{en?'Horizons JSON response':'Respuesta JSON de Horizons'}<textarea value={text} maxLength={2_000_000} onChange={e=>{setText(e.target.value);setValidation(null);setError('');}} rows={5}/></label>
        <label>{en?'Load Horizons JSON':'Cargar JSON de Horizons'}<input type="file" accept=".json,application/json" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';setValidation(null);setError('');if(!file)return;if(file.size>2_000_000){setText('');setError(en?'Maximum file size: 2 MB.':'Tamaño máximo: 2 MB.');return;}try{setText(await file.text());}catch{setText('');setError(en?'Could not read file.':'No se pudo leer el archivo.');}}}/></label>
        <button disabled={!text||!validPeriod} onClick={verify}>{en?'Compare with local model':'Contrastar con el modelo local'}</button>
        {error&&<p role="alert">{error}</p>}
        {current&&<div role="status"><h4>{en?'Comparison completed':'Contraste completado'}</h4><p>{current.rows.length} {en?'instants · maximum coordinate difference':'instantes · diferencia máxima de coordenadas'}:</p><p>{en?'Earth':'Tierra'}: {current.maxEarthDeg.toFixed(5)}° · {en?'Sun':'Sol'}: {current.maxSunDeg.toFixed(5)}°</p></div>}
        <p>{en?'This compares geocentric apparent sub-Earth/subsolar coordinates with geometric coordinates in the local IAU model. Light time and orientation differences are expected. It does not validate terrain, communications, energy or a relay; no pass/fail threshold is assumed.':'Compara coordenadas geocéntricas aparentes subterrestres/subsolares con coordenadas geométricas del modelo IAU local. Se esperan diferencias por tiempo de luz y orientación. No valida terreno, comunicaciones, energía ni relés; no se presupone un umbral de aprobación.'}</p>
      </section></div>
      <button onClick={exportReview}>{en?'Export resource review':'Exportar revisión de recursos'}</button>
      <p>{en?'JSON includes sites, dates, source links and any current Horizons comparison with its original response. No claim of NASA certification.':'El JSON incluye lugares, fechas, enlaces de origen y el contraste Horizons vigente con su respuesta original, si lo hay. No implica certificación NASA.'}</p>
    </div>}
  </details>;
}
