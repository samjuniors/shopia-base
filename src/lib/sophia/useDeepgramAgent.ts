import { useCallback, useEffect } from "react";
import { AgentMicrophone, AgentPlayer, AgentSession } from "@deepgram/agents";
import { useSophiaStore, registerVoiceSessionToggle } from "@/store/sophiaStore";
import { getDeepgramToken } from "@/lib/sophia/deepgram-token";

/**
 * Singleton Voice Agent Manager using @deepgram/agents SDK.
 *
 * Provides real-time bidirectional voice loop:
 * Microphone -> STT (nova-3) -> LLM (gpt-4o-mini) -> TTS (aura-2-theia-en) -> Speaker.
 * Supports full barge-in / interruption, volume reactivity, and automatic
 * Sophia state transitions.
 */
class DeepgramVoiceManager {
  private session: AgentSession | null = null;
  private microphone: AgentMicrophone | null = null;
  private player: AgentPlayer | null = null;
  private connected = false;
  private connecting = false;
  private rafId: number | null = null;
  private audioDoneTimer: number | null = null;

  /** Whether a voice session is actively established */
  public isConnected(): boolean {
    return this.connected;
  }

  /** Start polling audio volume to drive Sophia's 3D audio reactivity */
  private startVolumeLoop() {
    this.stopVolumeLoop();

    const loop = () => {
      if (!this.connected) return;

      const store = useSophiaStore.getState();
      const st = store.voiceState;
      let vol = 0;

      if (st === "listening" && this.microphone) {
        // Sample user speech volume from mic analyser
        vol = this.microphone.getInputVolume();
      } else if (st === "speaking" && this.player) {
        // Sample Deepgram speech output volume from player analyser
        vol = this.player.getOutputVolume();
      }

      // Smooth boost for visual presence
      const level = Math.min(1, vol * 1.35);
      store.patch({ audioLevel: level });

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  private stopVolumeLoop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /** Connect to the Deepgram Voice Agent */
  public async connect(): Promise<void> {
    if (this.connected || this.connecting) return;
    this.connecting = true;

    const store = useSophiaStore.getState();

    try {
      store.setVoiceState("working", "Connecting to voice service...");

      // 1. Obtain short-lived JWT and regional WSS URL from server route
      const tokenRes = await getDeepgramToken();
      if (!tokenRes?.token) {
        throw new Error("No authentication token returned from server.");
      }

      // 2. Initialize Player for audio output
      const player = new AgentPlayer({ sampleRate: 24000 });
      this.player = player;

      // 3. Initialize AgentSession with inline agent instructions
      const session = new AgentSession({
        auth: {
          tokenFactory: async () => {
            const fresh = await getDeepgramToken();
            return fresh.token;
          },
        },
        url: tokenRes.endpoint || "wss://agent.in.deepgram.com/v1/agent/converse",
        agent: {
          listen: {
            provider: {
              type: "deepgram",
              version: "v1",
              model: "nova-3",
            },
          },
          think: {
            provider: {
              type: "open_ai",
              model: "gpt-4o-mini",
            },
            prompt:
              "You are Sophia, a calm, warm, and poetic AI companion. " +
              "Keep responses concise (1-3 sentences). Maintain a serene, " +
              "thoughtful demeanor. You speak softly and meaningfully.",
          },
          speak: {
            provider: {
              type: "deepgram",
              model: "aura-2-theia-en",
            },
          },
        },
      });
      this.session = session;

      // 4. Initialize Microphone for audio input
      const microphone = new AgentMicrophone((chunk) => {
        if (this.session && this.connected) {
          this.session.sendAudio(chunk);
        }
      }, {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 16000,
      });
      this.microphone = microphone;

      // 5. Wire AgentSession events
      session.on("settings-applied", () => {
        this.connected = true;
        this.connecting = false;
        const s = useSophiaStore.getState();
        s.patch({ deepgramConnected: true, micEnabled: true, micError: false });
        s.setVoiceState("listening", "I'm listening...");
        this.startVolumeLoop();
      });

      session.on("user-started-speaking", () => {
        // Instant Barge-In: interrupt ongoing TTS playback immediately
        if (this.player) {
          this.player.interrupt();
        }
        if (this.audioDoneTimer !== null) {
          window.clearTimeout(this.audioDoneTimer);
          this.audioDoneTimer = null;
        }
        const s = useSophiaStore.getState();
        if (s.voiceState === "speaking" || s.voiceState === "working") {
          s.setVoiceState("listening", "I'm listening...");
        }
      });

      session.on("conversation-text", (msg) => {
        const s = useSophiaStore.getState();
        if (msg.role === "user") {
          s.patch({ userTranscript: msg.content });
          s.setVoiceState("listening", `"${msg.content}"`);
        } else {
          s.setVoiceState("speaking", msg.content);
        }
      });

      session.on("agent-thinking", () => {
        const s = useSophiaStore.getState();
        s.setVoiceState("working", "Reflecting...");
      });

      session.on("agent-started-speaking", () => {
        const s = useSophiaStore.getState();
        s.setVoiceState("speaking", s.spokenCaption || "Speaking...");
      });

      session.on("audio", (chunk) => {
        if (this.player) {
          this.player.queue(chunk);
        }
      });

      session.on("agent-audio-done", () => {
        if (this.audioDoneTimer !== null) {
          window.clearTimeout(this.audioDoneTimer);
        }
        // When agent finishes speaking all chunks, return to listening after a natural pause
        this.audioDoneTimer = window.setTimeout(() => {
          this.audioDoneTimer = null;
          const s = useSophiaStore.getState();
          if (this.connected && s.voiceState === "speaking") {
            s.setVoiceState("listening", "I'm listening...");
          }
        }, 800);
      });

      session.on("error", (err) => {
        console.warn("[deepgram] session warning/error:", err);
      });

      session.on("sdk-error", (err) => {
        console.error("[deepgram] SDK error:", err);
      });

      session.on("disconnected", () => {
        if (this.connected) {
          this.disconnect();
        }
      });

      // 6. Connect WebSocket and start microphone
      await session.connect();
      await microphone.start();
    } catch (err: unknown) {
      console.error("[deepgram] Connection failed:", err);
      this.cleanup();
      this.connecting = false;

      const s = useSophiaStore.getState();
      s.patch({ deepgramConnected: false, micEnabled: false, micError: true, audioLevel: 0 });

      const msg = err instanceof Error ? err.message : String(err);
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        s.setVoiceState("blocked", "Microphone access denied. Please allow microphone permissions.");
      } else if (msg.includes("DEEPGRAM_API_KEY")) {
        s.setVoiceState("blocked", "DEEPGRAM_API_KEY not set in .env.");
      } else {
        s.setVoiceState("blocked", "Could not connect to voice service. Verify API key.");
      }
    }
  }

  /** Disconnect and free all audio resources */
  public disconnect(): void {
    this.cleanup();
    const s = useSophiaStore.getState();
    s.patch({ deepgramConnected: false, micEnabled: false, audioLevel: 0 });
    s.setVoiceState("idle", "I'm here.");
  }

  private cleanup(): void {
    this.connected = false;
    this.connecting = false;
    this.stopVolumeLoop();

    if (this.audioDoneTimer !== null) {
      window.clearTimeout(this.audioDoneTimer);
      this.audioDoneTimer = null;
    }

    try {
      this.microphone?.stop();
    } catch {
      // ignore
    }
    this.microphone = null;

    try {
      this.player?.interrupt();
      this.player?.dispose();
    } catch {
      // ignore
    }
    this.player = null;

    try {
      this.session?.disconnect();
    } catch {
      // ignore
    }
    this.session = null;
  }

  /** Toggle voice session on or off */
  public async toggle(): Promise<void> {
    if (this.connected || this.connecting) {
      this.disconnect();
    } else {
      await this.connect();
    }
  }
}

/** Global singleton voice agent instance */
export const deepgramVoice = new DeepgramVoiceManager();

// Register with sophiaStore so interact() and 3D mesh clicks seamlessly drive voice session
registerVoiceSessionToggle(() => {
  void deepgramVoice.toggle();
});

/**
 * React hook to interact with the singleton Deepgram Voice Agent.
 */
export function useDeepgramAgent() {
  const deepgramConnected = useSophiaStore((s) => s.deepgramConnected);

  const connect = useCallback(() => deepgramVoice.connect(), []);
  const disconnect = useCallback(() => deepgramVoice.disconnect(), []);
  const toggle = useCallback(() => deepgramVoice.toggle(), []);

  // Cleanup on page unmount
  useEffect(() => {
    return () => {
      // Don't disconnect if navigating within the app, but stop volume loop if needed
    };
  }, []);

  return {
    connect,
    disconnect,
    toggle,
    isConnected: deepgramVoice.isConnected.bind(deepgramVoice),
    deepgramConnected,
  };
}
