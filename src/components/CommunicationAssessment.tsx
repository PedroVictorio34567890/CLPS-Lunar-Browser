import { t, locale, useLanguage } from '../i18n';
import type { MissionRequirements, SiteReport } from '../models';
import { evaluateCommunications } from '../lib/mission';
import { formatInstant } from '../lib/playback';

const number = (value: number) => value.toLocaleString(locale(), { maximumFractionDigits: 2 });
export function CommunicationAssessment({ site, mission }: { site: SiteReport; mission: MissionRequirements }) {
  useLanguage();
  const result = evaluateCommunications(site, mission);
  if (!result) return <p>{t("Evaluación de comunicaciones pendiente.")}</p>;
  const start = site.series!.samples[0].time, end = site.series!.samples.at(-1)!.time;
  return <section className="communication-assessment" aria-label={t("Requisitos de comunicación del lugar {0}", [site.site.slot + 1])}>
    <p className={`requirement-result ${result.passes ? 'pass' : 'fail'}`}>{result.passes ? t("Cumple los umbrales geométricos") : t("No cumple los umbrales geométricos")}</p>
    <p>{t("Centro terrestre por encima de")} {number(mission.minEarthElevationDeg)}{t("°. No certifica cobertura de radio.")}</p>
    <div className="requirement-line"><span>{t("Disponibilidad ≥")} {number(mission.minAvailabilityPercent)}%</span><strong>{number(result.percent)}% · {result.availabilityPass ? t("Cumple") : t("No cumple")}</strong></div>
    <div className="requirement-line"><span>{t("Interrupción continua ≤")} {number(mission.maxOutageHours)} h</span><strong>{number(result.longestHiddenHours)} h · {result.outagePass ? t("Cumple") : t("No cumple")}</strong></div>
    <div className="requirement-line"><span>{t("Ventana continua más larga")}</span><strong>{number(result.longestVisibleHours)} h</strong></div>
    <svg className="communication-band" viewBox="0 0 1000 18" preserveAspectRatio="none" role="img" aria-label={t("Disponibilidad geométrica con elevación mínima {0} grados. {1} por ciento disponible.", [mission.minEarthElevationDeg, number(result.percent)])}>
      {result.windows.map((window, i) => <rect key={i} x={(window.start - start) / (end - start) * 1000} y="0" width={(window.end - window.start) / (end - start) * 1000} height="18" fill={window.visible ? '#79caff' : '#654349'}/>)}
    </svg><p>{t("Azul: sobre el umbral · rojo: sin acceso geométrico. Inicio → fin del periodo.")}</p>
    <details><summary>{t("Interrupciones (")}{result.outages.length}{t(") · de mayor a menor")}</summary>
      {!result.outages.length ? <p>{t("Sin interrupciones detectadas en el periodo.")}</p> : <ol>{result.outages.map(window => <li key={window.start}><strong>{number((window.end - window.start) / 3600000)} h</strong><span>{formatInstant(window.start)} → {formatInstant(window.end)}</span>{(window.start === start || window.end === end) && <small>{t("Recortada por el límite del periodo; puede prolongarse fuera de él.")}</small>}</li>)}</ol>}
    </details>
    <p>{t("Umbrales evaluados sin redondear. Muestreo de 5 min y cruces interpolados: pueden omitirse cortes breves. No incluye relieve, estaciones, relés ni calidad del enlace.")}</p>
  </section>;
}
