import type { PanelTab } from "@/lib/sophia/types";
import { useSophiaStore } from "@/store/sophiaStore";
import { STATE_LABELS } from "@/lib/sophia/presets";
import { cn } from "@/lib/utils";
import PresenceTab from "./studio/PresenceTab";
import ShapeTab from "./studio/ShapeTab";
import MotionTab from "./studio/MotionTab";
import LookTab from "./studio/LookTab";
import PresetsTab from "./studio/PresetsTab";

const TABS: { id: PanelTab; label: string }[] = [
  { id: "presence", label: "Presence" },
  { id: "shape", label: "Shape" },
  { id: "motion", label: "Motion" },
  { id: "look", label: "Look" },
  { id: "presets", label: "Presets" },
];

export default function SettingsPanel() {
  const open = useSophiaStore((s) => s.settingsOpen);
  const tab = useSophiaStore((s) => s.activeTab);
  const voiceState = useSophiaStore((s) => s.voiceState);
  const unsaved = useSophiaStore((s) => s.unsaved);
  const patch = useSophiaStore((s) => s.patch);

  if (!open) return null;

  return (
    <aside className="panel-enter pointer-events-auto absolute top-0 left-0 z-40 flex h-full w-[min(420px,100vw)] flex-col border-r border-white/10 bg-[#070714]/92 shadow-[20px_0_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
      <header className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] tracking-[0.32em] text-white/35 uppercase">Studio</p>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span className="text-[10px] font-medium tracking-wide text-indigo-300">
              {STATE_LABELS[voiceState] || voiceState}
            </span>
          </div>
          <div className="flex items-center gap-2.5 mt-0.5">
            <h2 className="text-[18px] font-light tracking-[0.18em] text-white">SOPHIA</h2>
            <span
              className={cn(
                "text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors",
                unsaved
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/20"
                  : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
              )}
            >
              {unsaved ? "Saving..." : "Saved ✓"}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => patch({ settingsOpen: false })}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/60 hover:text-white transition"
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
              onClick={() => patch({ activeTab: t.id })}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] tracking-wide whitespace-nowrap transition",
                tab === t.id ? "bg-white/15 text-white" : "text-white/40 hover:bg-white/5 hover:text-white/70",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="sophia-scroll flex-1 space-y-6 overflow-y-auto px-5 pt-2 pb-10">
          {tab === "presence" && <PresenceTab />}
          {tab === "shape" && <ShapeTab />}
          {tab === "motion" && <MotionTab />}
          {tab === "look" && <LookTab />}
          {tab === "presets" && <PresetsTab />}
        </div>
      </aside>
    );
  }
