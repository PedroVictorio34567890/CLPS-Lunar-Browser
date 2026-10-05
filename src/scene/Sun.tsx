import { useEffect, useMemo } from 'react';
import { AdditiveBlending, CanvasTexture, SRGBColorSpace } from 'three';

// Position and radius use lunar-radius units.
// The visible Sun and the directional light share this direction.
const SUN_RADIUS = 695700 / 1737.4;

export function Sun({ position }: { position: [number, number, number] }) {
  const halo = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d')!;
    const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 250, 224, 1)');
    gradient.addColorStop(0.10, 'rgba(255, 231, 168, 0.8)');
    gradient.addColorStop(0.20, 'rgba(255, 200, 112, 0.32)');
    gradient.addColorStop(0.42, 'rgba(255, 174, 72, 0.08)');
    gradient.addColorStop(0.70, 'rgba(255, 158, 62, 0.018)');
    gradient.addColorStop(1, 'rgba(255, 158, 62, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, []);

  useEffect(() => () => halo.dispose(), [halo]);

  return <>
    <directionalLight position={position} intensity={3.1} color="#fff4df" />
    <group position={position} name="sun">
      <mesh raycast={() => null}>
        <sphereGeometry args={[SUN_RADIUS, 32, 24]} />
        <meshBasicMaterial color="#fff9e7" toneMapped={false} />
      </mesh>
      {/* A camera-facing glow anchored in world space. Depth testing lets
          the Moon occlude both the solar disc and its halo naturally. */}
      <sprite scale={[SUN_RADIUS * 12, SUN_RADIUS * 12, 1]} raycast={() => null}>
        <spriteMaterial
          map={halo}
          blending={AdditiveBlending}
          transparent
          depthTest
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
    </group>
  </>;
}
