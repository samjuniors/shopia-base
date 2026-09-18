import { createServerFn } from "@tanstack/react-start";

/**
 * Server-side token exchange for Deepgram Voice Agent.
 *
 * Reads DEEPGRAM_API_KEY from server environment variables.
 * Calls Deepgram's /v1/auth/grant endpoint to mint a short-lived (5 min) JWT.
 * Tries the India regional endpoint (api.in.deepgram.com) first per requirements,
 * with graceful fallback to the global endpoint (api.deepgram.com).
 * The raw API key NEVER reaches client-side code.
 */
export const getDeepgramToken = createServerFn({ method: "GET" }).handler(
  async () => {
    const apiKey = process.env.DEEPGRAM_API_KEY;

    if (!apiKey) {
      throw new Error("DEEPGRAM_API_KEY is not configured on the server. Please set it in your .env file.");
    }

    // Try India endpoint first
    let token: string | undefined;
    let agentWssUrl = "wss://agent.in.deepgram.com/v1/agent/converse";

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
      // Fallback to global endpoint
    }

    // Fallback to global endpoint if India grant didn't succeed
    if (!token) {
      agentWssUrl = "wss://agent.deepgram.com/v1/agent/converse";
      const globalRes = await fetch("https://api.deepgram.com/v1/auth/grant", {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ttl_seconds: 300 }),
      });

      if (!globalRes.ok) {
        const errBody = await globalRes.text();
        console.error("[deepgram-token] Token grant failed:", globalRes.status, errBody);
        throw new Error(`Failed to obtain Deepgram token (${globalRes.status}). Verify your DEEPGRAM_API_KEY.`);
      }

      const globalData = (await globalRes.json()) as { access_token?: string };
      token = globalData.access_token;
    }

    if (!token) {
      throw new Error("No access_token returned by Deepgram authentication service.");
    }

    return { token, endpoint: agentWssUrl };
  },
);
