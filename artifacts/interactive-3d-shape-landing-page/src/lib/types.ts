export type Axis = "x" | "y" | "z";
export type ShapeType = "torus" | "organic" | "knot" | "blob";
export type VoiceState = "idle" | "listen" | "speak" | "think";
export type PanelTab = "presence" | "shape" | "motion" | "look" | "presets";

export interface SophiaSettings {
  shapeType: ShapeType;
  majorRadius: number;
  tubeRadius: number;
  p: number;
  q: number;
  organic: number;

  bend: number;
  bendAxis: Axis;
  animateBend: boolean;
  taper: number;
  taperAxis: Axis;
  animateTaper: boolean;
  twist: number;
  twistAxis: Axis;
  animateTwist: boolean;
  noise: number;
  noiseScale: number;
  animateNoise: boolean;
  revolve: number;

  speed: number;
  orbitX: boolean;
  orbitY: boolean;
  orbitZ: boolean;
  orbitSpeedX: number;
  orbitSpeedY: number;
  orbitSpeedZ: number;
  seesaw: boolean;
  seesawAxis: Axis;
  seesawAmount: number;
  float: boolean;

  colorA: string;
  colorB: string;
  colorC: string;
  colorD: string;
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
}

export interface SavedPreset {
  id: string;
  name: string;
  settings: SophiaSettings;
  builtin?: boolean;
  swatches?: [string, string, string];
}

export const AXIS_VEC: Record<Axis, [number, number, number]> = {
  x: [1, 0, 0],
  y: [0, 1, 0],
  z: [0, 0, 1],
};

export const DEG = Math.PI / 180;
