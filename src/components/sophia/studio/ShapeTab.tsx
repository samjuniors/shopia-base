import type { ShapeType } from "@/lib/sophia/types";
import { useSophiaStore } from "@/store/sophiaStore";
import { cn } from "@/lib/utils";
import { AccordionGroup, AxisPicker, Row, Section, SectionActionBar, Slider, Toggle } from "./controls";
import { ORIENTATION_VIEWS } from "./MotionTab";

const PIVOT_POINTS = [
  { id: "tl", label: "Top Left", gx: -1, gy: 1 },
  { id: "tc", label: "Top", gx: 0, gy: 1 },
  { id: "tr", label: "Top Right", gx: 1, gy: 1 },
  { id: "ml", label: "Left", gx: -1, gy: 0 },
  { id: "cc", label: "Center", gx: 0, gy: 0 },
  { id: "mr", label: "Right", gx: 1, gy: 0 },
  { id: "bl", label: "Bottom Left", gx: -1, gy: -1 },
  { id: "bc", label: "Bottom", gx: 0, gy: -1 },
  { id: "br", label: "Bottom Right", gx: 1, gy: -1 },
] as const;

function NinePointPivot() {
  const s = useSophiaStore();
  const patch = s.patch;
  const r = s.majorRadius || 0.58;

  const activePoint = PIVOT_POINTS.find((pt) => {
    const targetX = pt.gx * r;
    const targetY = pt.gy * r;
    return Math.abs(s.pivotX - targetX) < 0.06 && Math.abs(s.pivotY - targetY) < 0.06;
  });

  return (
    <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      {/* 9-point interactive matrix */}
      <div className="relative flex h-36 w-36 items-center justify-center">
        {/* Shape outline ring reference */}
        <div className="pointer-events-none absolute inset-4 rounded-full border border-dashed border-indigo-400/25" />
        <div className="pointer-events-none absolute h-full w-[1px] bg-white/5" />
        <div className="pointer-events-none absolute h-[1px] w-full bg-white/5" />

        <div className="relative z-10 grid grid-cols-3 gap-6">
          {PIVOT_POINTS.map((pt) => {
            const targetX = Math.round(pt.gx * r * 100) / 100;
            const targetY = Math.round(pt.gy * r * 100) / 100;
            const isActive =
              Math.abs(s.pivotX - targetX) < 0.06 && Math.abs(s.pivotY - targetY) < 0.06;

            return (
              <button
                key={pt.id}
                type="button"
                aria-label={`Pivot ${pt.label}`}
                title={`${pt.label} (${targetX}, ${targetY})`}
                onClick={() => patch({ pivotX: targetX, pivotY: targetY, pivotZ: 0 })}
                className={cn(
                  "group relative flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200",
                  isActive
                    ? "bg-indigo-500/30 ring-2 ring-indigo-400"
                    : "hover:bg-white/10",
                )}
              >
                <span
                  className={cn(
                    "rounded-full transition-all duration-200",
                    isActive
                      ? "h-2.5 w-2.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]"
                      : pt.id === "cc"
                        ? "h-2 w-2 bg-white/60 group-hover:bg-white"
                        : "h-1.5 w-1.5 bg-white/30 group-hover:scale-125 group-hover:bg-white/70",
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Info readout & quick reset */}
      <div className="mt-2 flex w-full items-center justify-between border-t border-white/8 pt-3 text-[11px]">
        <div className="flex flex-col">
          <span className="font-medium tracking-wide text-white/80">
            {activePoint ? activePoint.label : "Custom"}
          </span>
          <span className="font-mono text-[10px] text-white/40">
            X: {s.pivotX.toFixed(2)} / Y: {s.pivotY.toFixed(2)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => patch({ pivotX: 0, pivotY: 0, pivotZ: 0 })}
          className={cn(
            "rounded-lg px-2.5 py-1 text-[10px] font-medium tracking-wide transition",
            s.pivotX === 0 && s.pivotY === 0 && s.pivotZ === 0
              ? "cursor-default bg-white/10 text-white/40"
              : "border border-white/12 bg-white/5 text-white/75 hover:border-white/25 hover:text-white",
          )}
        >
          Center
        </button>
      </div>
    </div>
  );
}

export default function ShapeTab() {
  const s = useSophiaStore();
  const patch = s.patch;

  return (
    <AccordionGroup>
      <SectionActionBar section="shape" title="Shape" />

      <Section title="Form">
        <div className="grid grid-cols-4 gap-1.5">
          {(["torus", "organic", "knot", "blob"] as ShapeType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => patch({ shapeType: type })}
              className={cn(
                "rounded-xl py-2 text-[10px] tracking-[0.14em] uppercase transition",
                s.shapeType === type ? "bg-white/18 text-white" : "bg-white/5 text-white/40 hover:text-white/70",
              )}
            >
              {type}
            </button>
          ))}
        </div>
        <Toggle label="Show tube" value={s.showTube ?? true} onChange={(showTube) => patch({ showTube })} />
        <Slider label="Major radius" value={s.majorRadius} min={0.2} max={1.5} step={0.01} defaultValue={0.58} onChange={(v) => patch({ majorRadius: v })} />
        {s.shapeType !== "blob" && (
          <Slider label="Tube radius" value={s.tubeRadius} min={0.04} max={0.5} step={0.005} defaultValue={0.178} onChange={(v) => patch({ tubeRadius: v })} />
        )}
        {s.shapeType === "knot" && (
          <>
            <Slider label="P" value={s.p} min={1} max={8} step={1} defaultValue={2} onChange={(v) => patch({ p: v })} />
            <Slider label="Q" value={s.q} min={1} max={8} step={1} defaultValue={3} onChange={(v) => patch({ q: v })} />
          </>
        )}
        <Slider label="Organic" value={s.organic} min={0} max={0.55} step={0.005} defaultValue={0.13} onChange={(v) => patch({ organic: v })} />
        <div className="flex items-center justify-between border-t border-white/8 pt-3">
          <span className="text-[11px] text-white/50">View angle</span>
          <div className="flex gap-1">
            {ORIENTATION_VIEWS.map((v) => {
              const active =
                Math.abs(s.orientX - v.rx) < 2 &&
                Math.abs(s.orientY - v.ry) < 2 &&
                Math.abs(s.orientZ - v.rz) < 2 &&
                !s.orbitX &&
                !s.orbitY &&
                !s.orbitZ &&
                !s.seesaw;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() =>
                    patch({
                      orientX: v.rx,
                      orientY: v.ry,
                      orientZ: v.rz,
                      orbitX: false,
                      orbitY: false,
                      orbitZ: false,
                      seesaw: false,
                    })
                  }
                  className={cn(
                    "rounded-lg px-2 py-1 text-[10px] font-medium tracking-wide transition",
                    active
                      ? "bg-indigo-500/30 text-white ring-1 ring-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.3)]"
                      : "bg-white/5 text-white/45 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      <Section title="Deformation center">
        <p className="text-[11px] leading-relaxed text-white/35">
          Select any of the 9 anchor points to position the pivot according to the shape geometry.
        </p>
        <NinePointPivot />
      </Section>

      <Section title="Posture & silhouette">
        <p className="text-[11px] leading-relaxed text-white/35">
          Atlas posture controls: asymmetric opening / lean, aperture pinch or dilation, organic breathing, and satellite attention jewel.
        </p>
        <Slider
          label="Asymmetry (open / lean)"
          value={s.asymmetry ?? 0}
          min={-1}
          max={1}
          step={0.01}
          defaultValue={0}
          onChange={(v) => patch({ asymmetry: v })}
        />
        <Slider
          label="Aperture (pinch / dilate)"
          value={s.aperture ?? 0}
          min={-1}
          max={1}
          step={0.01}
          defaultValue={0}
          onChange={(v) => patch({ aperture: v })}
        />
        <Slider
          label="Organic breathing"
          value={s.breathing ?? 0.035}
          min={0}
          max={0.15}
          step={0.005}
          defaultValue={0.035}
          onChange={(v) => patch({ breathing: v })}
        />
        <Toggle
          label="Attention satellite (Needs You)"
          value={s.attentionDot ?? false}
          onChange={(attentionDot) => patch({ attentionDot })}
        />
      </Section>

      <Section title="Bend (360° multi-axis)">
        <p className="text-[11px] leading-relaxed text-white/35">
          Independent curvature up to ±360° across X, Y, and Z axes.
        </p>
        <Slider label="Bend X" value={s.bendX ?? 0} min={-360} max={360} step={1} unit="°" defaultValue={0} onChange={(v) => patch({ bendX: v })} />
        <Slider label="Bend Y" value={s.bendY ?? 0} min={-360} max={360} step={1} unit="°" defaultValue={0} onChange={(v) => patch({ bendY: v })} />
        <Slider label="Bend Z" value={s.bendZ ?? 0} min={-360} max={360} step={1} unit="°" defaultValue={0} onChange={(v) => patch({ bendZ: v })} />
        <Toggle label="Animate bend" value={s.animateBend} onChange={(v) => patch({ animateBend: v })} />
      </Section>

      <Section title="Stretch & compress">
        <Row label="Stretch axis">
          <AxisPicker value={s.stretchAxis} onChange={(stretchAxis) => patch({ stretchAxis })} />
        </Row>
        <Slider label="Stretch" value={s.stretch} min={0.4} max={2} step={0.01} defaultValue={1} onChange={(v) => patch({ stretch: v })} />
        <Slider label="Compress" value={s.compress} min={0} max={0.7} step={0.01} defaultValue={0} onChange={(v) => patch({ compress: v })} />
        <Row label="Taper axis">
          <AxisPicker value={s.taperAxis} onChange={(taperAxis) => patch({ taperAxis })} />
        </Row>
        <Slider label="Taper" value={s.taper} min={-1.6} max={1.6} step={0.01} defaultValue={0.12} onChange={(v) => patch({ taper: v })} />
        <Toggle label="Animate taper" value={s.animateTaper} onChange={(v) => patch({ animateTaper: v })} />
      </Section>

      <Section title="Twist">
        <Row label="Axis">
          <AxisPicker value={s.twistAxis} onChange={(twistAxis) => patch({ twistAxis })} />
        </Row>
        <Slider label="Amount" value={s.twist} min={-720} max={720} step={1} unit="°" defaultValue={0} onChange={(v) => patch({ twist: v })} />
        <Toggle label="Animate twist" value={s.animateTwist} onChange={(v) => patch({ animateTwist: v })} />
      </Section>

      <Section title="Wave">
        <Row label="Direction">
          <AxisPicker value={s.waveAxis} onChange={(waveAxis) => patch({ waveAxis })} />
        </Row>
        <Slider label="Amount" value={s.waveAmount} min={0} max={0.55} step={0.005} defaultValue={0} onChange={(v) => patch({ waveAmount: v })} />
        <Slider label="Speed" value={s.waveSpeed} min={0} max={3} step={0.01} defaultValue={0.8} onChange={(v) => patch({ waveSpeed: v })} />
        <Toggle label="Traveling wave" value={s.animateWave} onChange={(v) => patch({ animateWave: v })} />
      </Section>

      <Section title="Noise">
        <Slider label="Noise" value={s.noise} min={0} max={0.7} step={0.005} defaultValue={0.035} onChange={(v) => patch({ noise: v })} />
        <Slider label="Noise scale" value={s.noiseScale} min={0.2} max={6} step={0.05} defaultValue={1.6} onChange={(v) => patch({ noiseScale: v })} />
        <Toggle label="Flowing noise" value={s.animateNoise} onChange={(v) => patch({ animateNoise: v })} />
        <Slider label="Revolve speed" value={s.revolve} min={0} max={3} step={0.01} defaultValue={0} onChange={(v) => patch({ revolve: v })} />
      </Section>
    </AccordionGroup>
  );
}
