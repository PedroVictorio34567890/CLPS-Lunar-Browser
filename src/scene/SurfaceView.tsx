import { t, useLanguage } from '../i18n';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { BackSide, DoubleSide, CanvasTexture, PerspectiveCamera, SRGBColorSpace } from 'three';
import type { CandidateSite, SiteReport } from '../models';
import { analysisLabel } from '../lib/activeAnalysis';
import { horizonSilhouette, terrainSkyAt } from '../science/terrainView';
import { horizonAt } from '../science/terrain';
import { lunarEphemeris } from '../science/ephemeris';
import { localSky } from '../science/localSky';
import { formatCoordinates } from '../i18n';
import { Sun } from './Sun';
import { Earth } from './Earth';

function Look({ azimuth, elevation, fov }: { azimuth: number; elevation: number; fov: number }) {
  useLanguage();
  const camera = useThree(state => state.camera);
  useEffect(() => {
    const a = azimuth * Math.PI / 180, h = elevation * Math.PI / 180;
    camera.position.set(0, 0, 0);
    camera.lookAt(Math.sin(a) * Math.cos(h), Math.sin(h), -Math.cos(a) * Math.cos(h));
    if (camera instanceof PerspectiveCamera) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }, [camera, azimuth, elevation, fov]);
  return null;
}
function Cardinal({ name, azimuth }: { name: string; azimuth: number }) {
  useLanguage();
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#d3dda9'; ctx.fillText(name, 64, 44);
    const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace; return map;
  }, [name]);
  useEffect(() => () => texture.dispose(), [texture]);
  const a = azimuth * Math.PI / 180;
  return <sprite position={[9 * Math.sin(a), 0.3, -9 * Math.cos(a)]} scale={[1.2, 0.6, 1]}><spriteMaterial map={texture} transparent depthWrite={false} toneMapped={false}/></sprite>;
}
function Horizon({ profile }: { profile?: {azimuth:number;elevation:number}[] }) {
  const currentLanguage = useLanguage();
  const silhouette = useMemo(()=>profile ? horizonSilhouette(profile) : null,[profile]);
  const points = useMemo(() => Array.from({ length: 181 }, (_, i): [number, number, number] => {
    const a = i * Math.PI / 90; return [10 * Math.sin(a), 0, -10 * Math.cos(a)];
  }), []);
  return <>
    {/* Near lower hemisphere masks bodies below the ideal 0° horizon. */}
    <mesh><sphereGeometry args={[10, 96, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]}/><meshBasicMaterial color="#34414c" side={BackSide}/></mesh>
    <Line points={points} color="#85957e" lineWidth={1}/>
    {silhouette && <><mesh><bufferGeometry><bufferAttribute attach="attributes-position" args={[silhouette.positions,3]}/></bufferGeometry><meshBasicMaterial color="#34414c" side={DoubleSide}/></mesh><Line points={silhouette.outline} color="#f2c76d" lineWidth={2}/></>}
    {['N', 'E', 'S', currentLanguage === 'en' ? 'W' : 'O'].map((name, i) => <Cardinal key={name} name={name} azimuth={i * 90}/>)}
  </>;
}
export function SurfaceView({ site, timestamp, report }: { site: CandidateSite; timestamp: number; report?: SiteReport }) {
  const en = useLanguage() === 'en';
  const terrain = report?.terrain?.status === 'local' ? report.terrain : null;
  const terrainSky = useMemo(()=>terrain ? terrainSkyAt(terrain.sky,timestamp) : null,[terrain,timestamp]);
  const profile = terrainSky ? terrain!.profile : undefined;
  const sky = useMemo(() => {
    if (terrainSky) return terrainSky;
    const bodies = lunarEphemeris(timestamp);
    return { sun: localSky(site, bodies.sun), earth: localSky(site, bodies.earth) };
  }, [site.latitude, site.longitude, timestamp, terrainSky]);
  const [look, setLook] = useState({ azimuth: 0, elevation: 5 });
  const [fov, setFov] = useState(35);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const turn = (dx: number, dy: number) => setLook(current => ({ azimuth: ((current.azimuth + dx) % 360 + 360) % 360, elevation: Math.max(-85, Math.min(85, current.elevation + dy)) }));
  const aim = (body: typeof sky.sun) => setLook(current => ({ azimuth: body.azimuth ?? current.azimuth, elevation: Math.max(-85, Math.min(85, body.elevation)) }));
  return <div className="surface-view">
    <div className="surface-heading"><div className="eyebrow">{t("DESDE LUGAR")} {site.slot + 1}</div><p>{formatCoordinates(site)}</p><span>{profile ? (en ? 'LOLA horizon · 100 km · observer +2 m' : 'Horizonte LOLA · 100 km · observador +2 m') : analysisLabel(report?.terrain?.status === 'local' ? 'pending' : report?.terrain?.status ?? 'pending',en)}</span></div>
    <div className="surface-canvas" tabIndex={0} role="region" aria-label={t("Mirada desde la superficie. Arrastra o usa las flechas para mirar alrededor.")}
      onPointerDown={event => { if (pointer.current || event.button !== 0) return; event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY }; }}
      onPointerMove={event => { const p = pointer.current; if (!p || p.id !== event.pointerId) return; turn((p.x - event.clientX) * 0.2, (event.clientY - p.y) * 0.2); pointer.current = { id: p.id, x: event.clientX, y: event.clientY }; }}
      onPointerUp={event => { if (pointer.current?.id === event.pointerId) pointer.current = null; }} onPointerCancel={event => { if (pointer.current?.id === event.pointerId) pointer.current = null; }} onLostPointerCapture={event => { if (pointer.current?.id === event.pointerId) pointer.current = null; }}
      onKeyDown={event => { if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return; event.preventDefault(); turn(event.key === 'ArrowLeft' ? -5 : event.key === 'ArrowRight' ? 5 : 0, event.key === 'ArrowUp' ? 5 : event.key === 'ArrowDown' ? -5 : 0); }}>
      <Canvas camera={{ position: [0, 0, 0], fov: 60, near: 0.1, far: 300000 }} dpr={[1, 1.75]} fallback={<p>{t("WebGL no disponible. Consulta los valores de dirección y elevación.")}</p>}>
        <color attach="background" args={['#090f19']}/><ambientLight intensity={0.08}/>
        <Look {...look} fov={fov}/><Sun position={sky.sun.position}/>
        <Suspense fallback={null}><Earth position={sky.earth.position}/></Suspense>
        <Horizon profile={profile}/>
      </Canvas>
    </div>
    <div className="surface-instruments">
      <div className="look-reading"><span>{t("Mirada:")} {look.azimuth.toFixed(1)}{t("° azimut ·")} {look.elevation.toFixed(1)}{t("° elevación")}</span><div className="surface-look-actions"><button disabled={fov <= 20} onClick={() => setFov(value => Math.max(20, value - 10))}>{t("Acercar")}</button><button disabled={fov >= 80} onClick={() => setFov(value => Math.min(80, value + 10))}>{t("Alejar")}</button><button onClick={() => setLook({ azimuth: 0, elevation: 5 })}>{t("Mirar al norte")}</button></div></div>
      <div className="sky-readings">{(['sun','earth'] as const).map(body => <div className={`sky-reading ${body}`} key={body}>
        <strong>{body === 'sun' ? t("Sol") : t("Tierra")}</strong><span>{t("Elevación")} {sky[body].elevation.toFixed(2)}°</span><span>{t("Azimut")} {sky[body].azimuth === null ? t("indefinido") : sky[body].azimuth.toFixed(2) + '°'}</span>
        <small>{sky[body].elevation > (profile ? horizonAt(profile,sky[body].azimuth) : 0) ? t("Centro sobre el horizonte") : t("Centro bajo el horizonte")}</small>
        {profile && <small>{en ? 'Terrain horizon' : 'Horizonte del relieve'}: {horizonAt(profile,sky[body].azimuth).toFixed(2)}°</small>}
        <button onClick={() => aim(sky[body])}>{t("Mirar hacia")} {body === 'sun' ? t("el Sol") : t("la Tierra")}</button>
      </div>)}</div>
      <p>{t("Arrastra o usa las flechas. Azimut desde el norte hacia el este.")} {Math.abs(site.latitude) === 90 && t("En el polo, la longitud elegida define el meridiano de referencia.")}</p>
      <p>{profile ? (en ? 'Angular silhouette from LOLA, not a 3D terrain mesh. Sky interpolated from the report at 5-minute intervals. Narrow peaks and terrain beyond 100 km may be missed. No eclipses. Center visibility does not guarantee a radio link.' : 'Silueta angular derivada de LOLA, no una malla 3D del terreno. Cielo interpolado del informe a intervalos de 5 minutos. Pueden omitirse picos estrechos y terreno más allá de 100 km. Sin eclipses. Ver el centro terrestre no garantiza un enlace de radio.') : (en ? 'Ideal horizon at height 0 m. Analyze the current settings at a covered LOLA site to use terrain. Changing sites, dates or requirements invalidates the previous terrain calculation.' : 'Horizonte ideal a altura 0 m. Analiza la configuración actual en un lugar con cobertura LOLA para usar relieve. Cambiar lugares, fechas o requisitos invalida el cálculo de relieve anterior.')}</p>
    </div>
  </div>;
}
