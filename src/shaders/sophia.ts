import type { WebGLProgramParametersWithUniforms } from "three";
import { Color, Vector3 } from "three";

const DISPLACE = `
uniform float uTime;
uniform vec3 uBend;
uniform float uTaper;
uniform vec3 uTaperAxis;
uniform float uTwist;
uniform vec3 uTwistAxis;
uniform float uNoise;
uniform float uNoiseScale;
uniform float uRevolve;
uniform float uOrganic;
uniform float uPulse;
uniform float uSpeed;
uniform vec3 uPivot;
uniform float uStretch;
uniform vec3 uStretchAxis;
uniform float uCompress;
uniform float uWave;
uniform vec3 uWaveAxis;
uniform float uWaveSpeed;
uniform float uAsymmetry;
uniform float uAperture;
uniform float uBreathing;
uniform float uKnot;
uniform float uStutter;
uniform float uMajorRadius;
uniform float uTubeRadius;
uniform float uWarning;
uniform float uAudio;

varying vec3 vSophiaPos;

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

float vnoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x),
        mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x),
        mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y), f.z);
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = p * 2.03 + 17.1;
    a *= 0.5;
  }
  return v;
}

vec3 rotateAxis(vec3 p, vec3 axis, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  vec3 a = normalize(axis);
  return p * c + cross(a, p) * s + a * dot(a, p) * (1.0 - c);
}

vec3 applyBend(vec3 p, vec3 axis, float amount) {
  if (abs(amount) < 0.00015) return p;
  vec3 a = normalize(axis);
  vec3 tmp = abs(a.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 side = normalize(cross(a, tmp));
  vec3 up = cross(side, a);
  float x = dot(p, a);
  float y = dot(p, side);
  float z = dot(p, up);
  float k = amount / 2.35;
  if (abs(k) < 0.00015) return p;
  float radius = 1.0 / k;
  float theta = x * k;
  float nx = sin(theta) * (radius + y);
  float ny = (radius + y) * cos(theta) - radius;
  return a * nx + side * ny + up * z;
}

vec3 applyTaper(vec3 p, vec3 axis, float amount) {
  if (abs(amount) < 0.00015) return p;
  vec3 a = normalize(axis);
  float h = dot(p, a);
  vec3 along = a * h;
  vec3 across = p - along;
  float s = max(1.0 + amount * h * 0.5, 0.06);
  return along + across * s;
}

vec3 applyTwist(vec3 p, vec3 axis, float amount) {
  if (abs(amount) < 0.00015) return p;
  vec3 a = normalize(axis);
  return rotateAxis(p, a, amount * dot(p, a));
}

vec3 applyStretch(vec3 p, vec3 axis, float stretch, float compress) {
  vec3 a = normalize(axis);
  float h = dot(p, a);
  vec3 along = a * h * stretch;
  vec3 across = (p - a * h) * (1.0 - compress);
  return along + across;
}

vec3 applyWave(vec3 p, vec3 axis, float amount, float speed) {
  if (abs(amount) < 0.00015) return p;
  vec3 a = normalize(axis);
  vec3 tmp = abs(a.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 side = normalize(cross(a, tmp));
  float w = sin(dot(p, a) * 2.35 + uTime * uSpeed * speed) * amount;
  return p + side * w;
}

vec3 applyRadius(vec3 p) {
  float R0 = 0.6;
  float r0 = 0.17;
  float radial = length(p.xy);
  if (radial < 1e-5) {
    p.z *= uTubeRadius / r0;
    return p;
  }
  vec2 dir = p.xy / radial;
  float tubeX = radial - R0;
  float tubeScale = uTubeRadius / r0;
  p.xy = dir * (uMajorRadius + tubeX * tubeScale);
  p.z *= tubeScale;
  return p;
}

vec3 applyKnot(vec3 p, float amount) {
  if (amount < 0.0001) return p;
  float k = clamp(amount, 0.0, 1.0);
  float theta = atan(p.y, p.x);
  float radial = length(p.xy);
  vec2 dir = radial > 1e-5 ? p.xy / radial : vec2(1.0, 0.0);
  float tubeX = radial - 0.6;
  vec3 tube = vec3(dir * tubeX, p.z);

  float s = sin(theta);
  float c = cos(theta);
  vec3 eight = vec3(s * 0.64, s * c * 0.50, sin(2.0 * theta) * 0.16);
  vec3 tre = vec3(
    (sin(theta) + 1.25 * sin(2.0 * theta)) * 0.28,
    (cos(theta) - 1.25 * cos(2.0 * theta)) * 0.28,
    -sin(3.0 * theta) * 0.22
  );
  vec3 center = mix(eight, tre, smoothstep(0.22, 0.92, k));
  vec3 knotted = center + tube * mix(1.0, 0.82, k);
  return mix(p, knotted, k);
}

vec3 sophiaDisplace(vec3 p) {
  p -= uPivot;
  p = applyRadius(p);

  float theta = atan(p.y, p.x);
  float org = 1.0 + uOrganic * (
    0.58 * cos(3.0 * theta + uTime * uSpeed * 0.18) +
    0.22 * sin(2.0 * theta + 0.4)
  );
  p.xy *= org;
  p.z += uOrganic * 0.12 * sin(3.0 * theta + uTime * uSpeed * 0.12);

  p = applyKnot(p, uKnot);
  theta = atan(p.y, p.x);

  if (abs(uAsymmetry) > 0.0001) {
    p.x += cos(theta) * abs(cos(theta)) * uAsymmetry * 0.55;
    p.y += sin(theta) * uAsymmetry * 0.32;
    p.z += cos(theta) * uAsymmetry * 0.35;
  }

  if (abs(uAperture) > 0.0001) {
    if (uAperture > 0.0) {
      // Gentle receptive opening for listening state
      float open = clamp(uAperture, 0.0, 1.0);
      float collapse = smoothstep(-0.25, 1.0, -cos(theta));
      float s = mix(1.0, 0.55, collapse * open * 0.7);
      p.xy *= s;
      p.x += open * 0.16 * (1.0 - collapse * 0.3);
      p.z += collapse * open * 0.04;
    } else {
      float pinch = pow(abs(cos(theta)), 1.2);
      p.xy *= 1.0 + uAperture * pinch * 0.6;
      p.z *= 1.0 - (-uAperture) * 0.12 * pinch;
    }
  }

  // Localized pinch for Blocked state (rest of the ring stays calm)
  if (uWarning > 0.001) {
    float pinchZone = exp(-4.5 * (1.0 - cos(theta)));
    float pinchMag = pinchZone * clamp(uWarning, 0.0, 1.0) * 0.32;
    p.xy *= 1.0 - pinchMag * 0.55;
    p.z *= 1.0 - pinchMag * 0.45;
  }

  // Fluid small ripples for Speaking state modulated by real audio
  if (uAudio > 0.005 || (uWave > 0.01 && uSpeed > 0.6)) {
    float rippleFreq = 5.0;
    float ripple = sin(theta * rippleFreq + uTime * uWaveSpeed * 2.4) * sin(theta * 2.5 - uTime * 1.2);
    float rippleAmp = (uWave * 0.025 + uAudio * 0.045);
    p += normalize(p + 0.0001) * ripple * rippleAmp;
  }

  if (abs(uBreathing) > 0.0001) {
    float breath = sin(uTime * uSpeed * 1.7) * uBreathing;
    p.xy *= (1.0 + breath);
  }

  float hitch = 0.0;
  if (uStutter > 0.0001) {
    hitch = uStutter * step(0.72, fract(sin(floor(uTime * 3.15) * 12.9898) * 43758.5453));
  }

  p = applyStretch(p, uStretchAxis, uStretch, uCompress);
  p = applyTaper(p, uTaperAxis, uTaper);
  p = applyTwist(p, uTwistAxis, uTwist * (1.0 - hitch * 0.55));
  p = applyWave(p, uWaveAxis, uWave * (1.0 - hitch * 0.92), uWaveSpeed);
  if (abs(uBend.x) > 0.00015) p = applyBend(p, vec3(1.0, 0.0, 0.0), uBend.x);
  if (abs(uBend.y) > 0.00015) p = applyBend(p, vec3(0.0, 1.0, 0.0), uBend.y);
  if (abs(uBend.z) > 0.00015) p = applyBend(p, vec3(0.0, 0.0, 1.0), uBend.z);

  if (abs(uRevolve) > 0.0001) {
    p = rotateAxis(p, vec3(0.0, 1.0, 0.0), uRevolve * (1.0 - hitch * 0.7));
  }

  float n = fbm(p * uNoiseScale + vec3(uTime * uSpeed * 0.22, uTime * uSpeed * 0.13, 1.7));
  p += normalize(p + 0.0001) * (n - 0.42) * uNoise * (1.0 - hitch * 0.4);

  p += uPivot;
  p *= 1.0 + uPulse;
  return p;
}
`;

const BEGIN_NORMAL = `
vec3 displaced = sophiaDisplace(position);
vec3 displacedN = sophiaDisplace(position + normal * 0.018);
vec3 objectNormal = normalize(displacedN - displaced);
#ifdef USE_TANGENT
  vec3 displacedT = sophiaDisplace(position + tangent.xyz * 0.018);
  vec3 objectTangent = normalize(displacedT - displaced);
#endif
`;

const BEGIN_VERTEX = `
vec3 transformed = sophiaDisplace(position);
vSophiaPos = transformed;
`;

const FRAGMENT_HEAD = `
uniform float uTime;
uniform float uGlow;
uniform float uColorSpeed;
uniform float uAnimateColors;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform vec3 uColorD;
uniform vec3 uColorE;
uniform vec3 uColorF;
uniform float uFresnelBoost;
uniform float uAudio;
uniform float uStreakOn;
uniform float uStreakSpeed;
uniform float uStreakIntensity;
uniform float uHighlight;
uniform float uFlowDir;
uniform float uWarning;
uniform float uSegmentsOn;
varying vec3 vSophiaPos;

vec3 atlasRamp(float g) {
  g = fract(g);
  vec3 grad = mix(uColorA, uColorB, smoothstep(0.00, 0.16, g));
  grad = mix(grad, uColorC, smoothstep(0.14, 0.32, g));
  grad = mix(grad, uColorD, smoothstep(0.30, 0.48, g));
  grad = mix(grad, uColorE, smoothstep(0.46, 0.64, g));
  grad = mix(grad, uColorF, smoothstep(0.62, 0.82, g));
  grad = mix(grad, uColorA, smoothstep(0.78, 1.00, g));
  return grad;
}

vec3 sophiaGradient(vec3 pos) {
  float theta = atan(pos.y, pos.x);
  float flow = theta * 0.15915494309;
  float ph = uTime * uColorSpeed * uFlowDir;
  float g = fract(flow + ph * 0.18 + 0.5);
  vec3 grad = atlasRamp(g);
  if (uAnimateColors < 0.5) {
    float gx = clamp(pos.x * 0.46 + 0.5, 0.0, 1.0);
    grad = atlasRamp(gx);
  }

  // Working state: 2-3 luminous traveling segments chasing around the ring with trailing multicolor fades
  if (uSegmentsOn > 0.001) {
    float segSpeed = max(0.4, uStreakSpeed) * 1.85;
    float segPhase = flow * 3.0 + uTime * segSpeed * uFlowDir;
    float segFrac = fract(segPhase);
    float head = smoothstep(0.72, 0.98, segFrac);
    float trail = pow(segFrac, 3.4) * smoothstep(0.05, 0.35, segFrac);
    float segInt = (head * 1.9 + trail * 1.15) * uStreakIntensity * uSegmentsOn;
    vec3 headColor = atlasRamp(g + 0.22) * 2.2;
    vec3 trailColor = atlasRamp(g - 0.14) * 1.45;
    vec3 segColor = mix(trailColor, headColor, head);
    grad = mix(grad, segColor, clamp(segInt * 0.78, 0.0, 1.0));
    grad += segColor * (segInt * uHighlight * 1.1);
  }

  float streakAmt = clamp(uStreakOn, 0.0, 1.0);
  if (streakAmt > 0.001 && uSegmentsOn < 0.5) {
    float angle = (flow + uTime * uStreakSpeed * uFlowDir * 0.22) * 6.28318530718;
    float s1 = pow(smoothstep(0.32, 0.98, cos(angle)), 2.35);
    float s2 = pow(smoothstep(0.48, 0.98, cos(angle * 1.65 + 1.15)), 3.1);
    vec3 c1 = atlasRamp(g + 0.18);
    vec3 c2 = atlasRamp(g + 0.42);
    grad = mix(grad, c1 * 1.55, clamp(s1 * uStreakIntensity * streakAmt, 0.0, 1.0));
    grad = mix(grad, c2 * 1.38, clamp(s2 * uStreakIntensity * 0.72 * streakAmt, 0.0, 1.0));
    grad += c1 * (s1 * uHighlight * 0.9 * streakAmt);
    grad += c2 * (s2 * uHighlight * 0.45 * streakAmt);
  }

  // Listening state: brighter, thicker light gathering on receptive side
  float receptiveSide = max(0.0, cos(theta + 0.25));
  if (receptiveSide > 0.01) {
    float gather = pow(receptiveSide, 2.2);
    vec3 gatherColor = atlasRamp(g + 0.12) * 1.35;
    grad = mix(grad, gatherColor, gather * 0.35);
    grad += gatherColor * (gather * 0.28 * (1.0 + uAudio * 1.2));
  }

  // Blocked state: localized amber/red color bleed and bloom at the pinch point
  if (uWarning > 0.001) {
    float pinchZone = exp(-4.2 * (1.0 - cos(theta)));
    vec3 warn = mix(vec3(1.0, 0.55, 0.06), vec3(1.0, 0.16, 0.10), 0.58);
    grad = mix(grad, warn * 1.85, pinchZone * uWarning * 0.95);
    grad += warn * (pinchZone * uWarning * 1.5);
  }
  return grad;
}
`;

const COLOR_FRAG = `
#include <color_fragment>
diffuseColor.rgb *= mix(vec3(1.0), sophiaGradient(vSophiaPos), 0.62);
`;

const EMISSIVE_FRAG = `
#include <emissivemap_fragment>
{
  vec3 grad = sophiaGradient(vSophiaPos);
  vec3 viewDir = normalize(vViewPosition);
  float NdotV = max(dot(normal, viewDir), 0.0);
  float fres = pow(1.0 - NdotV, 2.55);
  float glowAmt = uGlow * (1.0 + uAudio * 0.85);
  totalEmissiveRadiance += grad * (glowAmt * 0.9 + fres * uFresnelBoost * glowAmt);
}
`;

export function createSophiaUniforms() {
  return {
    uTime: { value: 0 },
    uBend: { value: new Vector3(0, 0, 0) },
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
    uPivot: { value: new Vector3(0, 0, 0) },
    uStretch: { value: 1 },
    uStretchAxis: { value: new Vector3(1, 0, 0) },
    uCompress: { value: 0 },
    uWave: { value: 0 },
    uWaveAxis: { value: new Vector3(1, 0, 0) },
    uWaveSpeed: { value: 0.8 },
    uAsymmetry: { value: 0 },
    uAperture: { value: 0 },
    uBreathing: { value: 0 },
    uKnot: { value: 0 },
    uStutter: { value: 0 },
    uMajorRadius: { value: 0.6 },
    uTubeRadius: { value: 0.17 },
    uGlow: { value: 1.4 },
    uColorSpeed: { value: 0.32 },
    uAnimateColors: { value: 1 },
    uColorA: { value: new Color("#00E5FF") },
    uColorB: { value: new Color("#2E7BFF") },
    uColorC: { value: new Color("#8B5CF6") },
    uColorD: { value: new Color("#FF2BD6") },
    uColorE: { value: new Color("#FF7AB6") },
    uColorF: { value: new Color("#FFB020") },
    uFresnelBoost: { value: 1.1 },
    uAudio: { value: 0 },
    uStreakOn: { value: 1 },
    uStreakSpeed: { value: 0.28 },
    uStreakIntensity: { value: 0.7 },
    uHighlight: { value: 0.5 },
    uFlowDir: { value: 1 },
    uWarning: { value: 0 },
    uSegmentsOn: { value: 0 },
  };
}

export function applySophiaOnBeforeCompile(shader: WebGLProgramParametersWithUniforms) {
  const extras = createSophiaUniforms();
  Object.assign(shader.uniforms, extras);

  shader.vertexShader = DISPLACE + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace("#include <beginnormal_vertex>", BEGIN_NORMAL);
  shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", BEGIN_VERTEX);

  shader.fragmentShader = FRAGMENT_HEAD + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", COLOR_FRAG);
  shader.fragmentShader = shader.fragmentShader.replace("#include <emissivemap_fragment>", EMISSIVE_FRAG);
}

export const GLOW_VERTEX = `
${DISPLACE}
varying vec3 vN;
varying vec3 vW;
void main() {
  vec3 t = sophiaDisplace(position);
  vec3 tn = sophiaDisplace(position + normal * 0.02);
  vec3 n = normalize(tn - t);
  vec4 world = modelMatrix * vec4(t, 1.0);
  vW = world.xyz;
  vN = normalize(mat3(modelMatrix) * n);
  vSophiaPos = t;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const GLOW_FRAGMENT = `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform vec3 uColorD;
uniform vec3 uColorE;
uniform vec3 uColorF;
uniform float uGlow;
uniform float uTime;
uniform float uColorSpeed;
uniform float uStreakOn;
uniform float uStreakSpeed;
uniform float uStreakIntensity;
uniform float uHighlight;
uniform float uFlowDir;
uniform float uWarning;
uniform float uSegmentsOn;
varying vec3 vN;
varying vec3 vW;
varying vec3 vSophiaPos;

vec3 atlasRamp(float g) {
  g = fract(g);
  vec3 grad = mix(uColorA, uColorB, smoothstep(0.00, 0.16, g));
  grad = mix(grad, uColorC, smoothstep(0.14, 0.32, g));
  grad = mix(grad, uColorD, smoothstep(0.30, 0.48, g));
  grad = mix(grad, uColorE, smoothstep(0.46, 0.64, g));
  grad = mix(grad, uColorF, smoothstep(0.62, 0.82, g));
  grad = mix(grad, uColorA, smoothstep(0.78, 1.00, g));
  return grad;
}

void main() {
  vec3 view = normalize(cameraPosition - vW);
  float fres = pow(1.0 - abs(dot(normalize(vN), view)), 2.8);
  float theta = atan(vSophiaPos.y, vSophiaPos.x);
  float flow = theta * 0.15915494309;
  float g = fract(flow + uTime * uColorSpeed * uFlowDir * 0.18 + 0.5);
  vec3 grad = atlasRamp(g);

  // Traveling segments for working state
  if (uSegmentsOn > 0.001) {
    float segSpeed = max(0.4, uStreakSpeed) * 1.85;
    float segPhase = flow * 3.0 + uTime * segSpeed * uFlowDir;
    float segFrac = fract(segPhase);
    float head = smoothstep(0.72, 0.98, segFrac);
    float trail = pow(segFrac, 3.4) * smoothstep(0.05, 0.35, segFrac);
    float segInt = (head * 1.8 + trail * 1.1) * uStreakIntensity * uSegmentsOn;
    vec3 headColor = atlasRamp(g + 0.22) * 2.0;
    vec3 trailColor = atlasRamp(g - 0.14) * 1.35;
    vec3 segColor = mix(trailColor, headColor, head);
    grad = mix(grad, segColor, clamp(segInt * 0.75, 0.0, 1.0));
    grad += segColor * (segInt * uHighlight);
  }

  float streakAmt = clamp(uStreakOn, 0.0, 1.0);
  if (streakAmt > 0.001 && uSegmentsOn < 0.5) {
    float angle = (flow + uTime * uStreakSpeed * uFlowDir * 0.22) * 6.28318530718;
    float s1 = pow(smoothstep(0.32, 0.98, cos(angle)), 2.35);
    float s2 = pow(smoothstep(0.48, 0.98, cos(angle * 1.65 + 1.15)), 3.1);
    vec3 c1 = atlasRamp(g + 0.18);
    vec3 c2 = atlasRamp(g + 0.42);
    grad = mix(grad, c1 * 1.45, s1 * uStreakIntensity * streakAmt);
    grad = mix(grad, c2 * 1.3, s2 * uStreakIntensity * 0.65 * streakAmt);
    grad += c1 * (s1 * uHighlight * streakAmt);
  }

  if (uWarning > 0.001) {
    float pinchZone = exp(-4.2 * (1.0 - cos(theta)));
    vec3 warn = mix(vec3(1.0, 0.55, 0.06), vec3(1.0, 0.16, 0.10), 0.58);
    grad = mix(grad, warn * 1.85, pinchZone * uWarning * 0.95);
    grad += warn * (pinchZone * uWarning * 1.5);
  }
  float a = fres * 0.55 * uGlow;
  gl_FragColor = vec4(grad * (0.8 + fres), a);
}
`;
