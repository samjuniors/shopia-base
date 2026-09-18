import { useMemo, useRef } from "react";
import { STATE_LABELS } from "@/lib/sophia/presets";
import { VOICE_STATES, type VoiceState } from "@/lib/sophia/types";
import { useSophiaStore } from "@/store/sophiaStore";
import { cn } from "@/lib/utils";
import { Section } from "./controls";

export default function PresetsTab() {
  const s = useSophiaStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const presets = s.allPresets();
  const statePresets = useMemo(() => presets.filter((p) => p.role === "state" || p.id.startsWith("state-")), [presets]);
  const lookPresets = useMemo(() => presets.filter((p) => p.role !== "state" && !p.id.startsWith("state-") && p.builtin), [presets]);
  const custom = s.customPresets;
  const active = presets.find((p) => p.id === s.activePreset);
  const isCustom = Boolean(custom.find((p) => p.id === s.activePreset));

  return (
    <>
      <Section title="Assigned to states">
        <p className="text-[11px] leading-relaxed text-white/35">
          Each Sophia state simply loads its assigned preset. Edit the preset, don't hard-code a new shape.
        </p>
        <div className="space-y-1.5">
          {VOICE_STATES.map((st) => (
            <div key={st} className="flex items-center gap-2">
              <span className="w-[7.5rem] shrink-0 text-[11px] tracking-wide text-white/55">{STATE_LABELS[st]}</span>
              <select
                value={s.stateAssignments[st]}
                onChange={(e) => s.assignPresetToState(st, e.target.value)}
                className="h-8 min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-2 text-[11px] text-white outline-none"
              >
                {presets.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#0c0d1c]">
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => s.setVoiceState(st as VoiceState)}
                className={cn(
                  "h-8 rounded-lg px-2 text-[10px] tracking-wide uppercase",
                  s.voiceState === st ? "bg-white/20 text-white" : "bg-white/5 text-white/45 hover:text-white",
                )}
              >
                View
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => s.resetAssignments()}
          className="w-full rounded-xl border border-white/10 py-2 text-[11px] text-white/45 hover:text-white"
        >
          Reset state assignments
        </button>
      </Section>

      <Section title="State presets">
        <div className="grid grid-cols-2 gap-2">
          {statePresets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => s.applyPreset(p.id)}
              className={cn(
                "rounded-2xl border px-3 py-3 text-left transition",
                s.activePreset === p.id ? "border-violet-400/50 bg-violet-500/15" : "border-white/8 bg-white/4 hover:border-white/16",
              )}
            >
              <div className="text-[12px] text-white/90">{p.name}</div>
              <div className="mt-1 text-[10px] text-white/35">Preview live</div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Looks">
        <div className="grid grid-cols-2 gap-2">
          {lookPresets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => s.applyPreset(p.id)}
              className={cn(
                "rounded-2xl border px-3 py-3 text-left transition",
                s.activePreset === p.id ? "border-violet-400/50 bg-violet-500/15" : "border-white/8 bg-white/4 hover:border-white/16",
              )}
            >
              <div className="mb-2 flex gap-1">
                {p.swatches?.map((c) => (
                  <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />
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
            onChange={(e) => s.patch({ presetName: e.target.value })}
            placeholder="Name this look"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white outline-none placeholder:text-white/25"
          />
          <button
            type="button"
            onClick={() => s.createPreset(s.presetName)}
            className="rounded-xl bg-violet-500 px-3 py-2 text-[12px] font-medium text-white hover:bg-violet-400"
          >
            Create
          </button>
        </div>
        {s.unsaved && (
          <p className="text-[11px] text-amber-200/70">Unsaved edits on {active?.name ?? "this look"}.</p>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => s.updatePreset()}
            className="rounded-xl border border-white/10 py-2 text-[11px] text-white/70 hover:text-white"
          >
            Update current
          </button>
          <button
            type="button"
            onClick={() => s.duplicatePreset(s.activePreset)}
            className="rounded-xl border border-white/10 py-2 text-[11px] text-white/70 hover:text-white"
          >
            Duplicate
          </button>
          <button
            type="button"
            onClick={() => s.resetPreset(s.activePreset)}
            className="rounded-xl border border-white/10 py-2 text-[11px] text-white/70 hover:text-white"
          >
            Reset preset
          </button>
          <button
            type="button"
            onClick={() => {
              if (isCustom) s.deletePreset(s.activePreset);
            }}
            className={cn(
              "rounded-xl border border-white/10 py-2 text-[11px]",
              isCustom ? "text-white/70 hover:text-rose-300" : "text-white/25",
            )}
            disabled={!isCustom}
          >
            Delete
          </button>
        </div>
        {custom.length === 0 && (
          <p className="text-[11px] text-white/35">Sculpt a shape, then save it. Stored on this device.</p>
        )}
        <div className="space-y-1.5">
          {custom.map((p) => (
            <div
              key={p.id}
              className={cn(
                "flex items-center justify-between rounded-xl border px-3 py-2",
                s.activePreset === p.id ? "border-violet-400/40 bg-violet-500/10" : "border-white/8 bg-white/4",
              )}
            >
              {s.renamingId === p.id ? (
                <input
                  autoFocus
                  defaultValue={p.name}
                  className="mr-2 flex-1 rounded-md bg-white/10 px-2 py-1 text-[12px] text-white outline-none"
                  onBlur={(e) => s.renamePreset(p.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") s.renamePreset(p.id, (e.target as HTMLInputElement).value);
                    if (e.key === "Escape") s.patch({ renamingId: null });
                  }}
                />
              ) : (
                <button type="button" className="flex-1 text-left text-[12px] text-white/90" onClick={() => s.applyPreset(p.id)}>
                  {p.name}
                </button>
              )}
              <div className="flex gap-2">
                <button type="button" className="text-[11px] text-white/35 hover:text-white" onClick={() => s.patch({ renamingId: p.id })}>
                  Rename
                </button>
                <button type="button" className="text-[11px] text-white/30 hover:text-rose-300" onClick={() => s.deletePreset(p.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            className="flex-1 rounded-xl border border-white/10 py-2 text-[11px] text-white/60 hover:text-white"
            onClick={() => {
              const blob = new Blob([JSON.stringify(s.customPresets, null, 2)], { type: "application/json" });
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
          Reset to Sophia idle
        </button>
      </Section>
    </>
  );
}
