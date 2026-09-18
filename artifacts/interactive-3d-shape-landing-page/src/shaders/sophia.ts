import type { WebGLProgramParametersWithUniforms } from "three";
import { Color, Vector3 } from "three";

const VERTEX_HEAD = `
uniform float uTime;
uniform float uBend;
uniform vec3 uBendAxis;
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
  float extent = 2.35;
  float k = amount / extent;
  if (abs(k) < 0.00015) return p;
  float radius = 1.0 / k;
  float theta = x * k;
  float s = sin(theta);
  float c = cos(theta);
  float nx = s * (radius + y);
  float ny = (radius + y) * c - radius;
  return a * nx + side * ny + up * z;
}

vec3 applyTaper(vec3 p, vec3 axis, float amount) {
  if (abs(amount) < 0.00015) return p;
  vec3 a = normalize(axis);
  float h = dot(p, a);
  vec3 along = a * h;
  vec3 across = p - along;
  float s = 1.0 + amount * h * 0.5;
  s = max(s, 0.06);
  return along + across * s;
}

vec3 applyTwist(vec3 p, vec3 axis, float amount) {
  if (abs(amount) < 0.00015) return p;
  vec3 a = normalize(axis);
  float h = dot(p, a);
  return rotateAxis(p, a, amount * h);
}

vec3 sophiaDisplace(vec3 p) {
  float theta = atan(p.y, p.x);
  float org = 1.0 + uOrganic * (
    0.58 * cos(3.0 * theta + uTime * uSpeed * 0.18) +
    0.22 * sin(2.0 * theta + 0.4)
  );
  p.xy *= org;
  p.z += uOrganic * 0.12 * sin(3.0 * theta + uTime * uSpeed * 0.12);

  p = applyTaper(p, uTaperAxis, uTaper);
  p = applyTwist(p, uTwistAxis, uTwist);
  p = applyBend(p, uBendAxis, uBend);

  if (abs(uRevolve) > 0.0001) {
    p = rotateAxis(p, vec3(0.0, 1.0, 0.0), uRevolve);
  }

  float n = fbm(p * uNoiseScale + vec3(uTime * uSpeed * 0.22, uTime * uSpeed * 0.13, 1.7));
  p += normalize(p + 0.0001) * (n - 0.42) * uNoise;

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
uniform float uFresnelBoost;
uniform float uAudio;
varying vec3 vSophiaPos;

vec3 sophiaGradient(vec3 pos) {
  float gx = clamp(pos.x * 0.46 + 0.5, 0.0, 1.0);
  float gy = clamp(pos.y * 0.46 + 0.5, 0.0, 1.0);
  vec3 grad = mix(uColorA, uColorB, smoothstep(0.0, 0.42, gx));
  grad = mix(grad, uColorC, smoothstep(0.32, 0.72, gx));
  grad = mix(grad, uColorD, smoothstep(0.62, 1.0, gx));
  grad = mix(grad, uColorB, gy * 0.22);
  if (uAnimateColors > 0.5) {
    float ph = uTime * uColorSpeed;
    grad = mix(grad, uColorC, 0.18 + 0.18 * sin(ph + gx * 6.28318));
    grad = mix(grad, uColorA, 0.12 + 0.12 * cos(ph * 0.73 + gy * 4.2));
  }
  return grad;
}
`;

const COLOR_FRAG = `
#include <color_fragment>
diffuseColor.rgb *= mix(vec3(1.0), sophiaGradient(vSophiaPos), 0.58);
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
    uColorSpeed: { value: 0.32 },
    uAnimateColors: { value: 1 },
    uColorA: { value: new Color("#2E7BFF") },
    uColorB: { value: new Color("#9B4DFF") },
    uColorC: { value: new Color("#FF4DAD") },
    uColorD: { value: new Color("#FF5A3C") },
    uFresnelBoost: { value: 1.1 },
    uAudio: { value: 0 },
  };
}

export function applySophiaOnBeforeCompile(shader: WebGLProgramParametersWithUniforms) {
  const extras = createSophiaUniforms();
  Object.assign(shader.uniforms, extras);

  shader.vertexShader = VERTEX_HEAD + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace(
    "#include <beginnormal_vertex>",
    BEGIN_NORMAL,
  );
  shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", BEGIN_VERTEX);

  shader.fragmentShader = FRAGMENT_HEAD + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", COLOR_FRAG);
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <emissivemap_fragment>",
    EMISSIVE_FRAG,
  );
}

export const GLOW_VERTEX = `
uniform float uTime;
uniform float uBend;
uniform vec3 uBendAxis;
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
varying vec3 vN;
varying vec3 vW;

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
  for (int i = 0; i < 3; i++) {
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
vec3 sophiaDisplace(vec3 p) {
  float theta = atan(p.y, p.x);
  float org = 1.0 + uOrganic * (0.58 * cos(3.0 * theta + uTime * uSpeed * 0.18) + 0.22 * sin(2.0 * theta + 0.4));
  p.xy *= org;
  vec3 aT = normalize(uTaperAxis);
  float h = dot(p, aT);
  p = aT * h + (p - aT * h) * max(1.0 + uTaper * h * 0.5, 0.06);
  p = rotateAxis(p, normalize(uTwistAxis), uTwist * dot(p, normalize(uTwistAxis)));
  p = applyBend(p, uBendAxis, uBend);
  if (abs(uRevolve) > 0.0001) p = rotateAxis(p, vec3(0.0, 1.0, 0.0), uRevolve);
  float n = fbm(p * uNoiseScale + vec3(uTime * uSpeed * 0.22));
  p += normalize(p + 0.0001) * (n - 0.42) * uNoise;
  p *= 1.0 + uPulse;
  return p;
}
void main() {
  vec3 t = sophiaDisplace(position);
  vec3 tn = sophiaDisplace(position + normal * 0.02);
  vec3 n = normalize(tn - t);
  vec4 world = modelMatrix * vec4(t, 1.0);
  vW = world.xyz;
  vN = normalize(mat3(modelMatrix) * n);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const GLOW_FRAGMENT = `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform vec3 uColorD;
uniform float uGlow;
varying vec3 vN;
varying vec3 vW;
void main() {
  vec3 view = normalize(cameraPosition - vW);
  float fres = pow(1.0 - abs(dot(normalize(vN), view)), 2.8);
  float gx = clamp(vW.x * 0.35 + 0.5, 0.0, 1.0);
  vec3 grad = mix(uColorA, uColorB, smoothstep(0.0, 0.4, gx));
  grad = mix(grad, uColorC, smoothstep(0.35, 0.75, gx));
  grad = mix(grad, uColorD, smoothstep(0.65, 1.0, gx));
  float a = fres * 0.55 * uGlow;
  gl_FragColor = vec4(grad * (0.8 + fres), a);
}
`;
