import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { useSophiaStore } from "../store/sophiaStore";
import type { VoiceState } from "../lib/types";

const STATUS: Record<VoiceState, string> = {
  idle: "Ready",
  listen: "Listening...",
  think: "Thinking...",
  speak: "Speaking...",
};

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="3" />
      <path
        strokeLinecap="round"
        d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1.1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" strokeLinecap="round" />
      <path d="M12 18v3" strokeLinecap="round" />
    </svg>
  );
}

function Waveform() {
  const voiceState = useSophiaStore((s) => s.voiceState);
  const audioLevel = useSophiaStore((s) => s.audioLevel);
  const active = voiceState === "listen" || voiceState === "speak";
  const bars = 21;
  const [tick, setTick] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    const loop = () => {
      setTick((n) => n + 1);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const heights = useMemo(() => {
    const t = tick * 0.05;
    return Array.from({ length: bars }, (_, i) => {
      const center = (bars - 1) / 2;
      const dist = Math.abs(i - center) / center;
      const envelope = 1 - dist * 0.72;
      if (!active) return 3 + envelope * 5;
      const wave =
        0.35 +
        0.35 * Math.sin(t * 2.2 + i * 0.55) +
        0.3 * Math.sin(t * 3.6 + i * 0.9);
      const speech =
        voiceState === "speak"
          ? Math.abs(Math.sin(t * 4.2 + i * 0.4) * Math.sin(t * 1.3))
          : 0;
      const h = envelope * (0.25 + wave * 0.75 + audioLevel * 0.9 + speech * 0.5);
      return 4 + h * 22;
    });
  }, [tick, active, audioLevel, voiceState]);

  return (
    <div className="mt-5 flex h-8 items-end justify-center gap-[3px]">
      {heights.map((h, i) => {
        const center = (bars - 1) / 2;
        const dist = Math.abs(i - center) / center;
        const alpha = active ? 0.95 - dist * 0.35 : 0.35;
        return (
          <span
            key={i}
            className="w-[2px] rounded-full"
            style={{
              height: `${h}px`,
              background: `linear-gradient(180deg, #7dd3fc, #818cf8 55%, #c084fc)`,
              opacity: alpha,
              boxShadow: active ? "0 0 8px rgba(129,140,248,0.55)" : "none",
            }}
          />
        );
      })}
    </div>
  );
}

function useMicrophone() {
  const micEnabled = useSophiaStore((s) => s.micEnabled);

  useEffect(() => {
    if (!micEnabled) {
      useSophiaStore.getState().patch({ audioLevel: 0 });
      return;
    }
    let raf = 0;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let cancelled = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        ctx = new AudioContext();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const loop = () => {
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          useSophiaStore.getState().patch({ audioLevel: sum / data.length / 255 });
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch {
        useSophiaStore.getState().patch({ micEnabled: false, micError: true, audioLevel: 0 });
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close();
      useSophiaStore.getState().patch({ audioLevel: 0 });
    };
  }, [micEnabled]);
}

export default function Hud() {
  useMicrophone();
  const voiceState = useSophiaStore((s) => s.voiceState);
  const settingsOpen = useSophiaStore((s) => s.settingsOpen);
  const micEnabled = useSophiaStore((s) => s.micEnabled);
  const patch = useSophiaStore((s) => s.patch);
  const toggleMic = useSophiaStore((s) => s.toggleMic);

  return (
    <>
      <button
        className="icon-btn pointer-events-auto absolute top-6 left-6 z-20 md:top-8 md:left-8"
        aria-label="Open settings"
        onClick={() => patch({ settingsOpen: !settingsOpen })}
      >
        <GearIcon />
      </button>

      <button
        className={cn(
          "icon-btn mic pointer-events-auto absolute top-6 right-6 z-20 md:top-8 md:right-8",
          (micEnabled || voiceState === "listen") && "active",
        )}
        aria-label="Toggle microphone"
        onClick={toggleMic}
      >
        <MicIcon />
      </button>

      <div className="absolute top-[62%] right-0 left-0 flex flex-col items-center">
        <p
          key={voiceState}
          className="status-copy text-[22px] font-light tracking-[0.18em] text-white/90 md:text-[24px]"
        >
          {STATUS[voiceState]}
        </p>
        <Waveform />
      </div>

      <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center md:bottom-12">
        <h1 className="text-[15px] font-light tracking-[0.62em] text-white/90 md:text-[16px]">
          SOPHIA
        </h1>
        <p className="mt-2 text-[9px] font-light tracking-[0.48em] text-white/35 md:text-[10px]">
          ALWAYS WITH YOU
        </p>
      </div>
    </>
  );
}
