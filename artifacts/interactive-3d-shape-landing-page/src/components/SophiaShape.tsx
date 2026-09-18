import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  Color,
  Curve,
  IcosahedronGeometry,
  MeshPhysicalMaterial,
  ShaderMaterial,
  TorusGeometry,
  TorusKnotGeometry,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
  type Group,
  type Mesh,
  type WebGLProgramParametersWithUniforms,
} from "three";
import { applySophiaOnBeforeCompile, GLOW_FRAGMENT, GLOW_VERTEX } from "../shaders/sophia";
import { useSophiaStore } from "../store/sophiaStore";
import { AXIS_VEC, DEG, type ShapeType, type VoiceState } from "../lib/types";

class OrganicRingCurve extends Curve<Vector3> {
  radius: number;
  constructor(radius: number) {
    super();
    this.radius = radius;
  }
  getPoint(t: number, target = new Vector3()) {
    const a = t * Math.PI * 2;
    const r =
      this.radius * (1 + 0.1 * Math.cos(3 * a) + 0.035 * Math.sin(2 * a + 0.4));
    return target.set(
      r * Math.cos(a),
      r * Math.sin(a) * 0.94,
      this.radius * 0.048 * Math.sin(3 * a),
    );
  }
}

function createGeometry(
  shapeType: ShapeType,
  majorRadius: number,
  tubeRadius: number,
  p: number,
  q: number,
): BufferGeometry {
  switch (shapeType) {
    case "knot":
      return new TorusKnotGeometry(
        majorRadius * 0.72,
        tubeRadius * 0.72,
        220,
        48,
        Math.max(1, Math.round(p)),
        Math.max(1, Math.round(q)),
      );
    case "blob":
      return new IcosahedronGeometry(majorRadius * 0.82, 4);
    case "organic":
      return new TubeGeometry(
        new OrganicRingCurve(majorRadius),
        200,
        tubeRadius,
        48,
        true,
      );
    default:
      return new TorusGeometry(majorRadius, tubeRadius, 96, 220);
  }
}

const STATE_FX: Record<
  VoiceState,
  { pulse: number; glow: number; noise: number; speed: number; warm: number; speech: boolean }
> = {
  idle: { pulse: 0.018, glow: 0.88, noise: 0.35, speed: 0.42, warm: 0, speech: false },
  listen: { pulse: 0.055, glow: 1.18, noise: 0.55, speed: 1, warm: -0.12, speech: false },
  think: { pulse: 0.032, glow: 1.05, noise: 1.45, speed: 0.62, warm: -0.04, speech: false },
  speak: { pulse: 0.1, glow: 1.38, noise: 0.85, speed: 1.35, warm: 0.22, speech: true },
};

function speechEnvelope(t: number) {
  return Math.abs(Math.sin(t * 7.4) * Math.sin(t * 3.15) * Math.sin(t * 1.27));
}

export default function SophiaShape() {
  const group = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);
  const shaderRef = useRef<WebGLProgramParametersWithUniforms | null>(null);

  const shapeType = useSophiaStore((s) => s.shapeType);
  const majorRadius = useSophiaStore((s) => s.majorRadius);
  const tubeRadius = useSophiaStore((s) => s.tubeRadius);
  const p = useSophiaStore((s) => s.p);
  const q = useSophiaStore((s) => s.q);

  const geometry = useMemo(() => {
    const g = createGeometry(shapeType, majorRadius, tubeRadius, p, q);
    g.computeVertexNormals();
    return g;
  }, [shapeType, majorRadius, tubeRadius, p, q]);

  const material = useMemo(() => {
    const mat = new MeshPhysicalMaterial({
      color: "#ffffff",
      metalness: 0.22,
      roughness: 0.18,
      iridescence: 1,
      iridescenceIOR: 1.28,
      iridescenceThicknessRange: [120, 540],
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      transmission: 0.12,
      thickness: 0.65,
      attenuationColor: new Color("#c4b5fd"),
      attenuationDistance: 2.4,
      emissive: new Color("#000000"),
      emissiveIntensity: 1,
      sheen: 0.35,
      sheenColor: new Color("#a855f7"),
      sheenRoughness: 0.4,
      envMapIntensity: 0.35,
      toneMapped: true,
    });
    mat.onBeforeCompile = (shader) => {
      applySophiaOnBeforeCompile(shader);
      shaderRef.current = shader;
    };
    mat.customProgramCacheKey = () => "sophia-presence-v2";
    return mat;
  }, []);

  const glowMaterial = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBend: { value: 0 },
        uBendAxis: { value: new Vector3(0, 0, 1) },
        uTaper: { value: 0 },
        uTaperAxis: { value: new Vector3(1, 0, 0) },
        uTwist: { value: 0 },
        uTwistAxis: { value: new Vector3(0, 1, 0) },
        uNoise: { value: 0.03 },
        uNoiseScale: { value: 1.6 },
        uRevolve: { value: 0 },
        uOrganic: { value: 0.1 },
        uPulse: { value: 0 },
        uSpeed: { value: 0.55 },
        uGlow: { value: 1.4 },
        uColorA: { value: new Color("#2E7BFF") },
        uColorB: { value: new Color("#9B4DFF") },
        uColorC: { value: new Color("#FF4DAD") },
        uColorD: { value: new Color("#FF5A3C") },
      },
      vertexShader: GLOW_VERTEX,
      fragmentShader: GLOW_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
  }, []);

  useEffect(() => {
    return () => {
      material.dispose();
      glowMaterial.dispose();
    };
  }, [material, glowMaterial]);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  useFrame(({ clock }) => {
    const s = useSophiaStore.getState();
    const fx = STATE_FX[s.voiceState];
    const audio = s.audioLevel;
    const t = clock.elapsedTime * s.speed * fx.speed;

    let bend = s.bend * DEG;
    if (s.animateBend) bend = Math.sin(t * 0.55) * Math.abs(s.bend) * DEG;

    let taper = s.taper;
    if (s.animateTaper) taper = Math.sin(t * 0.62) * s.taper;

    let twist = s.twist * DEG;
    if (s.animateTwist) twist = Math.sin(t * 0.48) * Math.abs(s.twist) * DEG;

    const revolve = s.revolve * t;

    let pulse = fx.pulse;
    if (s.float) pulse += Math.sin(t * 2.05) * 0.012;
    pulse += audio * 0.09;
    if (fx.speech) pulse += speechEnvelope(t) * 0.07;
    if (s.voiceState === "think") pulse += Math.sin(t * 5.5) * 0.01;

    let glow = s.glow * fx.glow;
    if (s.animateGlow) glow *= 0.84 + 0.16 * Math.sin(t * 2.05);
    glow *= 1 + audio * 0.7;
    if (fx.speech) glow *= 1 + speechEnvelope(t) * 0.25;

    const noiseAmp = s.noise * fx.noise * (s.animateNoise ? 0.7 + 0.3 * Math.sin(t * 0.9) : 1);

    const shader = shaderRef.current;
    const apply = (u: Record<string, { value: unknown }>) => {
      if (!u) return;
      if (u.uTime) u.uTime.value = clock.elapsedTime;
      if (u.uBend) u.uBend.value = bend;
      if (u.uTaper) u.uTaper.value = taper;
      if (u.uTwist) u.uTwist.value = twist;
      if (u.uNoise) u.uNoise.value = noiseAmp;
      if (u.uNoiseScale) u.uNoiseScale.value = s.noiseScale;
      if (u.uRevolve) u.uRevolve.value = revolve;
      if (u.uOrganic) u.uOrganic.value = s.organic;
      if (u.uPulse) u.uPulse.value = pulse;
      if (u.uSpeed) u.uSpeed.value = s.speed * fx.speed;
      if (u.uGlow) u.uGlow.value = glow;
      if (u.uColorSpeed) u.uColorSpeed.value = s.colorSpeed;
      if (u.uAnimateColors) u.uAnimateColors.value = s.animateColors ? 1 : 0;
      if (u.uFresnelBoost) u.uFresnelBoost.value = s.fresnelPower * 0.42;
      if (u.uAudio) u.uAudio.value = audio;
      const ax = AXIS_VEC[s.bendAxis];
      const at = AXIS_VEC[s.taperAxis];
      const aw = AXIS_VEC[s.twistAxis];
      (u.uBendAxis?.value as Vector3 | undefined)?.set(ax[0], ax[1], ax[2]);
      (u.uTaperAxis?.value as Vector3 | undefined)?.set(at[0], at[1], at[2]);
      (u.uTwistAxis?.value as Vector3 | undefined)?.set(aw[0], aw[1], aw[2]);
      (u.uColorA?.value as Color | undefined)?.set(s.colorA);
      (u.uColorB?.value as Color | undefined)?.set(s.colorB);
      (u.uColorC?.value as Color | undefined)?.set(s.colorC);
      (u.uColorD?.value as Color | undefined)?.set(s.colorD);
    };

    if (shader) apply(shader.uniforms as Record<string, { value: unknown }>);
    apply(glowMaterial.uniforms as Record<string, { value: unknown }>);

    material.metalness = s.metalness;
    material.roughness = s.roughness;
    material.clearcoat = s.clearcoat;
    material.transmission = s.transmission;
    material.iridescence = s.iridescence;
    material.sheenColor.set(s.colorB);

    if (group.current && !s.inspectMode) {
      let rx = 0.18;
      let ry = -0.12;
      let rz = -0.08;
      if (s.orbitX) rx += t * s.orbitSpeedX;
      if (s.orbitY) ry += t * s.orbitSpeedY;
      if (s.orbitZ) rz += t * s.orbitSpeedZ;
      if (s.seesaw) {
        const amp = s.seesawAmount * DEG;
        const wave = Math.sin(t);
        if (s.seesawAxis === "x") rx += wave * amp;
        if (s.seesawAxis === "y") ry += wave * amp;
        if (s.seesawAxis === "z") rz += wave * amp;
      }
      if (s.voiceState === "think") {
        rx += Math.sin(t * 0.35) * 0.18;
        rz += Math.cos(t * 0.28) * 0.12;
      }
      group.current.rotation.set(rx, ry, rz);
      group.current.position.y = s.float ? Math.sin(t * 0.75) * 0.055 : 0;
    }
  });

  return (
    <group ref={group} position={[0, 0.42, 0]} scale={[1, 0.96, 1]}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        onClick={(e) => {
          e.stopPropagation();
          useSophiaStore.getState().cycleVoiceState();
        }}
      />
      <mesh
        ref={glowRef}
        geometry={geometry}
        material={glowMaterial}
        scale={1.065}
        raycast={() => {}}
      />
    </group>
  );
}
