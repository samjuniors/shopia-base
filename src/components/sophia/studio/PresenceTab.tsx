import { STATE_META } from "@/lib/sophia/captions";
import { VOICE_STATES } from "@/lib/sophia/types";
import { STATE_LABELS } from "@/lib/sophia/presets";
import { useSophiaStore } from "@/store/sophiaStore";
import { cn } from "@/lib/utils";
import { AccordionGroup, Section, SectionActionBar, Slider, Toggle } from "./controls";

export default function PresenceTab() {
  const s = useSophiaStore();
  const patch = s.patch;

  return (
    <AccordionGroup>
      <SectionActionBar section="presence" title="Presence" />

      <Section title="Voice state">
        <div className="grid grid-cols-2 gap-2">
          {VOICE_STATES.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => s.setVoiceState(id)}
              className={cn(
                "rounded-2xl border px-3 py-3 text-left transition",
                s.voiceState === id
                  ? "border-violet-400/50 bg-violet-500/15 shadow-[0_0_24px_rgba(139,92,246,0.25)]"
                  : "border-white/8 bg-white/4 hover:border-white/15",
              )}
            >
              <div className="text-[13px] font-medium tracking-wide text-white">{STATE_LABELS[id]}</div>
              <div className="mt-1 text-[10px] leading-snug text-white/40">{STATE_META[id].studio}</div>
            </button>
          ))}
        </div>
        <p className="text-[11px] leading-relaxed text-white/35">
          Preview loads the preset assigned to that state. States change Sophia's shape, motion, and light — not a
          separate model.
        </p>
      </Section>

      <Section title="Live input">
        <Toggle label="Use microphone" value={s.micEnabled} onChange={() => s.toggleMic()} />
        {s.micError && <p className="text-[11px] text-rose-300/80">Microphone permission was denied.</p>}
        <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-fuchsia-400 transition-[width] duration-75"
            style={{ width: `${Math.min(100, s.audioLevel * 140)}%` }}
          />
        </div>
      </Section>

      <Section title="Runtime">
        <p className="text-[11px] leading-relaxed text-white/40">
          Status reflects whether Sophia has a usable presence path — not just the network. Current:{" "}
          <span className="text-white/80 uppercase tracking-wider">{s.runtimeStatus}</span>
          {s.micError ? " · mic unavailable" : ""}.
        </p>
      </Section>

      <Section title="Global speed">
        <Slider label="Animation speed" value={s.speed} min={0.05} max={2.4} step={0.01} defaultValue={0.45} onChange={(v) => patch({ speed: v })} />
      </Section>

      <Section title="Camera">
        <Toggle label="Inspect mode (orbit drag)" value={s.inspectMode} onChange={(v) => patch({ inspectMode: v })} />
        <p className="text-[11px] leading-relaxed text-white/35">
          Click Sophia to listen or pause. Space does the same. The deformation pivot is visible here in the studio.
        </p>
      </Section>
    </AccordionGroup>
  );
}
