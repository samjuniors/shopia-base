import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, Color, Group, MeshBasicMaterial, TorusGeometry } from "three";
import { useSophiaStore } from "@/store/sophiaStore";

export default function LightRings() {
  const on = useSophiaStore((s) => s.ringsOn);
  const count = useSophiaStore((s) => Math.max(1, Math.round(s.ringCount)));
  const radius = useSophiaStore((s) => s.ringRadius);
  const group = useRef<Group>(null);

  const geometry = useMemo(() => new TorusGeometry(1, 0.012, 8, 160), []);
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color("#c4b5fd"),
        transparent: true,
        opacity: 0.2,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  useFrame((_, delta) => {
    const s = useSophiaStore.getState();
    if (!s.ringsOn || !group.current) return;
    const d = Math.min(delta, 0.1);
    const spin = s.ringSpeed * s.ringDirection * s.speed * d;
    if (s.ringAxis === "x") group.current.rotation.x += spin;
    else if (s.ringAxis === "z") group.current.rotation.z += spin;
    else group.current.rotation.y += spin;
    material.color.set(s.colorC);
    material.opacity = s.ringOpacity * 0.55 * s.ringGlow;
  });

  if (!on) return null;

  return (
    <group ref={group}>
      {Array.from({ length: count }, (_, i) => (
        <mesh
          key={i}
          geometry={geometry}
          material={material}
          scale={radius * (1 + i * 0.16)}
          rotation={[Math.PI / 2, 0, i * 0.2]}
          raycast={() => {}}
        />
      ))}
    </group>
  );
}
