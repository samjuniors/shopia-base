import { create } from "zustand";
import type {
  PanelTab,
  RuntimeStatus,
  SavedPreset,
  SophiaSettings,
  StateAssignments,
  VoiceState,
} from "@/lib/sophia/types";
import { VOICE_STATES } from "@/lib/sophia/types";
import {
  BUILTIN_PRESETS,
  DEFAULT_ASSIGNMENTS,
  defaultSettings,
  factoryPreset,
  normalizeSettings,
  pickSettings,
} from "@/lib/sophia/presets";
import { replyTo, STATE_META } from "@/lib/sophia/captions";

const PRESET_KEY = "sophia-custom-presets-v2";
const OVERRIDE_KEY = "sophia-preset-overrides-v2";
const ASSIGN_KEY = "sophia-state-assignments-v2";

export type StudioSection = "shape" | "motion" | "look" | "presence";

export const SECTION_KEYS: Record<StudioSection, (keyof SophiaSettings)[]> = {
  shape: [
    "shapeType",
    "majorRadius",
    "tubeRadius",
    "showTube",
    "p",
    "q",
    "organic",
    "asymmetry",
    "aperture",
    "breathing",
    "attentionDot",
    "pivotX",
    "pivotY",
    "pivotZ",
    "bend",
    "bendAxis",
    "bendX",
    "bendY",
    "bendZ",
    "animateBend",
    "taper",
    "taperAxis",
    "animateTaper",
    "stretch",
    "stretchAxis",
    "compress",
    "twist",
    "twistAxis",
    "animateTwist",
    "waveAmount",
    "waveAxis",
    "waveSpeed",
    "animateWave",
    "noise",
    "noiseScale",
    "animateNoise",
    "revolve",
  ],
  motion: [
    "orientX",
    "orientY",
    "orientZ",
    "speed",
    "orbitX",
    "orbitY",
    "orbitZ",
    "orbitSpeedX",
    "orbitSpeedY",
    "orbitSpeedZ",
    "orbitDirX",
    "orbitDirY",
    "orbitDirZ",
    "seesaw",
    "seesawAxis",
    "seesawAmount",
    "seesawAmountX",
    "seesawAmountY",
    "seesawAmountZ",
    "seesawSpeed",
    "seesawDir",
    "seesawMode",
    "animPivotX",
    "animPivotY",
    "animPivotZ",
    "float",
  ],
  look: [
    "colorA",
    "colorB",
    "colorC",
    "colorD",
    "glow",
    "iridescence",
    "fresnelPower",
    "metalness",
    "roughness",
    "clearcoat",
    "transmission",
    "animateColors",
    "animateGlow",
    "colorSpeed",
    "colorFlowDir",
    "streakOn",
    "streakSpeed",
    "streakIntensity",
    "highlightAmount",
    "keyIntensity",
    "keyColor",
    "fillIntensity",
    "fillColor",
    "rimIntensity",
    "rimColor",
    "ambientIntensity",
    "bloomIntensity",
    "bloomThreshold",
    "bloomSmoothing",
    "particlesOn",
    "particleAmount",
    "particleSize",
    "particleBrightness",
    "particleSpeed",
    "particleSpread",
    "particleDrift",
    "particleOpacity",
    "ringsOn",
    "ringCount",
    "ringRadius",
    "ringOpacity",
    "ringSpeed",
    "ringAxis",
    "ringDirection",
    "ringGlow",
  ],
  presence: ["speed"],
};

function canUseStorage() {
  return typeof window !== "undefined";
}

function loadJSON<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown) {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

function loadCustomPresets(): SavedPreset[] {
  const parsed = loadJSON<SavedPreset[]>(PRESET_KEY, []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((p) => p && p.name && p.settings)
    .map((p) => ({
      ...p,
      builtin: false,
      settings: normalizeSettings(p.settings),
      origin: p.origin ? normalizeSettings(p.origin) : normalizeSettings(p.settings),
    }));
}

function loadOverrides(): Record<string, Partial<SophiaSettings>> {
  const parsed = loadJSON<Record<string, Partial<SophiaSettings>>>(OVERRIDE_KEY, {});
  return parsed && typeof parsed === "object" ? parsed : {};
}

function loadAssignments(): StateAssignments {
  const parsed = loadJSON<Partial<StateAssignments>>(ASSIGN_KEY, {});
  const custom = loadCustomPresets();
  const assignments: StateAssignments = { ...DEFAULT_ASSIGNMENTS };

  (Object.keys(DEFAULT_ASSIGNMENTS) as (keyof StateAssignments)[]).forEach((st) => {
    const candidate = parsed[st];
    if (candidate) {
      const exists = factoryPreset(candidate) || custom.some((p) => p.id === candidate);
      if (exists) {
        assignments[st] = candidate;
      }
    }
  });
  return assignments;
}

export interface SophiaStore extends SophiaSettings {
  voiceState: VoiceState;
  settingsOpen: boolean;
  typeOpen: boolean;
  infoOpen: boolean;
  activeTab: PanelTab;
  inspectMode: boolean;
  customPresets: SavedPreset[];
  overrides: Record<string, Partial<SophiaSettings>>;
  stateAssignments: StateAssignments;
  activePreset: string;
  audioLevel: number;
  micEnabled: boolean;
  micError: boolean;
  presetName: string;
  spokenCaption: string;
  runtimeStatus: RuntimeStatus;
  unsaved: boolean;
  renamingId: string | null;
  previousActiveState: VoiceState;

  patch: (p: Partial<SophiaStore>) => void;
  setVoiceState: (s: VoiceState, caption?: string) => void;
  interact: () => void;
  applyPreset: (id: string) => void;
  createPreset: (name: string) => void;
  updatePreset: (id?: string) => void;
  renamePreset: (id: string, name: string) => void;
  duplicatePreset: (id: string) => void;
  deletePreset: (id: string) => void;
  resetPreset: (id: string) => void;
  assignPresetToState: (state: VoiceState, presetId: string) => void;
  resetAssignments: () => void;
  importPresets: (presets: SavedPreset[]) => void;
  reset: () => void;
  toggleMic: () => void;
  submitUtterance: (text: string) => void;
  cancelUtterance: () => void;
  allPresets: () => SavedPreset[];
  resolvePreset: (id: string) => SavedPreset | undefined;
  resetSection: (section: StudioSection) => void;
  saveSection: (section: StudioSection) => void;
  loadSavedSection: (section: StudioSection) => boolean;
  hasSavedSection: (section: StudioSection) => boolean;
}

let utteranceGen = 0;
let lastInteractTime = 0;
const utteranceTimers: number[] = [];
let autoSaveTimer: number | null = null;

function clearUtteranceTimers() {
  utteranceGen += 1;
  while (utteranceTimers.length) {
    const id = utteranceTimers.pop();
    if (id) window.clearTimeout(id);
  }
}

function later(gen: number, ms: number, fn: () => void) {
  const id = window.setTimeout(() => {
    if (gen !== utteranceGen) return;
    fn();
  }, ms);
  utteranceTimers.push(id);
}

export const useSophiaStore = create<SophiaStore>((set, get) => {
  const resolvePreset = (id: string): SavedPreset | undefined => {
    const custom = get().customPresets.find((p) => p.id === id);
    if (custom) return custom;
    const builtin = factoryPreset(id);
    if (!builtin) return undefined;
    const override = get().overrides[builtin.id] || get().overrides[id];
    if (!override) return builtin;
    return { ...builtin, settings: normalizeSettings({ ...builtin.settings, ...override }) };
  };

  const allPresets = () => {
    const overrides = get().overrides;
    const builtins = BUILTIN_PRESETS.map((p) => {
      const ov = overrides[p.id] || overrides[p.id.replace("_", "-")];
      return ov
        ? { ...p, settings: normalizeSettings({ ...p.settings, ...ov }) }
        : { ...p, settings: normalizeSettings(p.settings) };
    });
    return [...builtins, ...get().customPresets];
  };

  const applySettings = (settings: SophiaSettings, extra: Partial<SophiaStore> = {}) => {
    set({ ...settings, unsaved: false, ...extra });
  };

  return {
    ...defaultSettings,
    voiceState: "idle",
    settingsOpen: false,
    typeOpen: false,
    infoOpen: false,
    activeTab: "presence",
    inspectMode: false,
    customPresets: loadCustomPresets(),
    overrides: loadOverrides(),
    stateAssignments: loadAssignments(),
    activePreset: "state-idle",
    audioLevel: 0,
    micEnabled: false,
    micError: false,
    presetName: "",
    spokenCaption: STATE_META.idle.caption,
    runtimeStatus: "online",
    unsaved: false,
    renamingId: null,
    previousActiveState: "listening",

    allPresets,
    resolvePreset,

    patch: (p) => {
      set((state) => {
        const next = { ...p } as Partial<SophiaStore>;
        const settingTouched = Object.keys(p).some((k) => k in defaultSettings);
        if (settingTouched && next.activePreset === undefined) {
          next.unsaved = true;
        }
        return { ...state, ...next };
      });

      const settingTouched = Object.keys(p).some((k) => k in defaultSettings);
      if (settingTouched && canUseStorage()) {
        if (autoSaveTimer !== null) {
          window.clearTimeout(autoSaveTimer);
        }
        autoSaveTimer = window.setTimeout(() => {
          autoSaveTimer = null;
          get().updatePreset(get().activePreset);
        }, 350);
      }
    },

    setVoiceState: (voiceState, caption) => {
      clearUtteranceTimers();

      // Automatically flush and save any active edits on current preset before switching states
      if (autoSaveTimer !== null) {
        window.clearTimeout(autoSaveTimer);
        autoSaveTimer = null;
      }
      if (get().unsaved) {
        get().updatePreset(get().activePreset);
      }

      const assigned =
        get().stateAssignments[voiceState] ||
        DEFAULT_ASSIGNMENTS[voiceState] ||
        get().stateAssignments.idle ||
        "state-idle";
      const preset =
        resolvePreset(assigned) ||
        resolvePreset(DEFAULT_ASSIGNMENTS[voiceState] || "state-idle") ||
        factoryPreset("state-idle");
      const settings = preset ? normalizeSettings(preset.settings) : pickSettings(get());
      const meta = STATE_META[voiceState] || STATE_META.idle;
      set({
        ...settings,
        voiceState,
        activePreset: preset?.id ?? get().activePreset,
        spokenCaption: caption ?? meta.caption,
        unsaved: false,
        micEnabled: voiceState === "listening" ? get().micEnabled : false,
      });

      // Transient state 08 - Completed automatically returns to Idle
      if (voiceState === "completed") {
        const gen = utteranceGen;
        later(gen, 1800, () => {
          if (get().voiceState === "completed") {
            get().setVoiceState("idle");
          }
        });
      }
    },

    interact: () => {
      const now = Date.now();
      if (now - lastInteractTime < 220) return;
      lastInteractTime = now;
      clearUtteranceTimers();
      const s = get().voiceState;

      // Resuming from Paused state restores previous active state
      if (s === "paused") {
        const resumeState = get().previousActiveState || "listening";
        get().setVoiceState(resumeState === "paused" ? "listening" : resumeState);
        return;
      }

      // Activating from Idle or Completed starts Listening
      if (s === "idle" || s === "completed") {
        set({ previousActiveState: "listening" });
        get().setVoiceState("listening");
        return;
      }

      // Pausing from an active state (listening, working, speaking, needs_you, blocked)
      set({ previousActiveState: s, micEnabled: false });
      get().setVoiceState("paused");
    },

    applyPreset: (id) => {
      if (autoSaveTimer !== null) {
        window.clearTimeout(autoSaveTimer);
        autoSaveTimer = null;
      }
      if (get().unsaved) {
        get().updatePreset(get().activePreset);
      }
      const preset = resolvePreset(id);
      if (!preset) return;
      applySettings(normalizeSettings(preset.settings), {
        activePreset: id,
        unsaved: false,
      });
    },

    createPreset: (name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const settings = pickSettings(get());
      const preset: SavedPreset = {
        id: `c-${Date.now().toString(36)}`,
        name: trimmed,
        settings,
        origin: settings,
        swatches: [settings.colorA, settings.colorB, settings.colorC],
      };
      const customPresets = [...get().customPresets, preset];
      saveJSON(PRESET_KEY, customPresets);
      set({ customPresets, activePreset: preset.id, presetName: "", unsaved: false });
    },

    updatePreset: (id) => {
      const target = id ?? get().activePreset;
      const settings = pickSettings(get());
      const custom = get().customPresets.find((p) => p.id === target);
      if (custom) {
        const customPresets = get().customPresets.map((p) =>
          p.id === target
            ? { ...p, settings, swatches: [settings.colorA, settings.colorB, settings.colorC] as [string, string, string] }
            : p,
        );
        saveJSON(PRESET_KEY, customPresets);
        set({ customPresets, activePreset: target, unsaved: false });
        return;
      }
      const factory = factoryPreset(target);
      if (!factory) return;
      const canonicalId = factory.id;
      const overrides = { ...get().overrides, [canonicalId]: settings };
      if (canonicalId !== target) {
        overrides[target] = settings;
      }
      saveJSON(OVERRIDE_KEY, overrides);
      set({ overrides, activePreset: canonicalId, unsaved: false });
    },

    renamePreset: (id, name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const customPresets = get().customPresets.map((p) => (p.id === id ? { ...p, name: trimmed } : p));
      saveJSON(PRESET_KEY, customPresets);
      set({ customPresets, renamingId: null });
    },

    duplicatePreset: (id) => {
      const preset = resolvePreset(id);
      if (!preset) return;
      const settings = normalizeSettings(preset.settings);
      const copy: SavedPreset = {
        id: `c-${Date.now().toString(36)}`,
        name: `${preset.name} copy`,
        settings,
        origin: settings,
        swatches: [settings.colorA, settings.colorB, settings.colorC],
      };
      const customPresets = [...get().customPresets, copy];
      saveJSON(PRESET_KEY, customPresets);
      applySettings(settings, { customPresets, activePreset: copy.id, unsaved: false });
    },

    deletePreset: (id) => {
      const customPresets = get().customPresets.filter((p) => p.id !== id);
      saveJSON(PRESET_KEY, customPresets);
      const stateAssignments = { ...get().stateAssignments };
      let changed = false;
      (Object.keys(stateAssignments) as VoiceState[]).forEach((st) => {
        if (stateAssignments[st] === id) {
          stateAssignments[st] = DEFAULT_ASSIGNMENTS[st];
          changed = true;
        }
      });
      if (changed) saveJSON(ASSIGN_KEY, stateAssignments);
      set({
        customPresets,
        stateAssignments,
        activePreset: get().activePreset === id ? "state-idle" : get().activePreset,
      });
    },

    resetPreset: (id) => {
      const factory = factoryPreset(id);
      if (factory) {
        const overrides = { ...get().overrides };
        delete overrides[factory.id];
        delete overrides[id];
        saveJSON(OVERRIDE_KEY, overrides);
        applySettings(factory.settings, { overrides, activePreset: factory.id, unsaved: false });
        return;
      }
      const custom = get().customPresets.find((p) => p.id === id);
      if (!custom?.origin) return;
      const settings = normalizeSettings(custom.origin);
      const customPresets = get().customPresets.map((p) => (p.id === id ? { ...p, settings } : p));
      saveJSON(PRESET_KEY, customPresets);
      applySettings(settings, { customPresets, activePreset: id, unsaved: false });
    },

    assignPresetToState: (state, presetId) => {
      const stateAssignments = { ...get().stateAssignments, [state]: presetId };
      saveJSON(ASSIGN_KEY, stateAssignments);
      set({ stateAssignments });
      if (get().voiceState === state) {
        get().applyPreset(presetId);
      }
    },

    resetAssignments: () => {
      saveJSON(ASSIGN_KEY, DEFAULT_ASSIGNMENTS);
      set({ stateAssignments: { ...DEFAULT_ASSIGNMENTS } });
      get().setVoiceState(get().voiceState);
    },

    importPresets: (presets) => {
      const merged = [...get().customPresets];
      for (const p of presets) {
        if (!p?.settings || !p.name) continue;
        const settings = normalizeSettings(p.settings);
        merged.push({
          ...p,
          id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          builtin: false,
          settings,
          origin: settings,
        });
      }
      saveJSON(PRESET_KEY, merged);
      set({ customPresets: merged });
    },

    reset: () => {
      applySettings(defaultSettings, { activePreset: "state-idle" });
    },

    toggleMic: () => {
      const next = !get().micEnabled;
      if (next) {
        get().setVoiceState("listening");
        set({ micEnabled: true, micError: false });
      } else {
        set({ micEnabled: false });
        if (get().voiceState === "listening") get().setVoiceState("idle");
      }
    },

    cancelUtterance: () => {
      clearUtteranceTimers();
    },

    submitUtterance: (text) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      clearUtteranceTimers();
      const gen = utteranceGen;
      set({ typeOpen: false });
      get().setVoiceState("working", "I'm checking that now...");
      later(gen, 1800, () => get().setVoiceState("speaking", replyTo(trimmed)));
      later(gen, 5200, () => get().setVoiceState("completed"));
    },

    resetSection: (section) => {
      const active = get().activePreset;
      const factory = factoryPreset(active) || { settings: defaultSettings };
      const keys = SECTION_KEYS[section];
      const patchObj: Partial<SophiaSettings> = {};
      for (const k of keys) {
        (patchObj as Record<string, unknown>)[k] = factory.settings[k] ?? defaultSettings[k];
      }
      set({ ...patchObj });
      get().updatePreset(active);
    },

    saveSection: (section) => {
      const keys = SECTION_KEYS[section];
      const data: Partial<SophiaSettings> = {};
      const current = get();
      for (const k of keys) {
        (data as Record<string, unknown>)[k] = current[k];
      }
      saveJSON(`sophia-section-${section}-v2`, data);
      get().updatePreset(get().activePreset);
    },

    loadSavedSection: (section) => {
      const saved = loadJSON<Partial<SophiaSettings> | null>(`sophia-section-${section}-v2`, null);
      if (!saved || typeof saved !== "object") return false;
      const keys = SECTION_KEYS[section];
      const patchObj: Partial<SophiaSettings> = {};
      for (const k of keys) {
        if (saved[k] !== undefined) {
          (patchObj as Record<string, unknown>)[k] = saved[k];
        }
      }
      set({ ...patchObj });
      get().updatePreset(get().activePreset);
      return true;
    },

    hasSavedSection: (section) => {
      if (!canUseStorage()) return false;
      return Boolean(localStorage.getItem(`sophia-section-${section}-v2`));
    },
  };
});

export { VOICE_STATES };
