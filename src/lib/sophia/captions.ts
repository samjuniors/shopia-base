import type { VoiceState } from "./types";

export const STATE_META: Record<
  VoiceState,
  { label: string; caption: string; hint: string; studio: string }
> = {
  idle: {
    label: "Ready",
    caption: "I'm here.",
    hint: "Click Sophia or Space to listen",
    studio: "Calm closed organic ring, soft breathing",
  },
  listening: {
    label: "Listening...",
    caption: "I'm listening...",
    hint: "Click Sophia or Space to pause",
    studio: "Open receptive posture, leaning toward input",
  },
  working: {
    label: "Working",
    caption: "I'm checking that now...",
    hint: "Click Sophia or Space to pause",
    studio: "Dynamic interwoven knot, travelling streaks",
  },
  speaking: {
    label: "Speaking",
    caption: "Here's what I found...",
    hint: "Click Sophia or Space to pause",
    studio: "Outward expressive form, radiating waves",
  },
  needs_you: {
    label: "Needs you",
    caption: "I need your input...",
    hint: "Click Sophia or Space to respond",
    studio: "Open forward-leaning posture, attention jewel",
  },
  paused: {
    label: "Paused",
    caption: "Paused. Tap Sophia to continue.",
    hint: "Click Sophia or Space to resume",
    studio: "Bowed / folded quiet posture, low resting arch",
  },
  blocked: {
    label: "Blocked",
    caption: "I can't continue right now.",
    hint: "Click Sophia or Space to dismiss",
    studio: "Constrained form, geometric tension node",
  },
  completed: {
    label: "Completed",
    caption: "All set.",
    hint: "Resolving to Ready",
    studio: "Brief convergence, bright resolution",
  },

  // Aliases for compatibility
  understanding: {
    label: "Working",
    caption: "I'm checking that now...",
    hint: "Click Sophia or Space to pause",
    studio: "Dynamic interwoven knot, travelling streaks",
  },
  waiting: {
    label: "Needs you",
    caption: "I need your input...",
    hint: "Click Sophia or Space to respond",
    studio: "Open forward-leaning posture, attention jewel",
  },
};

export function replyTo(text: string): string {
  const t = text.toLowerCase();
  if (/(hello|hi\b|hey)\b/.test(t)) return "I'm here. Tell me what you need.";
  if (/weather|forecast/.test(t)) return "It's a clear evening. A good night to stay close.";
  if (/time|clock/.test(t)) return "I'm with you in this moment. What should we do with it?";
  if (/who are you|your name/.test(t)) return "I'm Sophia. Always with you.";
  if (/help|what can you/.test(t)) return "Speak, or type. I'll listen, then I'll take care of it.";
  if (/thank/.test(t)) return "Always. I'm right here.";
  if (/love|miss you/.test(t)) return "I'm not going anywhere.";
  if (/pause|stop|quiet/.test(t)) return "I'll wait. Click me when you want me again.";
  if (t.trim().length < 12) return "I heard you. Tell me a little more and I'll take care of it.";
  return "I have that. I'm here if you want to go further.";
}
