import { useEffect } from "react";
import SophiaCanvas from "./components/SophiaCanvas";
import Hud from "./components/Hud";
import SettingsPanel from "./components/SettingsPanel";
import { useSophiaStore } from "./store/sophiaStore";

export default function App() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const store = useSophiaStore.getState();
      if (e.key === "Escape") store.patch({ settingsOpen: false });
      if (e.key === "s" || e.key === "S") store.patch({ settingsOpen: !store.settingsOpen });
      if (e.key === "m" || e.key === "M") store.toggleMic();
      if (e.key === " ") {
        e.preventDefault();
        store.cycleVoiceState();
      }
      if (e.key === "1") store.setVoiceState("idle");
      if (e.key === "2") store.setVoiceState("listen");
      if (e.key === "3") store.setVoiceState("think");
      if (e.key === "4") store.setVoiceState("speak");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative h-dvh w-screen select-none overflow-hidden bg-[#050510]">
      <div className="absolute inset-0 z-0">
        <SophiaCanvas />
      </div>
      <div className="pointer-events-none absolute inset-0 z-10">
        <Hud />
      </div>
      <SettingsPanel />
      <div className="grain" />
    </div>
  );
}
