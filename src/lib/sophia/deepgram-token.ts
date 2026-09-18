import { createServerFn } from "@tanstack/react-start";

/**
 * Server-side token / credential handler for Deepgram Voice Agent and Wake Word.
 *
 * Reads DEEPGRAM_API_KEY from server environment variables.
 * Uses the regional India Voice Agent endpoint: wss://api.in.deepgram.com/v1/agent/converse.
 * Tries /v1/auth/grant for keys with JWT grant permissions; falls back to the
 * server-configured key for accounts with standard inference scopes.
 *
 * The API key is securely retrieved at runtime via server function, never baked
 * into client build bundles or hardcoded in source.
 */
export const getDeepgramToken = createServerFn({ method: "GET" }).handler(
  async () => {
    const apiKey = process.env.DEEPGRAM_API_KEY;

    if (!apiKey) {
      throw new Error(
        "DEEPGRAM_API_KEY is not configured on the server. Please set it in your .env file.",
      );
    }

    const agentWssUrl = "wss://api.in.deepgram.com/v1/agent/converse";
    let token: string | undefined;

    // Attempt to mint short-lived JWT via India endpoint first
    try {
      const inRes = await fetch("https://api.in.deepgram.com/v1/auth/grant", {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl_seconds: 300 }),
      });

      if (inRes.ok) {
        const inData = (await inRes.json()) as { access_token?: string };
        token = inData.access_token;
      }
    } catch {
      // Ignore network error; fallback below
    }

    // If /v1/auth/grant returned 403 or failed (standard usage key), use the server key
    if (!token) {
      token = apiKey;
    }

    return { token, endpoint: agentWssUrl };
  },
);
