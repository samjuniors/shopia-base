import { create } from "zustand";
import type { PanelTab, SavedPreset, SophiaSettings, VoiceState } from "../lib/types";
import { defaultSettings, pickSettings } from "../lib/presets";

const PRESET_KEY = "sophia-custom-presets";

function loadCustomPresets(): SavedPreset[] {
  try {
    const raw = localStorage.getItem(PRESET_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedPreset[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistCustom(presets: SavedPreset[]) {
  try {
    localStorage.setItem(PRESET_KEY, JSON.stringify(presets));
  } catch {
    /* ignore quota */
  }
}

export interface SophiaStore extends SophiaSettings {
  voiceState: VoiceState;
  settingsOpen: boolean;
  activeTab: PanelTab;
  inspectMode: boolean;
  customPresets: SavedPreset[];
  activePreset: string;
  audioLevel: number;
  micEnabled: boolean;
  micError: boolean;
  presetName: string;

  patch: (p: Partial<SophiaStore>) => void;
  setVoiceState: (s: VoiceState) => void;
  cycleVoiceState: () => void;
  applyPreset: (id: string, builtins: SavedPreset[]) => void;
  savePreset: (name: string) => void;
  deletePreset: (id: string) => void;
  importPresets: (presets: SavedPreset[]) => void;
  reset: () => void;
  toggleMic: () => void;
}

const STATES: VoiceState[] = ["idle", "listen", "think", "speak"];

export const useSophiaStore = create<SophiaStore>((set, get) => ({
  ...defaultSettings,
  voiceState: "listen",
  settingsOpen: false,
  activeTab: "presence",
  inspectMode: false,
  customPresets: loadCustomPresets(),
  activePreset: "sophia",
  audioLevel: 0,
  micEnabled: false,
  micError: false,
  presetName: "",

  patch: (p) =>
    set((state) => {
      const next = { ...p } as Partial<SophiaStore>;
      const settingTouched = Object.keys(p).some(
        (k) => k in defaultSettings && k !== "activePreset",
      );
      if (settingTouched && next.activePreset === undefined) {
        next.activePreset = "custom";
      }
      return { ...state, ...next };
    }),

  setVoiceState: (voiceState) =>
    set({
      voiceState,
      micEnabled: voiceState === "listen" ? get().micEnabled : false,
    }),

  cycleVoiceState: () => {
    const i = STATES.indexOf(get().voiceState);
    set({ voiceState: STATES[(i + 1) % STATES.length], micEnabled: false });
  },

  applyPreset: (id, builtins) => {
    const all = [...builtins, ...get().customPresets];
    const preset = all.find((p) => p.id === id);
    if (!preset) return;
    set({
      ...defaultSettings,
      ...preset.settings,
      activePreset: id,
    });
  },

  savePreset: (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const settings = pickSettings(get());
    const preset: SavedPreset = {
      id: `c-${Date.now().toString(36)}`,
      name: trimmed,
      settings,
      swatches: [settings.colorA, settings.colorB, settings.colorC],
    };
    const customPresets = [...get().customPresets, preset];
    persistCustom(customPresets);
    set({ customPresets, activePreset: preset.id, presetName: "" });
  },

  deletePreset: (id) => {
    const customPresets = get().customPresets.filter((p) => p.id !== id);
    persistCustom(customPresets);
    set({
      customPresets,
      activePreset: get().activePreset === id ? "sophia" : get().activePreset,
    });
  },

  importPresets: (presets) => {
    const existing = get().customPresets;
    const merged = [...existing];
    for (const p of presets) {
      if (!p?.settings || !p.name) continue;
      merged.push({
        ...p,
        id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        builtin: false,
      });
    }
    persistCustom(merged);
    set({ customPresets: merged });
  },

  reset: () =>
    set({
      ...defaultSettings,
      activePreset: "sophia",
    }),

  toggleMic: () => {
    const next = !get().micEnabled;
    set({
      micEnabled: next,
      micError: false,
      voiceState: next ? "listen" : get().voiceState === "listen" ? "idle" : get().voiceState,
    });
  },
}));
