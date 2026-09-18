import { useEffect } from "react";
import Hud from "./Hud";
import SettingsPanel from "./SettingsPanel";
import SophiaCanvas from "./SophiaCanvas";
import { useSophiaStore } from "@/store/sophiaStore";
import { VOICE_STATES } from "@/lib/sophia/types";

export default function SophiaApp() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const store = useSophiaStore.getState();
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toUpperCase();
      const inputType = (target as HTMLInputElement)?.type?.toLowerCase();

      // Only real text entry fields should block normal shortcuts
      const isTextInput =
        (tag === "INPUT" &&
          !["range", "checkbox", "radio", "color", "button", "submit", "reset"].includes(inputType || "")) ||
        tag === "TEXTAREA" ||
        Boolean(target?.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        store.patch({ typeOpen: !store.typeOpen, infoOpen: false });
        return;
      }

      if (e.key === "Escape") {
        store.patch({ settingsOpen: false, typeOpen: false, infoOpen: false });
        return;
      }

      // Space bar to pause or activate Sophia (unless typing in a text field)
      if (e.code === "Space" || e.key === " " || e.key === "Spacebar") {
        if (!isTextInput) {
          e.preventDefault();
          // Unfocus any active button or slider so space doesn't re-trigger it
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          store.interact();
          return;
        }
      }

      if (isTextInput) return;

      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        store.patch({ settingsOpen: !store.settingsOpen });
        return;
      }

      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        store.toggleMic();
        return;
      }

      if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        store.patch({ typeOpen: !store.typeOpen, infoOpen: false });
        return;
      }

      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        store.interact();
        return;
      }

      let num = -1;
      if (e.key >= "1" && e.key <= "8") {
        num = parseInt(e.key, 10);
      } else if (e.code && /^Numpad[1-8]$/.test(e.code)) {
        num = parseInt(e.code.replace("Numpad", ""), 10);
      }

      if (num >= 1 && num <= 8) {
        e.preventDefault();
        const state = VOICE_STATES[num - 1];
        if (state) store.setVoiceState(state);
      }
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
