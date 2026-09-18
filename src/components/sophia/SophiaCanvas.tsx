import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
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
import AmbientParticles from "./AmbientParticles";
import LightRings from "./LightRings";
import { useSophiaStore } from "@/store/sophiaStore";
import { deepgramVoice } from "@/lib/sophia/useDeepgramAgent";

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
    mat.opacity = 0.3 + s.glow * 0.07;
  });
  return (
    <sprite ref={sprite} position={[0, 0.08, -0.45]} scale={[5.4, 5.4, 1]}>
      <spriteMaterial
        map={tex}
        color="#8b6cff"
        blending={AdditiveBlending}
        depthWrite={false}
        transparent
        opacity={0.36}
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
      <directionalLight position={[-4.6, 3.4, 4.8]} color={keyColor} intensity={keyIntensity} />
      <directionalLight position={[5.2, 0.6, 3.1]} color={fillColor} intensity={fillIntensity} />
      <spotLight
        position={[3.6, 2.6, -5.2]}
        color={rimColor}
        intensity={rimIntensity}
        angle={0.85}
        penumbra={1}
        distance={22}
      />
      <directionalLight position={[-0.4, 6.2, -2.2]} color="#c4b5fd" intensity={0.85} />
      <pointLight position={[0, -3.6, 2.1]} color="#6366f1" intensity={0.55} distance={14} />
      <pointLight position={[0, 0.4, 0.2]} color={colorB} intensity={0.9 + glow * 0.35} distance={7} />
    </>
  );
}

function useStage() {
  const { size } = useThree();
  const compact = size.width < 640 || size.height < 740;
  return {
    y: compact ? 0.55 : 0.38,
    scale: compact ? 0.76 : size.height < 820 ? 0.9 : 1,
    z: compact ? 7.4 : 6.55,
  };
}

function CameraRig() {
  const inspectMode = useSophiaStore((s) => s.inspectMode);
  const { camera, pointer } = useThree();
  const stage = useStage();
  useFrame(() => {
    if (inspectMode) return;
    camera.position.x += (pointer.x * 0.28 - camera.position.x) * 0.035;
    camera.position.y += (pointer.y * 0.12 + 0.06 - camera.position.y) * 0.035;
    camera.position.z += (stage.z - camera.position.z) * 0.035;
    camera.lookAt(0, stage.y, 0);
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

function Stage() {
  const stage = useStage();
  return (
    <group position={[0, stage.y, 0]} scale={stage.scale}>
      <HaloSprite />
      <SophiaShape />
      <AmbientParticles />
      <LightRings />
    </group>
  );
}

export default function SophiaCanvas() {
  const inspectMode = useSophiaStore((s) => s.inspectMode);
  const pointerStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current || e.button !== 0) return;
    const { x, y, time } = pointerStartRef.current;
    pointerStartRef.current = null;
    const dx = e.clientX - x;
    const dy = e.clientY - y;
    const dt = Date.now() - time;
    // If pointer moved less than 8px and click was under 450ms, treat as clean click
    if (Math.hypot(dx, dy) < 8 && dt < 450) {
      void deepgramVoice.toggle();
    }
  };

  return (
    <div
      className="relative h-full w-full select-none cursor-pointer"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <Canvas
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
        style={{ touchAction: "none" }}
      onCreated={({ gl }) => {
        gl.setClearColor("#050510");
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.08;
        useSophiaStore.getState().patch({ runtimeStatus: "online" });
        (window as Window & { __sophiaReady?: boolean }).__sophiaReady = true;
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          useSophiaStore.getState().patch({ runtimeStatus: "offline" });
        });
        gl.domElement.addEventListener("webglcontextrestored", () => {
          useSophiaStore.getState().patch({ runtimeStatus: "online" });
        });
      }}
    >
      <PerspectiveCamera makeDefault fov={30} position={[0, 0.12, 6.55]} near={0.1} far={60} />
      <CameraRig />
      <StudioLights />
      <StudioEnvironment />
      <Stage />
      <Post />
      <OrbitControls
        enabled={inspectMode}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={3.2}
        maxDistance={12}
        target={[0, 0.38, 0]}
      />
    </Canvas>
    </div>
  );
}
