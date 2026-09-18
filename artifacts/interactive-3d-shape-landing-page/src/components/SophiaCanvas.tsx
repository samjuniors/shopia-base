import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Sparkles } from "@react-three/drei";
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  CanvasTexture,
  ACESFilmicToneMapping,
  PMREMGenerator,
  SRGBColorSpace,
  type Sprite,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import SophiaShape from "./SophiaShape";
import { useSophiaStore } from "../store/sophiaStore";

function makeHaloTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(128, 128, 8, 128, 128, 128);
  grd.addColorStop(0, "rgba(140, 110, 255, 0.95)");
  grd.addColorStop(0.25, "rgba(70, 120, 255, 0.38)");
  grd.addColorStop(0.55, "rgba(90, 40, 180, 0.1)");
  grd.addColorStop(1, "rgba(0, 0, 0, 0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

function HaloSprite() {
  const tex = useMemo(() => makeHaloTexture(), []);
  const sprite = useRef<Sprite>(null);
  useFrame(() => {
    const mat = sprite.current?.material;
    if (!mat) return;
    const s = useSophiaStore.getState();
    mat.color.set(s.colorB);
    mat.opacity = 0.34 + s.glow * 0.08;
  });
  return (
    <sprite ref={sprite} position={[0, 0.42, -0.45]} scale={[5.6, 5.6, 1]}>
      <spriteMaterial
        map={tex}
        color="#8b6cff"
        blending={AdditiveBlending}
        depthWrite={false}
        transparent
        opacity={0.4}
        toneMapped={false}
      />
    </sprite>
  );
}

function StudioEnvironment() {
  const { gl, scene } = useThree();
  useLayoutEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const env = new RoomEnvironment();
    const envMap = pmrem.fromScene(env, 0.04).texture;
    scene.environment = envMap;
    scene.environmentIntensity = 0.2;
    env.dispose();
    return () => {
      scene.environment = null;
      envMap.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

function StudioLights() {
  const keyIntensity = useSophiaStore((s) => s.keyIntensity);
  const keyColor = useSophiaStore((s) => s.keyColor);
  const fillIntensity = useSophiaStore((s) => s.fillIntensity);
  const fillColor = useSophiaStore((s) => s.fillColor);
  const rimIntensity = useSophiaStore((s) => s.rimIntensity);
  const rimColor = useSophiaStore((s) => s.rimColor);
  const ambientIntensity = useSophiaStore((s) => s.ambientIntensity);
  const colorB = useSophiaStore((s) => s.colorB);
  const glow = useSophiaStore((s) => s.glow);

  return (
    <>
      <ambientLight color="#1a1440" intensity={ambientIntensity} />
      {/* Key — cool, front-left-top */}
      <directionalLight position={[-4.6, 3.4, 4.8]} color={keyColor} intensity={keyIntensity} />
      {/* Fill — magenta, front-right */}
      <directionalLight position={[5.2, 0.6, 3.1]} color={fillColor} intensity={fillIntensity} />
      {/* Rim — warm, back-right (classic 3-point kick) */}
      <spotLight
        position={[3.6, 2.6, -5.2]}
        color={rimColor}
        intensity={rimIntensity}
        angle={0.85}
        penumbra={1}
        distance={22}
      />
      {/* Hair / top rim */}
      <directionalLight position={[-0.4, 6.2, -2.2]} color="#c4b5fd" intensity={0.85} />
      {/* Bounce from below */}
      <pointLight position={[0, -3.6, 2.1]} color="#6366f1" intensity={0.55} distance={14} />
      {/* Inner presence light */}
      <pointLight position={[0, 0.4, 0.2]} color={colorB} intensity={0.9 + glow * 0.35} distance={7} />
    </>
  );
}

function CameraRig() {
  const inspectMode = useSophiaStore((s) => s.inspectMode);
  const { camera, pointer } = useThree();
  useFrame(() => {
    if (inspectMode) return;
    camera.position.x += (pointer.x * 0.28 - camera.position.x) * 0.035;
    camera.position.y += (pointer.y * 0.16 - camera.position.y) * 0.035;
    camera.position.z += (6.35 - camera.position.z) * 0.035;
    camera.lookAt(0, 0.18, 0);
  });
  return null;
}

function Post() {
  const bloomIntensity = useSophiaStore((s) => s.bloomIntensity);
  const bloomThreshold = useSophiaStore((s) => s.bloomThreshold);
  const bloomSmoothing = useSophiaStore((s) => s.bloomSmoothing);
  return (
    <EffectComposer enableNormalPass={false} multisampling={0}>
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={bloomSmoothing}
        mipmapBlur
        radius={0.82}
      />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={[0.00035, 0.00035]}
        radialModulation={false}
        modulationOffset={0}
      />
      <Vignette eskil={false} offset={0.22} darkness={0.62} />
    </EffectComposer>
  );
}

function FxParticles() {
  const voiceState = useSophiaStore((s) => s.voiceState);
  if (voiceState === "idle") return null;
  const color =
    voiceState === "listen" ? "#60a5fa" : voiceState === "speak" ? "#f472b6" : "#c4b5fd";
  return (
    <Sparkles
      count={voiceState === "think" ? 70 : 42}
      scale={3.8}
      size={voiceState === "speak" ? 3 : 2}
      speed={voiceState === "speak" ? 0.7 : 0.35}
      color={color}
      opacity={0.42}
      position={[0, 0.42, 0]}
    />
  );
}

export default function SophiaCanvas() {
  const inspectMode = useSophiaStore((s) => s.inspectMode);

  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.setClearColor("#050510");
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.08;
      }}
    >
      <PerspectiveCamera makeDefault fov={30} position={[0, 0, 6.35]} near={0.1} far={60} />
      <CameraRig />
      <StudioLights />
      <StudioEnvironment />
      <HaloSprite />
      <SophiaShape />
      <FxParticles />
      <Post />
      <OrbitControls
        enabled={inspectMode}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={3.2}
        maxDistance={12}
        target={[0, 0.18, 0]}
      />
    </Canvas>
  );
}
