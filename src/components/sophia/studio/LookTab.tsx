import { useSophiaStore } from "@/store/sophiaStore";
import { AccordionGroup, AxisPicker, ColorField, DirPicker, Row, Section, SectionActionBar, Slider, Toggle } from "./controls";

export default function LookTab() {
  const s = useSophiaStore();
  const patch = s.patch;

  return (
    <AccordionGroup>
      <SectionActionBar section="look" title="Look" />

      <Section title="Gradient">
        <div className="flex justify-between px-2">
          <ColorField label="A" value={s.colorA} onChange={(colorA) => patch({ colorA })} />
          <ColorField label="B" value={s.colorB} onChange={(colorB) => patch({ colorB })} />
          <ColorField label="C" value={s.colorC} onChange={(colorC) => patch({ colorC })} />
          <ColorField label="D" value={s.colorD} onChange={(colorD) => patch({ colorD })} />
        </div>
        <Toggle label="Animated colour flow" value={s.animateColors} onChange={(v) => patch({ animateColors: v })} />
        <Slider label="Colour flow speed" value={s.colorSpeed} min={0} max={2} step={0.01} defaultValue={0.28} onChange={(v) => patch({ colorSpeed: v })} />
        <Row label="Flow direction">
          <DirPicker value={s.colorFlowDir} onChange={(colorFlowDir) => patch({ colorFlowDir })} />
        </Row>
      </Section>

      <Section title="Light streaks & Segments">
        <Toggle label="Traveling highlight" value={s.streakOn} onChange={(v) => patch({ streakOn: v })} />
        <Toggle label="Chasing segments (Working)" value={s.segmentsOn ?? false} onChange={(v) => patch({ segmentsOn: v })} />
        <div className="flex gap-1.5">
          {[
            { label: "Slow", value: 0.16 },
            { label: "Medium", value: 0.4 },
            { label: "Fast", value: 0.9 },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => patch({ streakSpeed: opt.value })}
              className="flex-1 rounded-xl border border-white/10 py-1.5 text-[11px] text-white/60 hover:text-white"
            >
              {opt.label}
            </button>
          ))}
        </div>
        <Slider label="Streak speed" value={s.streakSpeed} min={0.04} max={1.6} step={0.01} defaultValue={0.22} onChange={(v) => patch({ streakSpeed: v })} />
        <Slider label="Streak intensity" value={s.streakIntensity} min={0} max={1.5} step={0.01} defaultValue={0.62} onChange={(v) => patch({ streakIntensity: v })} />
        <Slider label="Highlight" value={s.highlightAmount} min={0} max={1.4} step={0.01} defaultValue={0.42} onChange={(v) => patch({ highlightAmount: v })} />
        <Slider label="Glow intensity" value={s.glow} min={0} max={3} step={0.01} defaultValue={1.28} onChange={(v) => patch({ glow: v })} />
        <Toggle label="Animated glow" value={s.animateGlow} onChange={(v) => patch({ animateGlow: v })} />
      </Section>

      <Section title="Surface">
        <Slider label="Iridescence" value={s.iridescence} min={0} max={1} step={0.01} defaultValue={1} onChange={(v) => patch({ iridescence: v })} />
        <Slider label="Fresnel / rim" value={s.fresnelPower} min={0.4} max={5} step={0.05} defaultValue={2.6} onChange={(v) => patch({ fresnelPower: v })} />
        <Slider label="Metalness" value={s.metalness} min={0} max={1} step={0.01} defaultValue={0.22} onChange={(v) => patch({ metalness: v })} />
        <Slider label="Roughness" value={s.roughness} min={0} max={1} step={0.01} defaultValue={0.18} onChange={(v) => patch({ roughness: v })} />
        <Slider label="Clearcoat" value={s.clearcoat} min={0} max={1} step={0.01} defaultValue={1} onChange={(v) => patch({ clearcoat: v })} />
        <Slider label="Transmission" value={s.transmission} min={0} max={1} step={0.01} defaultValue={0.12} onChange={(v) => patch({ transmission: v })} />
      </Section>

      <Section title="Ambient particles">
        <Toggle label="Particles" value={s.particlesOn} onChange={(v) => patch({ particlesOn: v })} />
        <p className="text-[11px] leading-relaxed text-white/35">Default is off. Keep them quieter than Sophia.</p>
        <Slider label="Amount" value={s.particleAmount} min={8} max={160} step={1} defaultValue={48} onChange={(v) => patch({ particleAmount: v })} />
        <Slider label="Size" value={s.particleSize} min={0.3} max={2.4} step={0.01} defaultValue={0.85} onChange={(v) => patch({ particleSize: v })} />
        <Slider label="Brightness" value={s.particleBrightness} min={0} max={1} step={0.01} defaultValue={0.65} onChange={(v) => patch({ particleBrightness: v })} />
        <Slider label="Speed" value={s.particleSpeed} min={0} max={1.4} step={0.01} defaultValue={0.35} onChange={(v) => patch({ particleSpeed: v })} />
        <Slider label="Spread" value={s.particleSpread} min={1.1} max={4.5} step={0.05} defaultValue={2.2} onChange={(v) => patch({ particleSpread: v })} />
        <Slider label="Drift" value={s.particleDrift} min={0} max={1} step={0.01} defaultValue={0.25} onChange={(v) => patch({ particleDrift: v })} />
        <Slider label="Opacity" value={s.particleOpacity} min={0} max={1} step={0.01} defaultValue={0.35} onChange={(v) => patch({ particleOpacity: v })} />
      </Section>

      <Section title="Light-streak rings">
        <Toggle label="Ambient orbits" value={s.ringsOn} onChange={(v) => patch({ ringsOn: v })} />
        <p className="text-[11px] leading-relaxed text-white/35">Atmospheric only — never a HUD ring.</p>
        <Slider label="Count" value={s.ringCount} min={1} max={5} step={1} defaultValue={2} onChange={(v) => patch({ ringCount: v })} />
        <Slider label="Radius" value={s.ringRadius} min={0.4} max={2.6} step={0.01} defaultValue={1.12} onChange={(v) => patch({ ringRadius: v })} />
        <Slider label="Opacity" value={s.ringOpacity} min={0} max={0.8} step={0.01} defaultValue={0.18} onChange={(v) => patch({ ringOpacity: v })} />
        <Slider label="Speed" value={s.ringSpeed} min={0} max={1.2} step={0.01} defaultValue={0.1} onChange={(v) => patch({ ringSpeed: v })} />
        <Row label="Axis">
          <AxisPicker value={s.ringAxis} onChange={(ringAxis) => patch({ ringAxis })} />
        </Row>
        <Row label="Direction">
          <DirPicker value={s.ringDirection} onChange={(ringDirection) => patch({ ringDirection })} />
        </Row>
        <Slider label="Glow / blur" value={s.ringGlow} min={0.1} max={1.6} step={0.01} defaultValue={0.55} onChange={(v) => patch({ ringGlow: v })} />
      </Section>

      <Section title="Studio lighting">
        <div className="grid grid-cols-3 gap-3">
          <ColorField label="Key" value={s.keyColor} onChange={(keyColor) => patch({ keyColor })} />
          <ColorField label="Fill" value={s.fillColor} onChange={(fillColor) => patch({ fillColor })} />
          <ColorField label="Rim" value={s.rimColor} onChange={(rimColor) => patch({ rimColor })} />
        </div>
        <Slider label="Key intensity" value={s.keyIntensity} min={0} max={8} step={0.05} defaultValue={2.9} onChange={(v) => patch({ keyIntensity: v })} />
        <Slider label="Fill intensity" value={s.fillIntensity} min={0} max={6} step={0.05} defaultValue={1.15} onChange={(v) => patch({ fillIntensity: v })} />
        <Slider label="Rim intensity" value={s.rimIntensity} min={0} max={10} step={0.05} defaultValue={3.4} onChange={(v) => patch({ rimIntensity: v })} />
        <Slider label="Ambient" value={s.ambientIntensity} min={0} max={1.5} step={0.01} defaultValue={0.4} onChange={(v) => patch({ ambientIntensity: v })} />
      </Section>

      <Section title="Bloom">
        <Slider label="Intensity" value={s.bloomIntensity} min={0} max={3.5} step={0.01} defaultValue={1.15} onChange={(v) => patch({ bloomIntensity: v })} />
        <Slider label="Threshold" value={s.bloomThreshold} min={0} max={1} step={0.01} defaultValue={0.25} onChange={(v) => patch({ bloomThreshold: v })} />
        <Slider label="Smoothing" value={s.bloomSmoothing} min={0} max={1} step={0.01} defaultValue={0.65} onChange={(v) => patch({ bloomSmoothing: v })} />
      </Section>
    </AccordionGroup>
  );
}
