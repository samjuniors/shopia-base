import { useRef } from "react";
import { cn } from "../utils/cn";
import { useSophiaStore } from "../store/sophiaStore";
import { BUILTIN_PRESETS } from "../lib/presets";
import type { Axis, PanelTab, ShapeType, VoiceState } from "../lib/types";

const TABS: { id: PanelTab; label: string }[] = [
  { id: "presence", label: "Presence" },
  { id: "shape", label: "Shape" },
  { id: "motion", label: "Motion" },
  { id: "look", label: "Look" },
  { id: "presets", label: "Presets" },
];

const VOICES: { id: VoiceState; title: string; copy: string }[] = [
  { id: "idle", title: "Idle", copy: "Soft breathe, slow orbit" },
  { id: "listen", title: "Listen", copy: "Alert pulse, audio reactive" },
  { id: "think", title: "Think", copy: "Noise flow, multi-axis drift" },
  { id: "speak", title: "Speak", copy: "Syllable bounce, warm glow" },
];

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  const digits = step < 1 ? (step < 0.1 ? 2 : 2) : 0;
  return (
    <label className="block space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] tracking-wide text-white/50">{label}</span>
        <span className="font-mono text-[11px] text-white/80">
          {value.toFixed(digits)}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="sophia-range"
      />
    </label>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="flex w-full items-center justify-between py-1">
      <span className="text-[11px] tracking-wide text-white/50">{label}</span>
      <span
        className={cn(
          "relative h-5 w-9 rounded-full p-0.5 transition-colors",
          value ? "bg-violet-500" : "bg-white/10",
        )}
      >
        <span
          className={cn(
            "block h-4 w-4 rounded-full bg-white shadow transition-transform",
            value && "translate-x-4",
          )}
        />
      </span>
    </button>
  );
}

function AxisPicker({
  value,
  onChange,
}: {
  value: Axis;
  onChange: (a: Axis) => void;
}) {
  return (
    <div className="flex gap-1">
      {(["x", "y", "z"] as Axis[]).map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => onChange(a)}
          className={cn(
            "h-7 w-7 rounded-md text-[11px] font-semibold uppercase tracking-wider transition",
            value === a
              ? "bg-white/20 text-white"
              : "bg-white/5 text-white/40 hover:text-white/70",
          )}
        >
          {a}
        </button>
      ))}
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col items-center gap-1.5">
      <input
        type="color"
        className="sophia-color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="text-[10px] tracking-wide text-white/40">{label}</span>
    </label>
  );
}

function Section({ title, children }: { title: string; children: import("react").ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-medium tracking-[0.22em] text-white/35 uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function SettingsPanel() {
  const open = useSophiaStore((s) => s.settingsOpen);
  const tab = useSophiaStore((s) => s.activeTab);
  const patch = useSophiaStore((s) => s.patch);
  const s = useSophiaStore();
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="pointer-events-auto absolute inset-0 z-30 bg-black/40"
        aria-label="Close settings"
        onClick={() => patch({ settingsOpen: false })}
      />
      <aside className="panel-enter pointer-events-auto absolute top-0 left-0 z-40 flex h-full w-[min(420px,100vw)] flex-col border-r border-white/10 bg-[#070714]/92 shadow-[20px_0_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <header className="flex items-center justify-between px-5 pt-6 pb-4">
          <div>
            <p className="text-[10px] tracking-[0.32em] text-white/35 uppercase">Studio</p>
            <h2 className="mt-1 text-[18px] font-light tracking-[0.18em] text-white">SOPHIA</h2>
          </div>
          <button
            type="button"
            onClick={() => patch({ settingsOpen: false })}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/60 hover:text-white"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        </header>

        <nav className="flex gap-1 overflow-x-auto px-4 pb-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => patch({ activeTab: t.id, activePreset: s.activePreset })}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] tracking-wide whitespace-nowrap transition",
                tab === t.id
                  ? "bg-white/15 text-white"
                  : "text-white/40 hover:bg-white/5 hover:text-white/70",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="sophia-scroll flex-1 space-y-6 overflow-y-auto px-5 pt-2 pb-10">
          {tab === "presence" && (
            <>
              <Section title="Voice state">
                <div className="grid grid-cols-2 gap-2">
                  {VOICES.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => s.setVoiceState(v.id)}
                      className={cn(
                        "rounded-2xl border px-3 py-3 text-left transition",
                        s.voiceState === v.id
                          ? "border-violet-400/50 bg-violet-500/15 shadow-[0_0_24px_rgba(139,92,246,0.25)]"
                          : "border-white/8 bg-white/4 hover:border-white/15",
                      )}
                    >
                      <div className="text-[13px] font-medium tracking-wide text-white">{v.title}</div>
                      <div className="mt-1 text-[10px] leading-snug text-white/40">{v.copy}</div>
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="Live input">
                <Toggle
                  label="Use microphone"
                  value={s.micEnabled}
                  onChange={() => s.toggleMic()}
                />
                {s.micError && (
                  <p className="text-[11px] text-rose-300/80">
                    Microphone permission was denied.
                  </p>
                )}
                <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 to-fuchsia-400 transition-[width] duration-75"
                    style={{ width: `${Math.min(100, s.audioLevel * 140)}%` }}
                  />
                </div>
              </Section>

              <Section title="Global speed">
                <Slider
                  label="Animation speed"
                  value={s.speed}
                  min={0.05}
                  max={2.4}
                  step={0.01}
                  onChange={(v) => patch({ speed: v })}
                />
              </Section>

              <Section title="Camera">
                <Toggle
                  label="Inspect mode (orbit drag)"
                  value={s.inspectMode}
                  onChange={(v) => patch({ inspectMode: v })}
                />
                <p className="text-[11px] leading-relaxed text-white/35">
                  Click the ring to cycle idle → listen → think → speak. Spacebar does the same.
                </p>
              </Section>
            </>
          )}

          {tab === "shape" && (
            <>
              <Section title="Form">
                <div className="grid grid-cols-4 gap-1.5">
                  {(["torus", "organic", "knot", "blob"] as ShapeType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => patch({ shapeType: type })}
                      className={cn(
                        "rounded-xl py-2 text-[10px] tracking-[0.14em] uppercase transition",
                        s.shapeType === type
                          ? "bg-white/18 text-white"
                          : "bg-white/5 text-white/40 hover:text-white/70",
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <Slider
                  label="Major radius"
                  value={s.majorRadius}
                  min={0.5}
                  max={1.8}
                  step={0.01}
                  onChange={(v) => patch({ majorRadius: v })}
                />
                {s.shapeType !== "blob" && (
                  <Slider
                    label="Tube radius"
                    value={s.tubeRadius}
                    min={0.08}
                    max={0.7}
                    step={0.005}
                    onChange={(v) => patch({ tubeRadius: v })}
                  />
                )}
                {s.shapeType === "knot" && (
                  <>
                    <Slider label="P" value={s.p} min={1} max={8} step={1} onChange={(v) => patch({ p: v })} />
                    <Slider label="Q" value={s.q} min={1} max={8} step={1} onChange={(v) => patch({ q: v })} />
                  </>
                )}
                <Slider
                  label="Organic"
                  value={s.organic}
                  min={0}
                  max={0.55}
                  step={0.005}
                  onChange={(v) => patch({ organic: v })}
                />
              </Section>

              <Section title="Bend">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/50">Axis</span>
                  <AxisPicker value={s.bendAxis} onChange={(bendAxis) => patch({ bendAxis })} />
                </div>
                <Slider
                  label="Amount"
                  value={s.bend}
                  min={-180}
                  max={180}
                  step={1}
                  unit="°"
                  onChange={(v) => patch({ bend: v })}
                />
                <Toggle
                  label="Animate ±180° seesaw bend"
                  value={s.animateBend}
                  onChange={(v) => patch({ animateBend: v })}
                />
              </Section>

              <Section title="Taper">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/50">Axis</span>
                  <AxisPicker value={s.taperAxis} onChange={(taperAxis) => patch({ taperAxis })} />
                </div>
                <Slider
                  label="Amount"
                  value={s.taper}
                  min={-1.6}
                  max={1.6}
                  step={0.01}
                  onChange={(v) => patch({ taper: v })}
                />
                <Toggle label="Animate taper" value={s.animateTaper} onChange={(v) => patch({ animateTaper: v })} />
              </Section>

              <Section title="Twist">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/50">Axis</span>
                  <AxisPicker value={s.twistAxis} onChange={(twistAxis) => patch({ twistAxis })} />
                </div>
                <Slider
                  label="Amount"
                  value={s.twist}
                  min={-720}
                  max={720}
                  step={1}
                  unit="°"
                  onChange={(v) => patch({ twist: v })}
                />
                <Toggle label="Animate twist" value={s.animateTwist} onChange={(v) => patch({ animateTwist: v })} />
              </Section>

              <Section title="Noise & revolve">
                <Slider
                  label="Noise"
                  value={s.noise}
                  min={0}
                  max={0.7}
                  step={0.005}
                  onChange={(v) => patch({ noise: v })}
                />
                <Slider
                  label="Noise scale"
                  value={s.noiseScale}
                  min={0.2}
                  max={6}
                  step={0.05}
                  onChange={(v) => patch({ noiseScale: v })}
                />
                <Toggle label="Flowing noise" value={s.animateNoise} onChange={(v) => patch({ animateNoise: v })} />
                <Slider
                  label="Revolve speed"
                  value={s.revolve}
                  min={0}
                  max={3}
                  step={0.01}
                  onChange={(v) => patch({ revolve: v })}
                />
              </Section>
            </>
          )}

          {tab === "motion" && (
            <>
              <Section title="Orbit XYZ">
                <Toggle label="Orbit X" value={s.orbitX} onChange={(v) => patch({ orbitX: v })} />
                <Slider
                  label="Speed X"
                  value={s.orbitSpeedX}
                  min={-1.5}
                  max={1.5}
                  step={0.01}
                  onChange={(v) => patch({ orbitSpeedX: v })}
                />
                <Toggle label="Orbit Y" value={s.orbitY} onChange={(v) => patch({ orbitY: v })} />
                <Slider
                  label="Speed Y"
                  value={s.orbitSpeedY}
                  min={-1.5}
                  max={1.5}
                  step={0.01}
                  onChange={(v) => patch({ orbitSpeedY: v })}
                />
                <Toggle label="Orbit Z" value={s.orbitZ} onChange={(v) => patch({ orbitZ: v })} />
                <Slider
                  label="Speed Z"
                  value={s.orbitSpeedZ}
                  min={-1.5}
                  max={1.5}
                  step={0.01}
                  onChange={(v) => patch({ orbitSpeedZ: v })}
                />
              </Section>

              <Section title="See-saw">
                <Toggle label="Enable see-saw" value={s.seesaw} onChange={(v) => patch({ seesaw: v })} />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/50">Axis</span>
                  <AxisPicker value={s.seesawAxis} onChange={(seesawAxis) => patch({ seesawAxis })} />
                </div>
                <Slider
                  label="Amplitude"
                  value={s.seesawAmount}
                  min={0}
                  max={180}
                  step={1}
                  unit="°"
                  onChange={(v) => patch({ seesawAmount: v })}
                />
              </Section>

              <Section title="Life">
                <Toggle label="Float" value={s.float} onChange={(v) => patch({ float: v })} />
                <Toggle
                  label="Animated glow"
                  value={s.animateGlow}
                  onChange={(v) => patch({ animateGlow: v })}
                />
                <Toggle
                  label="Animated colours"
                  value={s.animateColors}
                  onChange={(v) => patch({ animateColors: v })}
                />
                <Slider
                  label="Colour cycle speed"
                  value={s.colorSpeed}
                  min={0}
                  max={2}
                  step={0.01}
                  onChange={(v) => patch({ colorSpeed: v })}
                />
              </Section>

              <Section title="Recipes">
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    {
                      name: "See-saw X",
                      apply: () =>
                        patch({
                          seesaw: true,
                          seesawAxis: "x",
                          seesawAmount: 40,
                          orbitY: false,
                        }),
                    },
                    {
                      name: "Bend 180",
                      apply: () =>
                        patch({
                          animateBend: true,
                          bend: 180,
                          bendAxis: "z",
                        }),
                    },
                    {
                      name: "Twist dance",
                      apply: () => patch({ animateTwist: true, twist: 360, twistAxis: "y" }),
                    },
                    {
                      name: "Full orbit",
                      apply: () =>
                        patch({
                          orbitX: true,
                          orbitY: true,
                          orbitZ: true,
                          orbitSpeedX: 0.12,
                          orbitSpeedY: 0.2,
                          orbitSpeedZ: 0.08,
                        }),
                    },
                    {
                      name: "Chaos",
                      apply: () =>
                        patch({
                          animateBend: true,
                          animateTwist: true,
                          animateTaper: true,
                          animateNoise: true,
                          bend: 90,
                          twist: 220,
                          noise: 0.22,
                          seesaw: true,
                        }),
                    },
                    {
                      name: "Still",
                      apply: () =>
                        patch({
                          orbitX: false,
                          orbitY: false,
                          orbitZ: false,
                          seesaw: false,
                          animateBend: false,
                          animateTwist: false,
                          animateTaper: false,
                          float: false,
                          revolve: 0,
                        }),
                    },
                  ].map((r) => (
                    <button
                      key={r.name}
                      type="button"
                      onClick={r.apply}
                      className="rounded-xl border border-white/8 bg-white/4 py-2 text-[11px] text-white/70 hover:border-white/20 hover:text-white"
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              </Section>
            </>
          )}

          {tab === "look" && (
            <>
              <Section title="Gradient">
                <div className="flex justify-between px-2">
                  <ColorField label="A" value={s.colorA} onChange={(colorA) => patch({ colorA })} />
                  <ColorField label="B" value={s.colorB} onChange={(colorB) => patch({ colorB })} />
                  <ColorField label="C" value={s.colorC} onChange={(colorC) => patch({ colorC })} />
                  <ColorField label="D" value={s.colorD} onChange={(colorD) => patch({ colorD })} />
                </div>
                <Slider
                  label="Glow"
                  value={s.glow}
                  min={0}
                  max={3}
                  step={0.01}
                  onChange={(v) => patch({ glow: v })}
                />
                <Slider
                  label="Iridescence"
                  value={s.iridescence}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(v) => patch({ iridescence: v })}
                />
                <Slider
                  label="Fresnel / rim"
                  value={s.fresnelPower}
                  min={0.4}
                  max={5}
                  step={0.05}
                  onChange={(v) => patch({ fresnelPower: v })}
                />
              </Section>

              <Section title="Surface">
                <Slider
                  label="Metalness"
                  value={s.metalness}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(v) => patch({ metalness: v })}
                />
                <Slider
                  label="Roughness"
                  value={s.roughness}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(v) => patch({ roughness: v })}
                />
                <Slider
                  label="Clearcoat"
                  value={s.clearcoat}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(v) => patch({ clearcoat: v })}
                />
                <Slider
                  label="Transmission"
                  value={s.transmission}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(v) => patch({ transmission: v })}
                />
              </Section>

              <Section title="3-point studio lighting">
                <div className="grid grid-cols-3 gap-3">
                  <ColorField label="Key" value={s.keyColor} onChange={(keyColor) => patch({ keyColor })} />
                  <ColorField label="Fill" value={s.fillColor} onChange={(fillColor) => patch({ fillColor })} />
                  <ColorField label="Rim" value={s.rimColor} onChange={(rimColor) => patch({ rimColor })} />
                </div>
                <Slider
                  label="Key intensity"
                  value={s.keyIntensity}
                  min={0}
                  max={8}
                  step={0.05}
                  onChange={(v) => patch({ keyIntensity: v })}
                />
                <Slider
                  label="Fill intensity"
                  value={s.fillIntensity}
                  min={0}
                  max={6}
                  step={0.05}
                  onChange={(v) => patch({ fillIntensity: v })}
                />
                <Slider
                  label="Rim intensity"
                  value={s.rimIntensity}
                  min={0}
                  max={10}
                  step={0.05}
                  onChange={(v) => patch({ rimIntensity: v })}
                />
                <Slider
                  label="Ambient"
                  value={s.ambientIntensity}
                  min={0}
                  max={1.5}
                  step={0.01}
                  onChange={(v) => patch({ ambientIntensity: v })}
                />
              </Section>

              <Section title="Bloom">
                <Slider
                  label="Intensity"
                  value={s.bloomIntensity}
                  min={0}
                  max={3.5}
                  step={0.01}
                  onChange={(v) => patch({ bloomIntensity: v })}
                />
                <Slider
                  label="Threshold"
                  value={s.bloomThreshold}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(v) => patch({ bloomThreshold: v })}
                />
                <Slider
                  label="Smoothing"
                  value={s.bloomSmoothing}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(v) => patch({ bloomSmoothing: v })}
                />
              </Section>
            </>
          )}

          {tab === "presets" && (
            <>
              <Section title="Built-in">
                <div className="grid grid-cols-2 gap-2">
                  {BUILTIN_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => s.applyPreset(p.id, BUILTIN_PRESETS)}
                      className={cn(
                        "rounded-2xl border px-3 py-3 text-left transition",
                        s.activePreset === p.id
                          ? "border-violet-400/50 bg-violet-500/15"
                          : "border-white/8 bg-white/4 hover:border-white/16",
                      )}
                    >
                      <div className="mb-2 flex gap-1">
                        {p.swatches?.map((c) => (
                          <span
                            key={c}
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: c, boxShadow: `0 0 8px ${c}` }}
                          />
                        ))}
                      </div>
                      <div className="text-[12px] text-white/90">{p.name}</div>
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="Your presets">
                <div className="flex gap-2">
                  <input
                    value={s.presetName}
                    onChange={(e) => patch({ presetName: e.target.value, activePreset: s.activePreset })}
                    placeholder="Name this look"
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white outline-none placeholder:text-white/25"
                  />
                  <button
                    type="button"
                    onClick={() => s.savePreset(s.presetName)}
                    className="rounded-xl bg-violet-500 px-3 py-2 text-[12px] font-medium text-white hover:bg-violet-400"
                  >
                    Save
                  </button>
                </div>
                {s.customPresets.length === 0 && (
                  <p className="text-[11px] text-white/35">
                    Sculpt a shape, then save it as a custom preset. Stored on this device.
                  </p>
                )}
                <div className="space-y-1.5">
                  {s.customPresets.map((p) => (
                    <div
                      key={p.id}
                      className={cn(
                        "flex items-center justify-between rounded-xl border px-3 py-2",
                        s.activePreset === p.id
                          ? "border-violet-400/40 bg-violet-500/10"
                          : "border-white/8 bg-white/4",
                      )}
                    >
                      <button
                        type="button"
                        className="flex-1 text-left text-[12px] text-white/90"
                        onClick={() => s.applyPreset(p.id, BUILTIN_PRESETS)}
                      >
                        {p.name}
                      </button>
                      <button
                        type="button"
                        className="text-[11px] text-white/30 hover:text-rose-300"
                        onClick={() => s.deletePreset(p.id)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    className="flex-1 rounded-xl border border-white/10 py-2 text-[11px] text-white/60 hover:text-white"
                    onClick={() => {
                      const blob = new Blob(
                        [JSON.stringify(s.customPresets, null, 2)],
                        { type: "application/json" },
                      );
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = "sophia-presets.json";
                      a.click();
                    }}
                  >
                    Export JSON
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-xl border border-white/10 py-2 text-[11px] text-white/60 hover:text-white"
                    onClick={() => fileRef.current?.click()}
                  >
                    Import JSON
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const text = await file.text();
                        const json = JSON.parse(text);
                        s.importPresets(Array.isArray(json) ? json : [json]);
                      } catch {
                        /* ignore */
                      }
                      e.target.value = "";
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => s.reset()}
                  className="w-full rounded-xl border border-white/10 py-2 text-[11px] tracking-wide text-white/50 hover:text-white"
                >
                  Reset to Sophia
                </button>
              </Section>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
