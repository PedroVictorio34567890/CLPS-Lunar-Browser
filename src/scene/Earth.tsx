import { useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import { AdditiveBlending, CanvasTexture, SRGBColorSpace } from 'three';

// One scene unit is one lunar radius; position comes from dated ephemerides.
const MOON_RADIUS_KM = 1737.4;
export const EARTH_RADIUS = 6371 / MOON_RADIUS_KM;


export function Earth({ position }: { position: [number, number, number] }) {
  const map = useTexture('/textures/earth_atmos_2048.jpg');
  map.colorSpace = SRGBColorSpace;
  map.anisotropy = 8;
  const label = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#b6d9ff'; ctx.font = '600 36px sans-serif';
    ctx.fillText('TIERRA', 128, 44);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, []);
  useEffect(() => () => label.dispose(), [label]);

  return <group name="earth" position={position}>
    <mesh raycast={() => null}>
      <sphereGeometry args={[EARTH_RADIUS, 64, 48]}/>
      <meshStandardMaterial map={map} roughness={0.85} metalness={0}/>
    </mesh>
    <mesh raycast={() => null}>
      <sphereGeometry args={[EARTH_RADIUS + 100 / MOON_RADIUS_KM, 64, 48]}/>
      <shaderMaterial transparent depthWrite={false} blending={AdditiveBlending}
        vertexShader={`varying vec3 normalView; varying vec3 viewDirection;
          void main() {
            vec4 p = modelViewMatrix * vec4(position, 1.0);
            normalView = normalize(normalMatrix * normal);
            viewDirection = -p.xyz;
            gl_Position = projectionMatrix * p;
          }`}
        fragmentShader={`varying vec3 normalView; varying vec3 viewDirection;
          void main() {
            float rim = pow(1.0 - max(dot(normalize(normalView), normalize(viewDirection)), 0.0), 3.0);
            gl_FragColor = vec4(0.2, 0.55, 1.0, rim * 0.55);
          }`}/>
    </mesh>
    <sprite position={[0, -6.5, 0]} scale={[19, 4.75, 1]} raycast={() => null}>
      <spriteMaterial map={label} transparent depthTest depthWrite={false} toneMapped={false}/>
    </sprite>
  </group>;
}
