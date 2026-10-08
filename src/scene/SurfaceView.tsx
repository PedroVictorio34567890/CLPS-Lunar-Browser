import { t, useLanguage } from '../i18n';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { BackSide, CanvasTexture, PerspectiveCamera, SRGBColorSpace } from 'three';
import type { CandidateSite } from '../models';
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
function Horizon() {
  const currentLanguage = useLanguage();
  const points = useMemo(() => Array.from({ length: 181 }, (_, i): [number, number, number] => {
    const a = i * Math.PI / 90; return [10 * Math.sin(a), 0, -10 * Math.cos(a)];
  }), []);
  return <>
    {/* Near lower hemisphere masks bodies below the ideal 0° horizon. */}
    <mesh><sphereGeometry args={[10, 96, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]}/><meshBasicMaterial color="#34414c" side={BackSide}/></mesh>
    <Line points={points} color="#85957e" lineWidth={1}/>
    {['N', 'E', 'S', currentLanguage === 'en' ? 'W' : 'O'].map((name, i) => <Cardinal key={name} name={name} azimuth={i * 90}/>)}
  </>;
}
export function SurfaceView({ site, timestamp }: { site: CandidateSite; timestamp: number }) {
  useLanguage();
  const sky = useMemo(() => {
    const bodies = lunarEphemeris(timestamp);
    return { sun: localSky(site, bodies.sun), earth: localSky(site, bodies.earth) };
  }, [site.latitude, site.longitude, timestamp]);
  const [look, setLook] = useState({ azimuth: 0, elevation: 5 });
  const [fov, setFov] = useState(35);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const turn = (dx: number, dy: number) => setLook(current => ({ azimuth: ((current.azimuth + dx) % 360 + 360) % 360, elevation: Math.max(-85, Math.min(85, current.elevation + dy)) }));
  const aim = (body: typeof sky.sun) => setLook(current => ({ azimuth: body.azimuth ?? current.azimuth, elevation: Math.max(-85, Math.min(85, body.elevation)) }));
  return <div className="surface-view">
    <div className="surface-heading"><div className="eyebrow">{t("DESDE LUGAR")} {site.slot + 1}</div><p>{formatCoordinates(site)}</p><span>{t("Horizonte ideal · sin relieve · altura 0 m")}</span></div>
    <div className="surface-canvas" tabIndex={0} role="region" aria-label={t("Mirada desde la superficie. Arrastra o usa las flechas para mirar alrededor.")}
      onPointerDown={event => { if (pointer.current || event.button !== 0) return; event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY }; }}
      onPointerMove={event => { const p = pointer.current; if (!p || p.id !== event.pointerId) return; turn((p.x - event.clientX) * 0.2, (event.clientY - p.y) * 0.2); pointer.current = { id: p.id, x: event.clientX, y: event.clientY }; }}
      onPointerUp={event => { if (pointer.current?.id === event.pointerId) pointer.current = null; }} onPointerCancel={event => { if (pointer.current?.id === event.pointerId) pointer.current = null; }} onLostPointerCapture={event => { if (pointer.current?.id === event.pointerId) pointer.current = null; }}
      onKeyDown={event => { if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return; event.preventDefault(); turn(event.key === 'ArrowLeft' ? -5 : event.key === 'ArrowRight' ? 5 : 0, event.key === 'ArrowUp' ? 5 : event.key === 'ArrowDown' ? -5 : 0); }}>
      <Canvas camera={{ position: [0, 0, 0], fov: 60, near: 0.1, far: 300000 }} dpr={[1, 1.75]} fallback={<p>{t("WebGL no disponible. Consulta los valores de dirección y elevación.")}</p>}>
        <color attach="background" args={['#090f19']}/><ambientLight intensity={0.08}/>
        <Look {...look} fov={fov}/><Sun position={sky.sun.position}/>
        <Suspense fallback={null}><Earth position={sky.earth.position}/></Suspense>
        <Horizon/>
      </Canvas>
    </div>
    <div className="surface-instruments">
      <div className="look-reading"><span>{t("Mirada:")} {look.azimuth.toFixed(1)}{t("° azimut ·")} {look.elevation.toFixed(1)}{t("° elevación")}</span><div className="surface-look-actions"><button disabled={fov <= 20} onClick={() => setFov(value => Math.max(20, value - 10))}>{t("Acercar")}</button><button disabled={fov >= 80} onClick={() => setFov(value => Math.min(80, value + 10))}>{t("Alejar")}</button><button onClick={() => setLook({ azimuth: 0, elevation: 5 })}>{t("Mirar al norte")}</button></div></div>
      <div className="sky-readings">{(['sun','earth'] as const).map(body => <div className={`sky-reading ${body}`} key={body}>
        <strong>{body === 'sun' ? t("Sol") : t("Tierra")}</strong><span>{t("Elevación")} {sky[body].elevation.toFixed(2)}°</span><span>{t("Azimut")} {sky[body].azimuth === null ? t("indefinido") : sky[body].azimuth.toFixed(2) + '°'}</span>
        <small>{Math.abs(sky[body].elevation) < 1e-8 ? t("Centro en el horizonte") : sky[body].elevation > 0 ? t("Centro sobre el horizonte") : t("Centro bajo el horizonte")}</small>
        <button onClick={() => aim(sky[body])}>{t("Mirar hacia")} {body === 'sun' ? t("el Sol") : t("la Tierra")}</button>
      </div>)}</div>
      <p>{t("Arrastra o usa las flechas. Azimut desde el norte hacia el este.")} {Math.abs(site.latitude) === 90 && t("En el polo, la longitud elegida define el meridiano de referencia.")}</p>
    </div>
  </div>;
}
