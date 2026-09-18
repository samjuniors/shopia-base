import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  Color,
  Curve,
  IcosahedronGeometry,
  MeshBasicMaterial,
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
import { applySophiaOnBeforeCompile, createSophiaUniforms, GLOW_FRAGMENT, GLOW_VERTEX } from "@/shaders/sophia";
import { useSophiaStore } from "@/store/sophiaStore";
import { AXIS_VEC, DEG, type ShapeType } from "@/lib/sophia/types";

class OrganicRingCurve extends Curve<Vector3> {
  radius: number;
  constructor(radius: number) {
    super();
    this.radius = radius;
  }
  getPoint(t: number, target = new Vector3()) {
    const a = t * Math.PI * 2;
    const r = this.radius * (1 + 0.1 * Math.cos(3 * a) + 0.035 * Math.sin(2 * a + 0.4));
    return target.set(r * Math.cos(a), r * Math.sin(a) * 0.94, this.radius * 0.048 * Math.sin(3 * a));
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
      return new TubeGeometry(new OrganicRingCurve(majorRadius), 200, tubeRadius, 48, true);
    default:
      return new TorusGeometry(majorRadius, tubeRadius, 96, 220);
  }
}

function speechEnvelope(t: number) {
  return Math.abs(Math.sin(t * 7.4) * Math.sin(t * 3.15) * Math.sin(t * 1.27));
}

const tempColA = new Color();
const tempColB = new Color();
const tempColC = new Color();
const tempColD = new Color();
const tempColE = new Color();
const tempColF = new Color();

function damp(cur: number, target: number, k: number) {
  return cur + (target - cur) * k;
}

export default function SophiaShape() {
  const group = useRef<Group>(null);
  const innerGroup = useRef<Group>(null);
  const attentionDotGroup = useRef<Group>(null);
  const attentionDotMesh = useRef<Mesh>(null);
  const attentionGlowMesh = useRef<Mesh>(null);
  const warningGroup = useRef<Group>(null);
  const warningMesh = useRef<Mesh>(null);
  const warningGlowMesh = useRef<Mesh>(null);
  const shaderRef = useRef<WebGLProgramParametersWithUniforms | null>(null);

  const shapeType = useSophiaStore((s) => s.shapeType);
  const p = useSophiaStore((s) => s.p);
  const q = useSophiaStore((s) => s.q);
  const showTube = useSophiaStore((s) => s.showTube ?? true);

  const animState = useRef({
    bendX: 0,
    bendY: 0,
    bendZ: 0,
    asymmetry: 0,
    aperture: 0,
    breathing: 0.035,
    knotness: 0,
    stretch: 1,
    compress: 0,
    twist: 0,
    taper: 0,
    waveAmount: 0,
    waveSpeed: 0.8,
    orientX: 0,
    orientY: 0,
    orientZ: 0,
    speed: 0.55,
    glow: 1.4,
    organic: 0.13,
    noise: 0.035,
    noiseScale: 1.6,
    pivotX: 0,
    pivotY: 0,
    pivotZ: 0,
    majorRadius: 0.6,
    tubeRadius: 0.17,
    stutter: 0,
    streakOn: 1,
    streakSpeed: 0.22,
    streakIntensity: 0.62,
    highlightAmount: 0.42,
    colorSpeed: 0.28,
    audioResponse: 0.85,
    colorA: new Color("#00E5FF"),
    colorB: new Color("#2E7BFF"),
    colorC: new Color("#8B5CF6"),
    colorD: new Color("#FF2BD6"),
    colorE: new Color("#FF7AB6"),
    colorF: new Color("#FFB020"),
    attentionDotOpacity: 0,
    warningOpacity: 0,
  });

  const geometry = useMemo(() => {
    const g = createGeometry(shapeType, 0.6, 0.17, p, q);
    g.computeVertexNormals();
    return g;
  }, [shapeType, p, q]);

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
    mat.customProgramCacheKey = () => "sophia-atlas-v1";
    return mat;
  }, []);

  const glowMaterial = useMemo(() => {
    return new ShaderMaterial({
      uniforms: createSophiaUniforms(),
      vertexShader: GLOW_VERTEX,
      fragmentShader: GLOW_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
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

  useFrame(({ clock }, delta) => {
    const s = useSophiaStore.getState();
    const audio = s.audioLevel;
    const a = animState.current;

    // Fluid continuous morphing between states and presets
    const transDuration = s.transitionDuration ?? 0.55;
    const k = Math.min(1, delta * (1 / (transDuration * 0.2)));

    const targetBendX = s.bendX ?? 0;
    const targetBendY = s.bendY ?? 0;
    const targetBendZ = s.bendZ ?? (s.bendAxis === "z" ? s.bend : 0);
    a.bendX += (targetBendX - a.bendX) * k;
    a.bendY += (targetBendY - a.bendY) * k;
    a.bendZ += (targetBendZ - a.bendZ) * k;

    a.asymmetry += ((s.asymmetry ?? 0) - a.asymmetry) * k;
    a.aperture += ((s.aperture ?? 0) - a.aperture) * k;
    a.breathing += ((s.breathing ?? 0.035) - a.breathing) * k;
    a.knotness += ((s.knotness ?? 0) - a.knotness) * k;
    a.stretch += ((s.stretch ?? 1) - a.stretch) * k;
    a.compress += ((s.compress ?? 0) - a.compress) * k;
    a.twist += ((s.twist ?? 0) - a.twist) * k;
    a.taper += ((s.taper ?? 0) - a.taper) * k;
    a.waveAmount += ((s.waveAmount ?? 0) - a.waveAmount) * k;
    a.waveSpeed += ((s.waveSpeed ?? 0.8) - a.waveSpeed) * k;
    a.orientX += ((s.orientX ?? 0) - a.orientX) * k;
    a.orientY += ((s.orientY ?? 0) - a.orientY) * k;
    a.orientZ += ((s.orientZ ?? 0) - a.orientZ) * k;
    a.speed += ((s.speed ?? 0.55) - a.speed) * k;
    a.glow += ((s.glow ?? 1.4) - a.glow) * k;
    a.organic += ((s.organic ?? 0.13) - a.organic) * k;
    a.noise += ((s.noise ?? 0.035) - a.noise) * k;
    a.noiseScale += ((s.noiseScale ?? 1.6) - a.noiseScale) * k;
    a.pivotX += ((s.pivotX ?? 0) - a.pivotX) * k;
    a.pivotY += ((s.pivotY ?? 0) - a.pivotY) * k;
    a.pivotZ += ((s.pivotZ ?? 0) - a.pivotZ) * k;
    a.majorRadius += ((s.majorRadius ?? 0.6) - a.majorRadius) * k;
    a.tubeRadius += ((s.tubeRadius ?? 0.17) - a.tubeRadius) * k;
    a.stutter += ((s.stutter ?? 0) - a.stutter) * k;
    a.streakOn += ((s.streakOn ?? 1) - a.streakOn) * k;
    a.streakSpeed += ((s.streakSpeed ?? 0.22) - a.streakSpeed) * k;
    a.streakIntensity += ((s.streakIntensity ?? 0.62) - a.streakIntensity) * k;
    a.highlightAmount += ((s.highlightAmount ?? 0.42) - a.highlightAmount) * k;
    a.colorSpeed += ((s.colorSpeed ?? 0.28) - a.colorSpeed) * k;
    a.audioResponse += ((s.audioResponse ?? 0.85) - a.audioResponse) * k;

    tempColA.set(s.colorA);
    tempColB.set(s.colorB);
    tempColC.set(s.colorC);
    tempColD.set(s.colorD);
    tempColE.set(s.colorE);
    tempColF.set(s.colorF);
    a.colorA.lerp(tempColA, k);
    a.colorB.lerp(tempColB, k);
    a.colorC.lerp(tempColC, k);
    a.colorD.lerp(tempColD, k);
    a.colorE.lerp(tempColE, k);
    a.colorF.lerp(tempColF, k);

    const targetDot = s.attentionDot ? 1 : 0;
    a.attentionDotOpacity += (targetDot - a.attentionDotOpacity) * k;
    const targetWarn = s.warningAccent ? 1 : 0;
    a.warningOpacity += (targetWarn - a.warningOpacity) * k;ty += (targetDot - a.attentionDotOpacity) * k;

    const t = clock.elapsedTime * a.speed;

    let bx = a.bendX * DEG;
    let by = a.bendY * DEG;
    let bz = a.bendZ * DEG;
    if (s.animateBend) {
      const wave = Math.sin(t * 0.55);
      bx = wave * Math.abs(a.bendX) * DEG;
      by = wave * Math.abs(a.bendY) * DEG;
      bz = wave * Math.abs(a.bendZ) * DEG;
    }

    let taper = a.taper;
    if (s.animateTaper) taper = Math.sin(t * 0.62) * a.taper;

    let twist = a.twist * DEG;
    if (s.animateTwist) twist = Math.sin(t * 0.48) * Math.abs(a.twist) * DEG;

    const revolve = s.revolve * t;
    const waveSpeed = s.animateWave ? a.waveSpeed : 0;

    let pulse = 0.016;
    if (s.float) pulse += Math.sin(t * 2.05) * 0.012;
    if (s.voiceState === "listening") pulse += audio * 0.09;
    if (s.voiceState === "speaking") pulse += speechEnvelope(t) * 0.07;

    let glow = a.glow;
    if (s.animateGlow) glow *= 0.84 + 0.16 * Math.sin(t * 2.05);
    glow *= 1 + audio * 0.55;
    if (s.voiceState === "speaking") glow *= 1 + speechEnvelope(t) * 0.22;

    const noiseAmp = s.noise * (s.animateNoise ? 0.7 + 0.3 * Math.sin(t * 0.9) : 1);

    const apply = (u: Record<string, { value: unknown }>) => {
      if (!u) return;
      if (u.uTime) u.uTime.value = clock.elapsedTime;
      if (u.uBend) (u.uBend.value as Vector3 | undefined)?.set(bx, by, bz);
      if (u.uTaper) u.uTaper.value = taper;
      if (u.uTwist) u.uTwist.value = twist;
      if (u.uNoise) u.uNoise.value = noiseAmp;
      if (u.uNoiseScale) u.uNoiseScale.value = s.noiseScale;
      if (u.uRevolve) u.uRevolve.value = revolve;
      if (u.uOrganic) u.uOrganic.value = s.organic;
      if (u.uPulse) u.uPulse.value = pulse;
      if (u.uSpeed) u.uSpeed.value = a.speed;
      if (u.uGlow) u.uGlow.value = glow;
      if (u.uColorSpeed) u.uColorSpeed.value = s.colorSpeed;
      if (u.uAnimateColors) u.uAnimateColors.value = s.animateColors ? 1 : 0;
      if (u.uFresnelBoost) u.uFresnelBoost.value = s.fresnelPower * 0.42;
      if (u.uAudio) u.uAudio.value = audio;
      if (u.uStretch) u.uStretch.value = a.stretch;
      if (u.uCompress) u.uCompress.value = a.compress;
      if (u.uWave) u.uWave.value = a.waveAmount;
      if (u.uWaveSpeed) u.uWaveSpeed.value = waveSpeed;
      if (u.uAsymmetry) u.uAsymmetry.value = a.asymmetry;
      if (u.uAperture) u.uAperture.value = a.aperture;
      if (u.uBreathing) u.uBreathing.value = a.breathing;
      if (u.uStreakOn) u.uStreakOn.value = s.streakOn ? 1 : 0;
      if (u.uStreakSpeed) u.uStreakSpeed.value = s.streakSpeed;
      if (u.uStreakIntensity) u.uStreakIntensity.value = s.streakIntensity;
      if (u.uHighlight) u.uHighlight.value = s.highlightAmount;
      if (u.uFlowDir) u.uFlowDir.value = s.colorFlowDir;
      const at = AXIS_VEC[s.taperAxis];
      const aw = AXIS_VEC[s.twistAxis];
      const ast = AXIS_VEC[s.stretchAxis];
      const awv = AXIS_VEC[s.waveAxis];
      (u.uTaperAxis?.value as Vector3 | undefined)?.set(at[0], at[1], at[2]);
      (u.uTwistAxis?.value as Vector3 | undefined)?.set(aw[0], aw[1], aw[2]);
      (u.uStretchAxis?.value as Vector3 | undefined)?.set(ast[0], ast[1], ast[2]);
      (u.uWaveAxis?.value as Vector3 | undefined)?.set(awv[0], awv[1], awv[2]);
      (u.uPivot?.value as Vector3 | undefined)?.set(s.pivotX, s.pivotY, s.pivotZ);
      (u.uColorA?.value as Color | undefined)?.copy(a.colorA);
      (u.uColorB?.value as Color | undefined)?.copy(a.colorB);
      (u.uColorC?.value as Color | undefined)?.copy(a.colorC);
      (u.uColorD?.value as Color | undefined)?.copy(a.colorD);
    };

    const shader = shaderRef.current;
    if (shader) apply(shader.uniforms as Record<string, { value: unknown }>);
    apply(glowMaterial.uniforms as Record<string, { value: unknown }>);

    material.metalness = s.metalness;
    material.roughness = s.roughness;
    material.clearcoat = s.clearcoat;
    material.transmission = s.transmission;
    material.iridescence = s.iridescence;
    material.sheenColor.copy(a.colorB);

    const animPx = s.animPivotX ?? 0;
    const animPy = s.animPivotY ?? 0;
    const animPz = s.animPivotZ ?? 0;

    if (innerGroup.current) {
      innerGroup.current.position.set(-animPx, -animPy, -animPz);
    }

    if (group.current && !s.inspectMode) {
      let rx = a.orientX * DEG;
      let ry = a.orientY * DEG;
      let rz = a.orientZ * DEG;

      let ampX = (s.seesawAmountX ?? 0) * DEG;
      let ampY = (s.seesawAmountY ?? 0) * DEG;
      let ampZ = (s.seesawAmountZ ?? 0) * DEG;

      if (ampX === 0 && ampY === 0 && ampZ === 0 && s.seesawAmount) {
        if (s.seesawAxis === "x") ampX = s.seesawAmount * DEG;
        else if (s.seesawAxis === "y") ampY = s.seesawAmount * DEG;
        else if (s.seesawAxis === "z") ampZ = s.seesawAmount * DEG;
      }

      const hasOscX = s.seesaw && Math.abs(ampX) > 0.0001;
      const hasOscY = s.seesaw && Math.abs(ampY) > 0.0001;
      const hasOscZ = s.seesaw && Math.abs(ampZ) > 0.0001;

      if (s.orbitX && !hasOscX) rx += t * s.orbitSpeedX * s.orbitDirX;
      if (s.orbitY && !hasOscY) ry += t * s.orbitSpeedY * s.orbitDirY;
      if (s.orbitZ && !hasOscZ) rz += t * s.orbitSpeedZ * s.orbitDirZ;

      if (s.seesaw) {
        const oscFreq = Math.max(0.05, s.seesawSpeed ?? 1.0) * 3.6;
        const oscPhase = clock.elapsedTime * oscFreq * (s.seesawDir ?? 1);
        const mode = s.seesawMode ?? "dual";

        const calcWave = (shift: number) => {
          const s = Math.sin(oscPhase + shift);
          if (mode === "positive") return (s + 1) * 0.5;
          if (mode === "negative") return -(s + 1) * 0.5;
          return s;
        };

        rx += calcWave(0) * ampX;
        ry += calcWave(Math.PI * 0.33) * ampY;
        rz += calcWave(Math.PI * 0.66) * ampZ;
      }
      group.current.rotation.set(rx, ry, rz);
      const floatY = s.float ? Math.sin(t * 0.75) * 0.055 : 0;
      group.current.position.set(animPx, animPy + floatY, animPz);
    } else if (group.current && s.inspectMode) {
      group.current.rotation.set(a.orientX * DEG, a.orientY * DEG, a.orientZ * DEG);
      group.current.position.set(animPx, animPy, animPz);
    }

    if (attentionDotGroup.current) {
      const showDot = a.attentionDotOpacity > 0.01;
      attentionDotGroup.current.visible = showDot;
      if (showDot) {
        const floatDot = Math.sin(t * 1.8) * 0.025;
        attentionDotGroup.current.position.set(majorRadius * 1.34, floatDot, 0.05);
        if (attentionDotMesh.current) {
          (attentionDotMesh.current.material as MeshBasicMaterial).color.copy(a.colorC);
          (attentionDotMesh.current.material as MeshBasicMaterial).opacity = a.attentionDotOpacity;
        }
        if (attentionGlowMesh.current) {
          (attentionGlowMesh.current.material as MeshBasicMaterial).color.copy(a.colorD);
          (attentionGlowMesh.current.material as MeshBasicMaterial).opacity = 0.5 * a.attentionDotOpacity;
        }
        if (warningMesh.current) {
          (warningMesh.current.material as MeshBasicMaterial).color.copy(a.colorF);
          (warningMesh.current.material as MeshBasicMaterial).opacity = a.warningOpacity;
        }
        if (warningGlowMesh.current) {
          (warningGlowMesh.current.material as MeshBasicMaterial).color.copy(a.colorF);
          (warningGlowMesh.current.material as MeshBasicMaterial).opacity = 0.4 * a.warningOpacity;
        }
      }
    }
  });

  return (
    <group ref={group} scale={[1, 0.96, 1]}>
      {/* Invisible hit volume to reliably catch clicks on Sophia, including donut hole */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          useSophiaStore.getState().interact();
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[2.5, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <group ref={innerGroup} visible={showTube}>
        <mesh
          geometry={geometry}
          material={material}
          onClick={(e) => {
            e.stopPropagation();
            useSophiaStore.getState().interact();
          }}
          onPointerOver={() => {
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "";
          }}
        />
        <mesh geometry={geometry} material={glowMaterial} scale={1.065} raycast={() => {}} />

        {/* Satellite Attention Point (State 05: Needs You) */}
        <group ref={attentionDotGroup} visible={false}>
          <mesh ref={attentionDotMesh}>
            <sphereGeometry args={[0.085, 24, 24]} />
            <meshBasicMaterial transparent opacity={1} toneMapped={false} />
          </mesh>
          <mesh ref={attentionGlowMesh} scale={3.2}>
            <sphereGeometry args={[0.085, 16, 16]} />
            <meshBasicMaterial
              transparent
              opacity={0.45}
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
        <group ref={warningGroup} visible={false}>
          <mesh ref={warningMesh}>
            <torusGeometry args={[0.2, 0.02, 16, 64]} />
            <meshBasicMaterial transparent opacity={1} toneMapped={false} />
          </mesh>
          <mesh ref={warningGlowMesh} scale={1.4}>
            <torusGeometry args={[0.2, 0.02, 16, 64]} />
            <meshBasicMaterial
              transparent
              opacity={0.4}
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}
