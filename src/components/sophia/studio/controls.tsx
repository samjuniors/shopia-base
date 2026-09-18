import { createContext, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Axis } from "@/lib/sophia/types";
import { useSophiaStore, type StudioSection } from "@/store/sophiaStore";

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit = "",
  defaultValue,
  onReset,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit?: string;
  defaultValue?: number;
  onReset?: () => void;
}) {
  const digits = step < 1 ? 2 : 0;
  const defVal = defaultValue !== undefined ? defaultValue : (min <= 0 && max >= 0 ? 0 : min);
  const isModified = Math.abs(value - defVal) > (step < 0.01 ? 0.0001 : 0.005);

  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onReset) {
      onReset();
    } else {
      onChange(defVal);
    }
  };

  return (
    <label className="block space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] tracking-wide text-white/50">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] text-white/80">
            {value.toFixed(digits)}
            {unit}
          </span>
          <button
            type="button"
            aria-label={`Reset ${label} to ${defVal}${unit}`}
            title={`Reset ${label} to default (${defVal}${unit})`}
            onClick={handleReset}
            className={cn(
              "group/reset flex h-4 w-4 items-center justify-center rounded transition-all duration-150",
              isModified
                ? "text-indigo-400/90 hover:bg-indigo-500/20 hover:text-indigo-200"
                : "text-white/20 hover:bg-white/10 hover:text-white/60",
            )}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn("transition-transform duration-200", isModified && "group-hover/reset:-rotate-45")}
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        </div>
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

export function Toggle({
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
      <span className={cn("relative h-5 w-9 rounded-full p-0.5 transition-colors", value ? "bg-violet-500" : "bg-white/10")}>
        <span className={cn("block h-4 w-4 rounded-full bg-white shadow transition-transform", value && "translate-x-4")} />
      </span>
    </button>
  );
}

export function AxisPicker({ value, onChange }: { value: Axis; onChange: (a: Axis) => void }) {
  return (
    <div className="flex gap-1">
      {(["x", "y", "z"] as Axis[]).map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => onChange(a)}
          className={cn(
            "h-7 w-7 rounded-md text-[11px] font-semibold uppercase tracking-wider transition",
            value === a ? "bg-white/20 text-white" : "bg-white/5 text-white/40 hover:text-white/70",
          )}
        >
          {a}
        </button>
      ))}
    </div>
  );
}

export function DirPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[
        { id: 1, label: "Fwd" },
        { id: -1, label: "Rev" },
      ].map((d) => (
        <button
          key={d.id}
          type="button"
          onClick={() => onChange(d.id)}
          className={cn(
            "h-7 rounded-md px-2 text-[10px] tracking-wider uppercase transition",
            value === d.id ? "bg-white/20 text-white" : "bg-white/5 text-white/40 hover:text-white/70",
          )}
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}

export function ColorField({
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
      <input type="color" className="sophia-color" value={value} onChange={(e) => onChange(e.target.value)} />
      <span className="text-[10px] tracking-wide text-white/40">{label}</span>
    </label>
  );
}

interface AccordionContextType {
  collapsedMap: Record<string, boolean>;
  toggle: (id: string, defaultOpen: boolean) => void;
  collapseAll: () => void;
  expandAll: () => void;
  allCollapsed: boolean;
}

const AccordionContext = createContext<AccordionContextType | null>(null);

export function AccordionGroup({ children }: { children: ReactNode }) {
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});
  const [allCollapsed, setAllCollapsed] = useState(false);

  const toggle = (id: string, defaultOpen: boolean) => {
    setCollapsedMap((prev) => {
      const current = prev[id] !== undefined ? prev[id] : (allCollapsed ? true : !defaultOpen);
      return { ...prev, [id]: !current };
    });
  };

  const collapseAll = () => {
    setAllCollapsed(true);
    setCollapsedMap({});
  };

  const expandAll = () => {
    setAllCollapsed(false);
    setCollapsedMap({});
  };

  return (
    <AccordionContext.Provider
      value={{
        collapsedMap,
        toggle,
        collapseAll,
        expandAll,
        allCollapsed,
      }}
    >
      <div className="space-y-2.5">{children}</div>
    </AccordionContext.Provider>
  );
}

export function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const ctx = useContext(AccordionContext);
  const [localCollapsed, setLocalCollapsed] = useState(!defaultOpen);

  const isCollapsed = ctx
    ? ctx.allCollapsed
      ? ctx.collapsedMap[title] === false
        ? false
        : true
      : ctx.collapsedMap[title] !== undefined
        ? ctx.collapsedMap[title]
        : !defaultOpen
    : localCollapsed;

  const handleToggle = () => {
    if (ctx) {
      ctx.toggle(title, defaultOpen);
    } else {
      setLocalCollapsed(!localCollapsed);
    }
  };

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden transition-all duration-200 shadow-sm">
      <button
        type="button"
        onClick={handleToggle}
        className="group flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
      >
        <span className="text-[10px] font-semibold tracking-[0.2em] text-white/50 uppercase group-hover:text-white/85 transition-colors">
          {title}
        </span>
        <div className="flex items-center gap-1.5 text-white/35 group-hover:text-white/70">
          <span className="text-[9px] font-mono uppercase tracking-wider text-white/30 group-hover:text-white/60">
            {!isCollapsed ? "Hide" : "Show"}
          </span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("transition-transform duration-200 text-white/40 group-hover:text-white/80", !isCollapsed && "rotate-180")}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </button>
      {!isCollapsed && (
        <div className="space-y-3.5 px-3.5 pb-4 pt-2 border-t border-white/[0.05]">
          {children}
        </div>
      )}
    </div>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] text-white/50">{label}</span>
      {children}
    </div>
  );
}

export function SectionActionBar({
  section,
  title,
}: {
  section: StudioSection;
  title: string;
}) {
  const resetSection = useSophiaStore((s) => s.resetSection);
  const saveSection = useSophiaStore((s) => s.saveSection);
  const loadSavedSection = useSophiaStore((s) => s.loadSavedSection);
  const hasSavedSection = useSophiaStore((s) => s.hasSavedSection);
  const accordion = useContext(AccordionContext);

  const [savedFeedback, setSavedFeedback] = useState(false);
  const [resetFeedback, setResetFeedback] = useState(false);
  const [loadFeedback, setLoadFeedback] = useState(false);
  const hasSaved = hasSavedSection(section);

  const handleSave = () => {
    saveSection(section);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const handleReset = () => {
    resetSection(section);
    setResetFeedback(true);
    setTimeout(() => setResetFeedback(false), 1500);
  };

  const handleLoad = () => {
    const ok = loadSavedSection(section);
    if (ok) {
      setLoadFeedback(true);
      setTimeout(() => setLoadFeedback(false), 1500);
    }
  };

  return (
    <div className="flex items-center justify-between pb-2.5 mb-3.5 border-b border-white/10">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-white/70">
          {title}
        </span>
        {resetFeedback && (
          <span className="text-[10px] text-amber-300 font-mono tracking-wide animate-pulse">
            Reset to defaults
          </span>
        )}
        {loadFeedback && (
          <span className="text-[10px] text-indigo-300 font-mono tracking-wide animate-pulse">
            Loaded saved
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {accordion && (
          <button
            type="button"
            onClick={accordion.allCollapsed ? accordion.expandAll : accordion.collapseAll}
            title={accordion.allCollapsed ? "Expand all sections" : "Collapse all sections"}
            className="rounded-lg px-2 py-1 text-[10px] font-medium tracking-wide border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition flex items-center gap-1"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {accordion.allCollapsed ? (
                <>
                  <path d="m7 15 5 5 5-5" />
                  <path d="m7 9 5-5 5 5" />
                </>
              ) : (
                <>
                  <path d="m7 11 5-5 5 5" />
                  <path d="m7 13 5 5 5-5" />
                </>
              )}
            </svg>
            <span>{accordion.allCollapsed ? "Expand" : "Collapse"}</span>
          </button>
        )}
        {hasSaved && (
          <button
            type="button"
            onClick={handleLoad}
            title={`Load your saved ${title} settings`}
            className="rounded-lg px-2 py-1 text-[10px] font-medium tracking-wide border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition"
          >
            Load
          </button>
        )}
        <button
          type="button"
          onClick={handleReset}
          title={`Reset ${title} to default settings`}
          className="rounded-lg px-2.5 py-1 text-[10px] font-medium tracking-wide border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleSave}
          title={`Save current ${title} settings`}
          className={cn(
            "rounded-lg px-2.5 py-1 text-[10px] font-medium tracking-wide transition shadow-sm",
            savedFeedback
              ? "bg-emerald-500/80 text-white shadow-emerald-500/20"
              : "bg-indigo-600/80 hover:bg-indigo-500 text-white",
          )}
        >
          {savedFeedback ? "Saved ✓" : "Save"}
        </button>
      </div>
    </div>
  );
}
