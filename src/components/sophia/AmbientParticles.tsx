import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  PointsMaterial,
} from "three";
import { useSophiaStore } from "@/store/sophiaStore";

export default function AmbientParticles() {
  const on = useSophiaStore((s) => s.particlesOn);
  const count = useSophiaStore((s) => Math.round(s.particleAmount));
  const spread = useSophiaStore((s) => s.particleSpread);
  const size = useSophiaStore((s) => s.particleSize);
  const brightness = useSophiaStore((s) => s.particleBrightness);
  const speed = useSophiaStore((s) => s.particleSpeed);
  const drift = useSophiaStore((s) => s.particleDrift);
  const opacity = useSophiaStore((s) => s.particleOpacity);
  const colorB = useSophiaStore((s) => s.colorB);

  const points = useRef<Points>(null);
  const seeds = useRef<Float32Array>(new Float32Array(0));
  const origin = useRef<Float32Array>(new Float32Array(0));

  const geometry = useMemo(() => {
    const geo = new BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = spread * (0.42 + Math.random() * 0.58);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.82;
      pos[i * 3 + 2] = r * Math.cos(phi);
      seed[i] = Math.random() * 100;
    }
    geo.setAttribute("position", new BufferAttribute(pos, 3));
    seeds.current = seed;
    origin.current = pos.slice();
    return geo;
  }, [count, spread]);

  const material = useMemo(() => {
    return new PointsMaterial({
      color: new Color(colorB),
      size: size * 0.045,
      transparent: true,
      opacity: opacity * brightness,
      blending: AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      toneMapped: false,
    });
  }, [colorB, size, opacity, brightness]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame(({ clock }) => {
    if (!on || !points.current) return;
    const attr = points.current.geometry.getAttribute("position") as BufferAttribute;
    const t = clock.elapsedTime * speed;
    const seed = seeds.current;
    const orig = origin.current;
    for (let i = 0; i < attr.count; i++) {
      const sx = seed[i] ?? i;
      attr.setX(i, orig[i * 3] + Math.cos(t * 0.7 + sx) * drift * 0.18);
      attr.setY(i, orig[i * 3 + 1] + Math.sin(t + sx) * drift * 0.22);
      attr.setZ(i, orig[i * 3 + 2] + Math.sin(t * 0.55 + sx) * drift * 0.14);
    }
    attr.needsUpdate = true;
    material.color.set(useSophiaStore.getState().colorB);
    material.opacity = opacity * brightness;
    material.size = size * 0.045;
  });

  if (!on) return null;

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} raycast={() => {}} />;
}
