import { useEffect, useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { useSophiaStore } from "@/store/sophiaStore";
import { STATE_META } from "@/lib/sophia/captions";
import type { RuntimeStatus } from "@/lib/sophia/types";

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

const STATUS_COPY: Record<RuntimeStatus, string> = {
  online: "Online",
  degraded: "Degraded",
  offline: "Offline",
};

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(id);
  }, []);
  return now;
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
        useSophiaStore.getState().patch({
          micEnabled: false,
          micError: true,
          audioLevel: 0,
          runtimeStatus: "degraded",
        });
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
  const now = useClock();
  const voiceState = useSophiaStore((s) => s.voiceState);
  const settingsOpen = useSophiaStore((s) => s.settingsOpen);
  const typeOpen = useSophiaStore((s) => s.typeOpen);
  const infoOpen = useSophiaStore((s) => s.infoOpen);
  const micEnabled = useSophiaStore((s) => s.micEnabled);
  const runtimeStatus = useSophiaStore((s) => s.runtimeStatus);
  const spokenCaption = useSophiaStore((s) => s.spokenCaption);
  const patch = useSophiaStore((s) => s.patch);
  const toggleMic = useSophiaStore((s) => s.toggleMic);
  const submitUtterance = useSophiaStore((s) => s.submitUtterance);
  const [draft, setDraft] = useState("");

  const meta = STATE_META[voiceState];
  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const date = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  const caption = spokenCaption || meta.caption;

  function onType(e: FormEvent) {
    e.preventDefault();
    submitUtterance(draft);
    setDraft("");
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-start justify-between px-5 pt-5 md:px-8 md:pt-7">
        <button
          className="icon-btn pointer-events-auto z-20"
          aria-label="Open settings"
          onClick={(e) => {
            e.stopPropagation();
            patch({ settingsOpen: !settingsOpen, infoOpen: false });
          }}
        >
          <GearIcon />
        </button>

        <div className="pointer-events-auto flex items-start gap-4">
          <div className="hidden pt-0.5 text-right sm:block">
            <div className="flex items-center justify-end gap-2">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  runtimeStatus === "online" && "bg-emerald-400",
                  runtimeStatus === "degraded" && "bg-amber-400",
                  runtimeStatus === "offline" && "bg-rose-400",
                )}
              />
              <span className="text-[11px] tracking-[0.14em] text-white/70">{STATUS_COPY[runtimeStatus]}</span>
            </div>
            <div className="mt-1 text-[13px] font-light text-white/80">{time}</div>
            <div className="text-[10px] tracking-wide text-white/30">{date}</div>
          </div>
          <div className="flex flex-col items-end gap-1 sm:hidden">
            <div className="flex items-center gap-1.5 pr-1">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  runtimeStatus === "online" && "bg-emerald-400",
                  runtimeStatus === "degraded" && "bg-amber-400",
                  runtimeStatus === "offline" && "bg-rose-400",
                )}
              />
              <span className="text-[10px] tracking-wide text-white/55">{STATUS_COPY[runtimeStatus]}</span>
            </div>
          </div>
          <button
            className={cn("icon-btn mic z-20", (micEnabled || voiceState === "listening") && "active")}
            aria-label="Toggle microphone"
            onClick={(e) => {
              e.stopPropagation();
              toggleMic();
            }}
          >
            <MicIcon />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1" aria-hidden />

      <div className="flex flex-col items-center px-6 pb-3 pt-2">
        <p
          key={voiceState}
          className="status-copy text-[20px] font-light tracking-[0.18em] text-white/90 md:text-[24px]"
        >
          {meta.label}
        </p>
        <p
          key={`${voiceState}-${caption}`}
          className="status-copy mt-2 max-w-[28rem] text-center text-[13px] font-light tracking-[0.04em] text-indigo-200/55 md:text-[14px]"
        >
          ( {caption} )
        </p>
      </div>

      <div className="flex flex-col items-center pb-4 md:pb-5">
        <h1 className="text-[15px] font-light tracking-[0.62em] text-white/90 md:text-[16px]">SOPHIA</h1>
        <p className="mt-2 text-[9px] font-light tracking-[0.48em] text-white/35 md:text-[10px]">ALWAYS WITH YOU</p>
      </div>

      <footer className="relative flex items-end justify-between gap-3 px-5 pb-5 md:px-8 md:pb-7">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="pointer-events-auto flex items-center gap-2 text-[12px] text-white/50 hover:text-white transition"
            onClick={(e) => {
              e.stopPropagation();
              useSophiaStore.getState().interact();
            }}
            title="Press Space or click to pause/activate"
          >
            <span className="kbd">Space</span>
            <span className="hidden sm:inline">
              {voiceState === "paused"
                ? "Resume"
                : ["listening", "working", "speaking", "needs_you", "blocked"].includes(voiceState)
                  ? "Pause"
                  : "Activate"}
            </span>
          </button>

          <button
            type="button"
            className="pointer-events-auto flex items-center gap-2 text-[12px] text-white/45 hover:text-white/80 transition"
            onClick={(e) => {
              e.stopPropagation();
              patch({ typeOpen: !typeOpen, infoOpen: false });
            }}
          >
            <span className="kbd">K</span>
            <span className="hidden sm:inline">Type instead</span>
          </button>
        </div>

        <div className="pointer-events-auto flex items-center gap-2 text-[11px] text-white/35">
          <span className="hidden max-w-[14rem] text-right sm:inline">{meta.hint}</span>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/12 text-white/55 hover:text-white transition"
            aria-label="About Sophia"
            onClick={(e) => {
              e.stopPropagation();
              patch({ infoOpen: !infoOpen });
            }}
          >
            i
          </button>
        </div>

        {typeOpen && (
          <form
            onSubmit={onType}
            className="pointer-events-auto absolute bottom-16 left-1/2 z-30 w-[min(520px,calc(100vw-2rem))] -translate-x-1/2"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Tell Sophia what you need..."
              className="w-full rounded-2xl border border-white/12 bg-[#070714]/90 px-4 py-3 text-[14px] text-white outline-none placeholder:text-white/30 backdrop-blur-xl"
            />
          </form>
        )}

        {infoOpen && (
          <div
            className="pointer-events-auto absolute right-5 bottom-16 z-30 w-[min(290px,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[#070714]/92 p-4 text-[12px] leading-relaxed text-white/60 backdrop-blur-xl md:right-8"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <p className="text-white/90 font-medium">Controls & Shortcuts</p>
            <p className="mt-2">
              <strong className="text-white">Click</strong> Sophia or press <strong className="text-white">Space</strong> to pause, resume, or activate.
            </p>
            <p className="mt-1.5">
              <strong className="text-white">S</strong> opens studio. <strong className="text-white">M</strong> toggles mic. <strong className="text-white">K</strong> types text.
            </p>
            <p className="mt-1.5">
              <strong className="text-white">1–8</strong> switch states (1: Idle, 2: Listening, 3: Working, 4: Speaking, 5: Needs You, 6: Paused, 7: Blocked, 8: Completed).
            </p>
            <p className="mt-2 text-white/35">No extra controls around her. She is the interface.</p>
          </div>
        )}
      </footer>
    </div>
  );
}
