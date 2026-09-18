import { useCallback, useEffect } from "react";
import { AgentMicrophone, AgentPlayer, AgentSession } from "@deepgram/agents";
import { useSophiaStore, registerVoiceSessionToggle } from "@/store/sophiaStore";
import { getDeepgramToken } from "@/lib/sophia/deepgram-token";

// Supported wake phrases: "Hey Sophia", "Hey Shopia", "Hello Sophia", "Hello Shopia"
const WAKE_PHRASE_REGEX = /\b(hey|hello)\s+(sophia|shopia)\b/i;

/**
 * Patch browser WebSocket once so that Deepgram connections using standard API keys
 * receive subprotocol ['token', <key>] instead of ['bearer', <key>], while preserving
 * ['bearer', <jwt>] for JWT tokens containing '.'.
 */
if (typeof window !== "undefined" && !(window as unknown as { __DG_WS_PATCHED__?: boolean }).__DG_WS_PATCHED__) {
  (window as unknown as { __DG_WS_PATCHED__?: boolean }).__DG_WS_PATCHED__ = true;
  const NativeWebSocket = window.WebSocket;

  window.WebSocket = class extends NativeWebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      const protoList = Array.isArray(protocols)
        ? [...protocols]
        : typeof protocols === "string"
        ? [protocols]
        : [];

      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("deepgram.com")) {
        // If protocol is 'bearer' but the token is an API key (no '.' like a JWT), rewrite to 'token'
        if (protoList[0] === "bearer" && protoList[1] && !protoList[1].includes(".")) {
          protoList[0] = "token";
        }
      }

      super(url, protoList.length > 0 ? protoList : undefined);
    }
  } as unknown as typeof WebSocket;
}

type AgentMode = "idle" | "conversation" | "paused" | "blocked";

/**
 * Unified Voice Agent & Wake Word Manager.
 *
 * Maintains a SINGLE active microphone capture pipeline across wake detection and
 * full conversation sessions to prevent duplicate MediaStreams or AudioContexts.
 *
 * IDLE:
 *   Lightweight Deepgram Live STT streaming listens for "Hey Sophia" / "Hello Sophia".
 *   Microphone volume feeds Sophia's visual audio reactivity.
 *
 * WAKE DETECTED:
 *   Wake listener suspends -> Sophia enters LISTENING -> Deepgram Voice Agent connects
 *   with Google Gemini 3.1 Flash-Lite -> user speaks request.
 *
 * BARGE-IN:
 *   When user speaks while Sophia is speaking, audio output is immediately interrupted
 *   and Sophia transitions back to LISTENING.
 */
class DeepgramVoiceManager {
  private mode: AgentMode = "idle";
  private microphone: AgentMicrophone | null = null;
  private session: AgentSession | null = null;
  private player: AgentPlayer | null = null;
  private wakeSocket: WebSocket | null = null;
  private wakeReconnectTimer: number | null = null;
  private sessionConnected = false;
  private connectingSession = false;
  private micInitializing = false;
  private micInitialized = false;
  private rafId: number | null = null;
  private audioDoneTimer: number | null = null;
  private cachedToken: string | null = null;

  public getMode(): AgentMode {
    return this.mode;
  }

  public isConnected(): boolean {
    return this.sessionConnected;
  }

  /**
   * Initialize microphone pipeline once and start the wake listener.
   */
  public async init(): Promise<void> {
    if (this.micInitialized || this.micInitializing) return;
    this.micInitializing = true;

    try {
      // 1. Fetch token from server route
      const { token } = await getDeepgramToken();
      this.cachedToken = token;

      // 2. Start single microphone capture pipeline (16kHz PCM linear16)
      this.microphone = new AgentMicrophone((chunk: ArrayBuffer) => {
        this.handleAudioFrame(chunk);
      }, {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000,
      });

      await this.microphone.start();
      this.micInitialized = true;
      this.micInitializing = false;

      const store = useSophiaStore.getState();
      store.patch({ micEnabled: true, micError: false, runtimeStatus: "online" });

      // 3. Start audio volume monitoring for visual reactivity
      this.startVolumeLoop();

      // 4. Start wake listener if in idle mode
      if (this.mode === "idle") {
        this.startWakeListener();
      }
    } catch (err) {
      this.micInitializing = false;
      console.warn("[sophia-voice] Microphone initialization error:", err);

      const store = useSophiaStore.getState();
      const msg = err instanceof Error ? err.message : String(err);

      if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
        this.mode = "blocked";
        store.patch({ micEnabled: false, micError: true, runtimeStatus: "degraded" });
        store.setVoiceState("blocked", "Microphone access denied. Please allow microphone permissions.");
      } else if (msg.includes("DEEPGRAM_API_KEY")) {
        this.mode = "blocked";
        store.patch({ micEnabled: false, micError: true, runtimeStatus: "offline" });
        store.setVoiceState("blocked", "DEEPGRAM_API_KEY is not configured on the server.");
      } else {
        store.patch({ runtimeStatus: "degraded" });
      }
    }
  }

  /**
   * Handle each audio frame from the single microphone capture.
   */
  private handleAudioFrame(chunk: ArrayBuffer): void {
    if (this.mode === "idle" && this.wakeSocket && this.wakeSocket.readyState === WebSocket.OPEN) {
      this.wakeSocket.send(chunk);
    } else if (this.mode === "conversation" && this.session && this.sessionConnected) {
      this.session.sendAudio(chunk);
    }
  }

  /**
   * Continuously sample volume to drive Sophia's audio reactivity.
   */
  private startVolumeLoop(): void {
    this.stopVolumeLoop();

    const loop = () => {
      const store = useSophiaStore.getState();
      const st = store.voiceState;
      let vol = 0;

      if (st === "speaking" && this.player) {
        vol = this.player.getOutputVolume();
      } else if ((st === "listening" || st === "idle") && this.microphone) {
        vol = this.microphone.getInputVolume();
      }

      const level = Math.min(1, vol * 1.35);
      store.patch({ audioLevel: level });

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  private stopVolumeLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Start lightweight Deepgram streaming STT wake word listener during IDLE.
   */
  private async startWakeListener(): Promise<void> {
    this.stopWakeListener();

    if (this.mode !== "idle") return;

    try {
      if (!this.cachedToken) {
        const { token } = await getDeepgramToken();
        this.cachedToken = token;
      }

      const token = this.cachedToken;
      const isJwt = token.includes(".");
      const protocol = isJwt ? ["bearer", token] : ["token", token];

      // Lightweight live STT endpoint on regional India cluster
      const liveUrl = "wss://api.in.deepgram.com/v1/listen?model=nova-3&encoding=linear16&sample_rate=16000&channels=1&interim_results=true&endpointing=300";

      const ws = new WebSocket(liveUrl, protocol);
      this.wakeSocket = ws;

      ws.onopen = () => {
        if (this.mode === "idle") {
          useSophiaStore.getState().patch({ runtimeStatus: "online" });
        }
      };

      ws.onmessage = (event) => {
        if (this.mode !== "idle") return;

        try {
          const data = JSON.parse(event.data);
          if (data.type === "Results" && data.channel?.alternatives?.[0]) {
            const transcript = (data.channel.alternatives[0].transcript || "").trim();
            if (transcript && WAKE_PHRASE_REGEX.test(transcript)) {
              // Wake word detected ("Hey Sophia", "Hello Sophia", etc.)
              this.onWakeWordDetected();
            }
          }
        } catch {
          // Ignore JSON parse errors
        }
      };

      ws.onerror = () => {
        // Handled in onclose
      };

      ws.onclose = () => {
        this.wakeSocket = null;
        // If still in idle mode and not intentionally closed, schedule reconnection
        if (this.mode === "idle") {
          this.wakeReconnectTimer = window.setTimeout(() => {
            this.wakeReconnectTimer = null;
            if (this.mode === "idle") {
              void this.startWakeListener();
            }
          }, 3000);
        }
      };
    } catch (err) {
      console.warn("[sophia-voice] Wake listener start failed:", err);
    }
  }

  private stopWakeListener(): void {
    if (this.wakeReconnectTimer !== null) {
      clearTimeout(this.wakeReconnectTimer);
      this.wakeReconnectTimer = null;
    }

    if (this.wakeSocket) {
      try {
        if (this.wakeSocket.readyState === WebSocket.OPEN) {
          this.wakeSocket.send(JSON.stringify({ type: "CloseStream" }));
        }
        this.wakeSocket.close();
      } catch {
        // ignore
      }
      this.wakeSocket = null;
    }
  }

  /**
   * Action triggered when wake phrase is detected while in IDLE.
   */
  private onWakeWordDetected(): void {
    if (this.mode !== "idle") return;

    // 1. Suspend wake listener immediately
    this.stopWakeListener();

    // 2. Transition Sophia to LISTENING
    const store = useSophiaStore.getState();
    store.setVoiceState("listening", "I'm listening...");

    // 3. Activate conversational voice agent session
    void this.startConversation();
  }

  /**
   * Establish the full-duplex conversational Voice Agent session.
   */
  public async startConversation(): Promise<void> {
    if (this.sessionConnected || this.connectingSession) return;
    this.connectingSession = true;
    this.mode = "conversation";
    this.stopWakeListener();

    const store = useSophiaStore.getState();

    try {
      // Ensure microphone is initialized
      if (!this.micInitialized) {
        await this.init();
      }

      store.setVoiceState("listening", "I'm listening...");

      // Initialize Player for audio output
      if (!this.player) {
        this.player = new AgentPlayer({ sampleRate: 24000 });
      }

      // Initialize AgentSession with India endpoint and Google Gemini provider
      const session = new AgentSession({
        auth: {
          tokenFactory: async () => {
            const res = await getDeepgramToken();
            this.cachedToken = res.token;
            return res.token;
          },
        },
        url: "wss://api.in.deepgram.com",
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
              type: "google",
              model: "gemini-3.1-flash-lite",
            },
            prompt: [
              "You are Sophia, a calm, warm, and intelligent voice assistant.",
              "You are having a natural spoken voice conversation with the user.",
              "Provide natural, concise spoken answers (1 to 3 sentences typically).",
              "Do not use markdown, formatting, asterisks, bullet points, or lists unless explicitly requested.",
              "Never announce or mention internal state names such as 'WORKING', 'SPEAKING', 'IDLE', or 'LISTENING'.",
              "Answer the user's request directly, intelligently, and warmly.",
              "If the user simply greets you or says 'Hey Sophia', acknowledge warmly with 'Yes?' or 'I'm here, how can I help?'.",
              "Remember conversation context across turns during the active session.",
            ].join(" "),
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

      session.on("settings-applied", () => {
        this.sessionConnected = true;
        this.connectingSession = false;
        const s = useSophiaStore.getState();
        s.patch({ deepgramConnected: true, micEnabled: true, micError: false, runtimeStatus: "online" });
        s.setVoiceState("listening", "I'm listening...");
      });

      session.on("user-started-speaking", () => {
        // Instant Barge-In: immediately interrupt ongoing audio playback
        if (this.player) {
          this.player.interrupt();
        }
        if (this.audioDoneTimer !== null) {
          clearTimeout(this.audioDoneTimer);
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
          s.patch({ spokenCaption: msg.content });
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
          clearTimeout(this.audioDoneTimer);
        }
        // Calculate remaining audio playback time before returning to listening
        const remainingSec = this.player ? this.player.getRemainingPlaybackTime() : 0;
        const delayMs = Math.max(300, remainingSec * 1000 + 400);

        this.audioDoneTimer = window.setTimeout(() => {
          this.audioDoneTimer = null;
          const s = useSophiaStore.getState();
          if (this.mode === "conversation" && s.voiceState === "speaking") {
            s.setVoiceState("listening", "I'm listening...");
          }
        }, delayMs);
      });

      session.on("error", (err) => {
        console.warn("[sophia-voice] Voice agent error:", err);
      });

      session.on("sdk-error", (err) => {
        console.error("[sophia-voice] Voice agent SDK error:", err);
      });

      session.on("disconnected", () => {
        if (this.mode === "conversation") {
          this.disconnectToIdle();
        }
      });

      await session.connect();
    } catch (err) {
      console.error("[sophia-voice] Failed to start conversation:", err);
      this.cleanupSession();
      this.connectingSession = false;

      const s = useSophiaStore.getState();
      s.patch({ deepgramConnected: false });

      if (err instanceof DOMException && err.name === "NotAllowedError") {
        this.mode = "blocked";
        s.setVoiceState("blocked", "Microphone access denied. Please allow microphone permissions.");
      } else {
        // Return to IDLE on transient session failure
        this.disconnectToIdle();
      }
    }
  }

  /**
   * Disconnect conversational session and return to IDLE, resuming the wake word listener.
   */
  public disconnectToIdle(): void {
    this.cleanupSession();
    this.mode = "idle";

    const s = useSophiaStore.getState();
    s.patch({ deepgramConnected: false, userTranscript: "" });
    s.setVoiceState("idle", "I'm here.");

    // Resume wake word listener
    void this.startWakeListener();
  }

  /**
   * Pause Sophia (disables both wake word listener and conversation session).
   */
  public pause(): void {
    this.cleanupSession();
    this.stopWakeListener();
    this.mode = "paused";

    const s = useSophiaStore.getState();
    s.patch({ deepgramConnected: false, micEnabled: false, audioLevel: 0 });
    s.setVoiceState("paused");
  }

  /**
   * Resume from paused state.
   */
  public resume(): void {
    this.mode = "idle";
    const s = useSophiaStore.getState();
    s.patch({ micEnabled: true });
    s.setVoiceState("idle", "I'm here.");
    void this.startWakeListener();
  }

  /**
   * Toggle action for Mic button and Spacebar.
   */
  public async toggle(): Promise<void> {
    if (this.mode === "paused") {
      this.resume();
      return;
    }

    if (this.mode === "conversation" || this.sessionConnected || this.connectingSession) {
      this.disconnectToIdle();
      return;
    }

    if (this.mode === "blocked") {
      // Retry microphone permission
      this.mode = "idle";
      this.micInitialized = false;
      await this.init();
      return;
    }

    // In idle: start conversation directly
    await this.startConversation();
  }

  private cleanupSession(): void {
    this.sessionConnected = false;
    this.connectingSession = false;

    if (this.audioDoneTimer !== null) {
      clearTimeout(this.audioDoneTimer);
      this.audioDoneTimer = null;
    }

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

  /**
   * Complete cleanup if component ever unmounts.
   */
  public destroy(): void {
    this.stopWakeListener();
    this.cleanupSession();
    this.stopVolumeLoop();

    try {
      this.microphone?.stop();
    } catch {
      // ignore
    }
    this.microphone = null;
    this.micInitialized = false;
    this.micInitializing = false;
  }
}

/** Global singleton voice agent instance */
export const deepgramVoice = new DeepgramVoiceManager();

// Register with sophiaStore so 3D mesh clicks and global interact() drive voice session
registerVoiceSessionToggle(() => {
  void deepgramVoice.toggle();
});

/**
 * React hook to interact with the singleton Deepgram Voice Agent.
 */
export function useDeepgramAgent() {
  const deepgramConnected = useSophiaStore((s) => s.deepgramConnected);
  const voiceState = useSophiaStore((s) => s.voiceState);

  const connect = useCallback(() => deepgramVoice.startConversation(), []);
  const disconnect = useCallback(() => deepgramVoice.disconnectToIdle(), []);
  const toggle = useCallback(() => deepgramVoice.toggle(), []);

  // Initialize microphone & wake listener when hook mounts
  useEffect(() => {
    void deepgramVoice.init();
  }, []);

  return {
    connect,
    disconnect,
    toggle,
    isConnected: deepgramVoice.isConnected.bind(deepgramVoice),
    deepgramConnected,
    voiceState,
  };
}
