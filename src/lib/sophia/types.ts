export type Axis = "x" | "y" | "z";
export type ShapeType = "torus" | "organic" | "knot" | "blob";
export type PanelTab = "presence" | "shape" | "motion" | "look" | "presets";
export type RuntimeStatus = "online" | "degraded" | "offline";

export const VOICE_STATES = [
  "idle",
  "listening",
  "working",
  "speaking",
  "needs_you",
  "paused",
  "blocked",
  "completed",
] as const;

export type VoiceState = (typeof VOICE_STATES)[number] | "understanding" | "waiting";

export type SeesawMode = "dual" | "positive" | "negative";

export interface SophiaSettings {
  shapeType: ShapeType;
  majorRadius: number;
  tubeRadius: number;
  showTube: boolean;
  p: number;
  q: number;
  organic: number;
  asymmetry: number;
  aperture: number;
  breathing: number;
  knotness: number;
  attentionDot: boolean;
  warningAccent: boolean;

  pivotX: number;
  pivotY: number;
  pivotZ: number;

  bend: number;
  bendAxis: Axis;
  bendX: number;
  bendY: number;
  bendZ: number;
  animateBend: boolean;
  taper: number;
  taperAxis: Axis;
  animateTaper: boolean;
  stretch: number;
  stretchAxis: Axis;
  compress: number;
  twist: number;
  twistAxis: Axis;
  animateTwist: boolean;
  waveAmount: number;
  waveAxis: Axis;
  waveSpeed: number;
  animateWave: boolean;
  noise: number;
  noiseScale: number;
  animateNoise: boolean;
  revolve: number;

  orientX: number;
  orientY: number;
  orientZ: number;
  speed: number;
  orbitX: boolean;
  orbitY: boolean;
  orbitZ: boolean;
  orbitSpeedX: number;
  orbitSpeedY: number;
  orbitSpeedZ: number;
  orbitDirX: number;
  orbitDirY: number;
  orbitDirZ: number;
  seesaw: boolean;
  seesawAxis: Axis;
  seesawAmount: number;
  seesawAmountX: number;
  seesawAmountY: number;
  seesawAmountZ: number;
  seesawSpeed: number;
  seesawDir: number;
  seesawMode: SeesawMode;
  animPivotX: number;
  animPivotY: number;
  animPivotZ: number;
  float: boolean;
  stutter: number;

  colorA: string;
  colorB: string;
  colorC: string;
  colorD: string;
  colorE: string;
  colorF: string;
  glow: number;
  iridescence: number;
  fresnelPower: number;
  metalness: number;
  roughness: number;
  clearcoat: number;
  transmission: number;
  animateColors: boolean;
  animateGlow: boolean;
  colorSpeed: number;
  colorFlowDir: number;
  streakOn: boolean;
  segmentsOn?: boolean;
  streakSpeed: number;
  streakIntensity: number;
  highlightAmount: number;

  keyIntensity: number;
  keyColor: string;
  fillIntensity: number;
  fillColor: string;
  rimIntensity: number;
  rimColor: string;
  ambientIntensity: number;

  bloomIntensity: number;
  bloomThreshold: number;
  bloomSmoothing: number;

  particlesOn: boolean;
  particleAmount: number;
  particleSize: number;
  particleBrightness: number;
  particleSpeed: number;
  particleSpread: number;
  particleDrift: number;
  particleOpacity: number;

  ringsOn: boolean;
  ringCount: number;
  ringRadius: number;
  ringOpacity: number;
  ringSpeed: number;
  ringAxis: Axis;
  ringDirection: number;
  ringGlow: number;

  audioResponse: number;
  transitionDuration: number;
}

export interface SavedPreset {
  id: string;
  name: string;
  settings: SophiaSettings;
  builtin?: boolean;
  role?: "state" | "look";
  swatches?: [string, string, string];
  origin?: SophiaSettings;
}

export type StateAssignments = Record<VoiceState, string>;

export const AXIS_VEC: Record<Axis, [number, number, number]> = {
  x: [1, 0, 0],
  y: [0, 1, 0],
  z: [0, 0, 1],
};

export const DEG = Math.PI / 180;
