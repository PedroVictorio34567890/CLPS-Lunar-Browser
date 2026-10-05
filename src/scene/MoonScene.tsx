import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, ComponentRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Line, OrbitControls, useTexture } from '@react-three/drei';
import { CanvasTexture, Mesh, SRGBColorSpace, Vector3, Quaternion, MOUSE, TOUCH } from 'three';
import { RotateCcw, MousePointer2, ScanLine, AlertTriangle } from 'lucide-react';
import type { CandidateSite, Coordinates } from '../models';
import { geographicToCartesian, cartesianToGeographic } from '../lib/coordinates';
import { Sun } from './Sun';
import { Earth } from './Earth';
import { sceneEphemeris } from '../science/sceneEphemeris';
// Preserve the original camera distance, looking past the limb toward Earth.
const INITIAL_CAMERA = new Vector3(-5, -0.6, 1.4).normalize().multiplyScalar(Math.hypot(3.2, 1.9, 3.8)).toArray();
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="scene-fallback"><AlertTriangle/><strong>No se pudo cargar la escena 3D.</strong><span>Comprueba WebGL y recarga la página. Puedes seguir usando las coordenadas manuales.</span></div> : this.props.children; }
}
function Controls({ automatic, resetKey, onInteract }: { automatic: boolean; resetKey: number; onInteract: () => void }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const camera = useThree(state => state.camera);
  useEffect(() => { if (controls.current) { controls.current.reset(); camera.position.set(...INITIAL_CAMERA); controls.current.target.set(0, 0, 0); controls.current.update(); } }, [resetKey, camera]);
  return <OrbitControls ref={controls} makeDefault enablePan={false} autoRotate={automatic} autoRotateSpeed={0.22} enableDamping dampingFactor={0.07} rotateSpeed={0.5} zoomSpeed={0.65} minDistance={1.65} maxDistance={8} onStart={onInteract} mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }} touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_ROTATE }}/>;
}
function Stars() {
  const positions = useMemo(() => {
    let seed = 43;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    return new Float32Array(Array.from({ length: 1100 }, () => { const a = random() * Math.PI * 2, b = Math.acos(2 * random() - 1), r = 200000; return [r * Math.sin(b) * Math.cos(a), r * Math.cos(b), r * Math.sin(b) * Math.sin(a)]; }).flat());
  }, []);
  return <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]}/></bufferGeometry><pointsMaterial color="#a7b4ca" size={0.07 * 200000 / 65} sizeAttenuation transparent opacity={0.65}/></points>;
}
function PinLabel({ site }: { site: CandidateSite }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    ctx.beginPath(); ctx.arc(48, 48, 41, 0, Math.PI * 2); ctx.fillStyle = '#0b131e'; ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = site.color; ctx.stroke();
    ctx.fillStyle = site.color; ctx.font = 'bold 47px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(site.slot + 1), 48, 50);
    const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace; return map;
  }, [site.color, site.slot]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <sprite position={geographicToCartesian(site, 1.065)} scale={[0.045, 0.045, 1]} raycast={() => null}><spriteMaterial map={texture} sizeAttenuation={false} depthTest transparent toneMapped={false}/></sprite>;
}
function Moon({ sites, onSelect, canSelect }: { sites: CandidateSite[]; onSelect: (c: Coordinates) => void; canSelect: () => boolean }) {
  const mesh = useRef<Mesh>(null!);
  const map = useTexture('/textures/lroc_color_2k.jpg');
  map.colorSpace = SRGBColorSpace;
  map.anisotropy = 8;
  const polarRing = useMemo(() => Array.from({ length: 129 }, (_, i) => geographicToCartesian({ latitude: -80, longitude: i / 128 * 360 }, 1.003)), []);
  return <group>
      <mesh ref={mesh} onClick={event => { event.stopPropagation(); if (event.button !== 0 || event.delta > 4 || !canSelect()) return; const local = mesh.current.worldToLocal(event.point.clone()); onSelect(cartesianToGeographic(local.toArray())); }}>
      <sphereGeometry args={[1, 128, 96]}/><meshStandardMaterial map={map} roughness={1} metalness={0}/>
    </mesh>
    <Line points={polarRing} color="#b7dc90" transparent opacity={0.55} lineWidth={1} raycast={() => null}/>
    {sites.map(site => {
      const p = geographicToCartesian(site, 1.025);
      const normal = new Vector3(...p).normalize();
      const orientation = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), normal);
      return <group key={site.id} position={p} quaternion={orientation}>
        <mesh raycast={() => null}><ringGeometry args={[0.021, 0.028, 32]}/><meshBasicMaterial color={site.color}/></mesh>
        <mesh position={[0, 0, 0.01]} raycast={() => null}><sphereGeometry args={[0.012, 16, 16]}/><meshBasicMaterial color={site.color}/></mesh>
      </group>;
    })}
    {sites.map(site => <PinLabel key={site.id} site={site}/>)}
  </group>;
}
export function MoonScene({ sites, onSelect, timestamp }: { sites: CandidateSite[]; onSelect: (c: Coordinates) => void; timestamp: number }) {
  const bodies = useMemo(() => sceneEphemeris(timestamp), [timestamp]);
  const [automatic, setAutomatic] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const pointers = useRef(new Set<number>());
  const multitouch = useRef(false);
  const gestureStart = useRef<[number, number]>([0, 0]);
  const dragged = useRef(false);
  return <section className="scene" aria-label="Explorador lunar tridimensional">
    <div className="scene-title"><div className="eyebrow">EXPLORADOR DE SUPERFICIE</div><h1>Un lugar para<br/><span>la próxima misión.</span></h1><p>Explora la Luna. Prepara tu comparación.</p></div>
    <div className="scene-status"><span className={automatic ? 'status-dot active' : 'status-dot'}/>{automatic ? 'Órbita automática de cámara' : 'Exploración manual'}</div>
    <div className="canvas-wrap" onPointerDownCapture={event => { if (!pointers.current.size) { multitouch.current = false; dragged.current = false; gestureStart.current = [event.clientX, event.clientY]; } pointers.current.add(event.pointerId); if (pointers.current.size > 1) multitouch.current = true; setAutomatic(false); }} onPointerMoveCapture={event => { if (pointers.current.size && Math.hypot(event.clientX - gestureStart.current[0], event.clientY - gestureStart.current[1]) > 4) dragged.current = true; }} onPointerUpCapture={event => pointers.current.delete(event.pointerId)} onPointerCancelCapture={event => { pointers.current.delete(event.pointerId); multitouch.current = true; }} onWheelCapture={() => setAutomatic(false)}>
      <SceneBoundary><Canvas camera={{ position: INITIAL_CAMERA, fov: 33, near: 0.1, far: 300000 }} dpr={[1, 1.75]} gl={{ antialias: true }} fallback={<div className="scene-fallback">WebGL no está disponible. Usa el formulario de coordenadas.</div>}>
        <ambientLight intensity={0.08}/><Sun position={bodies.sun}/><Stars/>
        <Suspense fallback={null}><Moon sites={sites} onSelect={onSelect} canSelect={() => !multitouch.current && !dragged.current}/></Suspense>
        <Suspense fallback={null}><Earth position={bodies.earth}/></Suspense>
        <Controls automatic={automatic} resetKey={resetKey} onInteract={() => setAutomatic(false)}/>
      </Canvas></SceneBoundary>
    </div>
    <div className="scene-bottom"><div className="gesture-hint"><MousePointer2 size={15}/><span>Pulsa para marcar <b>·</b> Arrastra para orbitar <b>·</b> Rueda o pellizca para zoom</span></div><button className="reset-button" onClick={() => { setResetKey(k => k + 1); setAutomatic(true); }}><RotateCcw size={14}/> Restablecer vista</button></div>
    <div className="scene-caption"><span><ScanLine size={12}/> Tierra–Luna a escala real · efemérides UTC</span><span>Iluminación sobre esfera</span></div>
  </section>;
}
