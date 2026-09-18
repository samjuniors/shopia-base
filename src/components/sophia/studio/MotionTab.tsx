import type { SeesawMode } from "@/lib/sophia/types";
import { useSophiaStore } from "@/store/sophiaStore";
import { cn } from "@/lib/utils";
import { AccordionGroup, DirPicker, Row, Section, SectionActionBar, Slider, Toggle } from "./controls";

export const ORIENTATION_VIEWS = [
  { id: "front", label: "Front", rx: 0, ry: 0, rz: 0 },
  { id: "side", label: "Side", rx: 0, ry: 90, rz: 0 },
  { id: "left", label: "Left", rx: 0, ry: -90, rz: 0 },
  { id: "top", label: "Top", rx: 90, ry: 0, rz: 0 },
  { id: "angle", label: "3/4 View", rx: 14, ry: -10, rz: -6 },
] as const;

const ANIM_PIVOT_POINTS = [
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

function AnimNinePointPivot() {
  const s = useSophiaStore();
  const patch = s.patch;
  const r = s.majorRadius || 0.58;

  const activePoint = ANIM_PIVOT_POINTS.find((pt) => {
    const targetX = pt.gx * r;
    const targetY = pt.gy * r;
    return Math.abs(s.animPivotX - targetX) < 0.06 && Math.abs(s.animPivotY - targetY) < 0.06;
  });

  return (
    <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="relative flex h-32 w-32 items-center justify-center">
        <div className="pointer-events-none absolute inset-3 rounded-full border border-dashed border-violet-400/25" />
        <div className="pointer-events-none absolute h-full w-[1px] bg-white/5" />
        <div className="pointer-events-none absolute h-[1px] w-full bg-white/5" />

        <div className="relative z-10 grid grid-cols-3 gap-5">
          {ANIM_PIVOT_POINTS.map((pt) => {
            const targetX = Math.round(pt.gx * r * 100) / 100;
            const targetY = Math.round(pt.gy * r * 100) / 100;
            const isActive =
              Math.abs(s.animPivotX - targetX) < 0.06 && Math.abs(s.animPivotY - targetY) < 0.06;

            return (
              <button
                key={pt.id}
                type="button"
                aria-label={`Animation Pivot ${pt.label}`}
                title={`${pt.label} (${targetX}, ${targetY})`}
                onClick={() => patch({ animPivotX: targetX, animPivotY: targetY, animPivotZ: 0 })}
                className={cn(
                  "group relative flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200",
                  isActive
                    ? "bg-violet-500/30 ring-2 ring-violet-400"
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

      <div className="mt-2 flex w-full items-center justify-between border-t border-white/8 pt-2.5 text-[11px]">
        <div className="flex flex-col">
          <span className="font-medium tracking-wide text-white/80">
            {activePoint ? activePoint.label : "Custom"}
          </span>
          <span className="font-mono text-[10px] text-white/40">
            X: {s.animPivotX.toFixed(2)} / Y: {s.animPivotY.toFixed(2)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => patch({ animPivotX: 0, animPivotY: 0, animPivotZ: 0 })}
          className={cn(
            "rounded-lg px-2.5 py-1 text-[10px] font-medium tracking-wide transition",
            s.animPivotX === 0 && s.animPivotY === 0 && s.animPivotZ === 0
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

export default function MotionTab() {
  const s = useSophiaStore();
  const patch = s.patch;

  return (
    <AccordionGroup>
      <SectionActionBar section="motion" title="Motion" />

      <Section title="Orientation">
        <p className="text-[11px] leading-relaxed text-white/35">
          View from front, side, top, or left. Continuous spin is optional.
        </p>
        <div className="grid grid-cols-5 gap-1.5 pb-1">
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
                  "rounded-xl py-2 text-center text-[10px] font-medium tracking-wide transition",
                  active
                    ? "bg-indigo-500/30 text-white ring-1 ring-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.3)]"
                    : "border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white",
                )}
              >
                {v.label}
              </button>
            );
          })}
        </div>
        <Slider label="Rotate X" value={s.orientX} min={-180} max={180} step={1} unit="°" defaultValue={12} onChange={(v) => patch({ orientX: v })} />
        <Slider label="Rotate Y" value={s.orientY} min={-180} max={180} step={1} unit="°" defaultValue={-8} onChange={(v) => patch({ orientY: v })} />
        <Slider label="Rotate Z" value={s.orientZ} min={-180} max={180} step={1} unit="°" defaultValue={-5} onChange={(v) => patch({ orientZ: v })} />
        <button
          type="button"
          className="w-full rounded-xl border border-white/10 py-2 text-[11px] tracking-wide text-white/55 hover:text-white"
          onClick={() => patch({ orientX: 0, orientY: 0, orientZ: 0 })}
        >
          Reset orientation
        </button>
      </Section>

      <Section title="Continuous rotation">
        <Toggle label="Spin X" value={s.orbitX} onChange={(v) => patch({ orbitX: v })} />
        <Slider label="Speed X" value={s.orbitSpeedX} min={0} max={1.5} step={0.01} defaultValue={0.12} onChange={(v) => patch({ orbitSpeedX: v })} />
        <Row label="Direction X">
          <DirPicker value={s.orbitDirX} onChange={(orbitDirX) => patch({ orbitDirX })} />
        </Row>
        <Toggle label="Spin Y" value={s.orbitY} onChange={(v) => patch({ orbitY: v })} />
        <Slider label="Speed Y" value={s.orbitSpeedY} min={0} max={1.5} step={0.01} defaultValue={0.07} onChange={(v) => patch({ orbitSpeedY: v })} />
        <Row label="Direction Y">
          <DirPicker value={s.orbitDirY} onChange={(orbitDirY) => patch({ orbitDirY })} />
        </Row>
        <Toggle label="Spin Z" value={s.orbitZ} onChange={(v) => patch({ orbitZ: v })} />
        <Slider label="Speed Z" value={s.orbitSpeedZ} min={0} max={1.5} step={0.01} defaultValue={0.1} onChange={(v) => patch({ orbitSpeedZ: v })} />
        <Row label="Direction Z">
          <DirPicker value={s.orbitDirZ} onChange={(orbitDirZ) => patch({ orbitDirZ })} />
        </Row>
      </Section>

      <Section title="Seesaw & oscillation">
        <Toggle label="Oscillate (Seesaw)" value={s.seesaw} onChange={(v) => patch({ seesaw: v })} />

        <Row label="Swing mode">
          <div className="flex gap-1">
            {[
              { id: "dual", label: "Dual (±)" },
              { id: "positive", label: "Pos (+)" },
              { id: "negative", label: "Neg (-)" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => patch({ seesawMode: m.id as SeesawMode })}
                className={cn(
                  "h-7 rounded-md px-2 text-[10px] tracking-wider uppercase transition",
                  (s.seesawMode ?? "dual") === m.id ? "bg-white/20 text-white" : "bg-white/5 text-white/40 hover:text-white/70",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </Row>

        <Row label="Direction">
          <DirPicker value={s.seesawDir ?? 1} onChange={(seesawDir) => patch({ seesawDir })} />
        </Row>

        <Slider
          label="Oscillation speed"
          value={s.seesawSpeed ?? 1.0}
          min={0.1}
          max={4.0}
          step={0.05}
          defaultValue={1.0}
          onChange={(v) => patch({ seesawSpeed: v })}
        />

        <div className="pt-2 border-t border-white/8 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium tracking-[0.16em] uppercase text-white/40">Multi-axis amplitude</span>
            <div className="flex gap-1">
              {[
                { label: "Rock X", x: 18, y: 0, z: 0 },
                { label: "Yaw Y", x: 0, y: 22, z: 0 },
                { label: "Roll Z", x: 0, y: 0, z: 20 },
                { label: "3D", x: 16, y: 14, z: 12 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => patch({ seesaw: true, seesawAmountX: p.x, seesawAmountY: p.y, seesawAmountZ: p.z })}
                  className="rounded px-1.5 py-0.5 text-[9px] font-medium bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <Slider
            label="Amplitude X"
            value={s.seesawAmountX ?? 0}
            min={-180}
            max={180}
            step={1}
            unit="°"
            defaultValue={16}
            onChange={(v) => patch({ seesawAmountX: v })}
          />
          <Slider
            label="Amplitude Y"
            value={s.seesawAmountY ?? 0}
            min={-180}
            max={180}
            step={1}
            unit="°"
            defaultValue={0}
            onChange={(v) => patch({ seesawAmountY: v })}
          />
          <Slider
            label="Amplitude Z"
            value={s.seesawAmountZ ?? 0}
            min={-180}
            max={180}
            step={1}
            unit="°"
            defaultValue={0}
            onChange={(v) => patch({ seesawAmountZ: v })}
          />
        </div>
      </Section>

      <Section title="Animation pivot anchor">
        <p className="text-[11px] leading-relaxed text-white/35">
          Anchor point around which rotation, seesaw, and motion swing (e.g. metronome bottom vs clock pendulum top).
        </p>
        <AnimNinePointPivot />
        <Slider label="Anim Pivot X" value={s.animPivotX ?? 0} min={-1.5} max={1.5} step={0.01} defaultValue={0} onChange={(v) => patch({ animPivotX: v })} />
        <Slider label="Anim Pivot Y" value={s.animPivotY ?? 0} min={-1.5} max={1.5} step={0.01} defaultValue={0} onChange={(v) => patch({ animPivotY: v })} />
        <Slider label="Anim Pivot Z" value={s.animPivotZ ?? 0} min={-1.5} max={1.5} step={0.01} defaultValue={0} onChange={(v) => patch({ animPivotZ: v })} />
      </Section>

      <Section title="Life">
        <Toggle label="Float / breathe" value={s.float} onChange={(v) => patch({ float: v })} />
      </Section>

      <Section title="Recipes">
        <div className="grid grid-cols-2 gap-1.5">
          {[
            {
              name: "Seesaw X",
              apply: () => patch({ seesaw: true, seesawAmountX: 18, seesawAmountY: 0, seesawAmountZ: 0, seesawDir: 1, orbitY: false }),
            },
            {
              name: "Slow Y",
              apply: () => patch({ orbitY: true, orbitSpeedY: 0.07, orbitX: false, orbitZ: false, seesaw: false }),
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
            {
              name: "Gentle tilt",
              apply: () => patch({ orientX: 14, orientY: -10, orientZ: -6, orbitY: true, orbitSpeedY: 0.05 }),
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
    </AccordionGroup>
  );
}
