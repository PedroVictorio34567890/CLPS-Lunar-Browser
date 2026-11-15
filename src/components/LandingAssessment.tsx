import { useLanguage, locale } from '../i18n';
import type { SiteReport } from '../models';
export function LandingAssessment({site}:{site:SiteReport}) {
  const en=useLanguage()==='en',r=site.landing;
  const n=(v:number)=>v.toLocaleString(locale(),{maximumFractionDigits:2});
  return <section className="terrain-assessment" aria-label={en?'Terrain screening':'Evaluación del terreno'}>
    <h4>{en?'Slopes and elevation range · DEM scale':'Pendientes y desniveles · escala del DEM'}</h4>
    {!r||r.status!=='calculated'?<p>{r?.status==='outside'?(en?'The complete study area is outside the installed DEM coverage. No flat terrain or safe site is assumed.':'El entorno completo queda fuera de la cobertura de los DEM instalados. No se presupone terreno plano ni un lugar seguro.'):r?.status==='insufficient-resolution'?(en?`Insufficient resolution: ${r.spacingM} m grid. Increase the radius to at least ${(r.spacingM??80)*2} m or provide finer data.`:`Resolución insuficiente: malla de ${r.spacingM} m. Amplía el radio hasta al menos ${(r.spacingM??80)*2} m o aporta datos más finos.`):(en?'Terrain calculation unavailable. Data could not be loaded or verified, or contain missing values. Analyze again.':'Cálculo del terreno no disponible. Los datos no se pudieron cargar o verificar, o contienen huecos. Vuelve a analizar.')}</p>:<>
      <p><strong>{r.withinLimits?(en?'No sampled value exceeds your limits':'Ninguna muestra supera tus límites'):(en?'Your exploratory limits are exceeded':'Se superan tus límites exploratorios')}</strong>. {en?'This does not establish landing safety.':'Esto no establece seguridad de aterrizaje.'}</p>
      <p>{r.sourceId} · {en?'Grid':'Malla'} {r.spacingM} m · {en?'Radius':'Radio'} {n(r.settings.radiusM)} m · {r.sampleCount.toLocaleString(locale())} {en?'samples':'muestras'}.</p>
      <p>{en?'Slope limit':'Límite de pendiente'} {n(r.settings.maxSlopeDeg)}° · {en?'Elevation range limit':'Límite de desnivel'} {n(r.settings.maxReliefM)} m.</p>
      <table><tbody>{[
        [en?'Slope, mean / 95th percentile / maximum':'Pendiente, media / percentil 95 / máxima',`${n(r.meanSlopeDeg)} / ${n(r.p95SlopeDeg)} / ${n(r.maxSlopeDeg)}°`],
        [en?'Samples above slope limit':'Muestras sobre el límite de pendiente',`${n(r.aboveSlopePercent)} %`],
        [en?'Elevation, minimum / maximum':'Elevación, mínima / máxima',`${n(r.minElevationM)} / ${n(r.maxElevationM)} m`],
        [en?'Total elevation range':'Desnivel total',`${n(r.reliefM)} m`],
        [en?'Best-fit plane slope':'Pendiente del plano ajustado',`${n(r.planeSlopeDeg)}°`],
        [en?'RMS height residual from fitted plane':'Desviación RMS de alturas respecto al plano',`${n(r.residualRmsM)} m`],
        [en?'Largest positive / negative height residual':'Mayor residuo positivo / negativo de altura',`${n(r.maxPositiveResidualM)} / ${n(r.maxNegativeResidualM)} m`],
      ].map(([label,value])=><tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>)}</tbody></table>
      <figure><figcaption>{en?'Slope map · maximum per display cell':'Mapa de pendientes · máximo por celda de dibujo'}</figcaption>
        <svg viewBox="-5 -5 210 210" role="img" aria-label={en?'Slope distribution around the selected location':'Distribución de pendientes alrededor del lugar seleccionado'} style={{width:'100%',maxWidth:360,aspectRatio:'1'}}>
          <circle cx="100" cy="100" r="100" fill="#101925" stroke="#8994a2"/>
          {r.cells.map((c,i)=><rect key={i} x={100+(c.x-r.cellWidthM/2)/r.settings.radiusM*100} y={100-(c.y+r.cellWidthM/2)/r.settings.radiusM*100} width={r.cellWidthM/r.settings.radiusM*100} height={r.cellWidthM/r.settings.radiusM*100} fill={c.slope>r.settings.maxSlopeDeg+1e-9?'#df786b':'#87b8de'}><title>{n(c.slope)}°</title></rect>)}
          <path d="M95 100h10 M100 95v10" stroke="#fff" strokeWidth="1.5"/>
        </svg>
        <p>{en?'Blue: within slope limit; orange: exceeded. White cross: candidate. Axes are polar projection X/Y, not local north/east. Cells aggregate samples; edges approximate the circle.':'Azul: dentro del límite de pendiente; naranja: superado. Cruz blanca: candidato. Ejes X/Y de proyección polar, no norte/este local. Las celdas agrupan muestras; el contorno aproxima el círculo.'}</p>
      </figure>
      <details><summary>{en?'Method and resolution':'Método y resolución'}</summary><p>{en?`Slopes use centred differences over approximately ${n(r.slopeBaselineM)} m, corrected for projection scale. Percentages count samples, not certified safe area. Residuals describe DEM heights after removing a best-fit plane; they are not rock heights.`:`Pendientes por diferencias centrales sobre aproximadamente ${n(r.slopeBaselineM)} m, con corrección de escala de proyección. Los porcentajes cuentan muestras, no superficie segura certificada. Los residuos describen alturas del DEM tras retirar un plano ajustado; no son alturas de rocas.`}</p><a href={r.source} target="_blank" rel="noreferrer">{en?'Original DEM source':'Fuente original del DEM'} ↗</a></details>
    </>}
    <p>{en?'Static screening independent of mission dates. A wider regional terrain result does not extend illumination or radio horizon coverage. No sub-grid hazards, soil mechanics, landing dynamics or uncertainty map is assessed.':'Evaluación estática independiente de las fechas de misión. Un resultado de terreno regional no amplía la cobertura del horizonte de iluminación o radio. No se evalúan obstáculos menores que la malla, mecánica del suelo, dinámica del aterrizaje ni mapa de incertidumbres.'}</p>
  </section>;
}
