import axios from "axios";
import { MessageJobData } from "../types";
import { config } from "../config";

const cache = new Map<string, { text: string; exp: number }>();

function simpleCacheKey(channelId: string, viewerId: string, message: string) {
  return `${channelId}:${viewerId}:${message}`.slice(0, 180);
}

export class AIService {
  async generate(channelId: string, viewerId: string, message: string): Promise<string> {
    const key = simpleCacheKey(channelId, viewerId, message.toLowerCase().trim());
    const now = Date.now();
    const cached = cache.get(key);
    if (cached && cached.exp > now) {
      return cached.text;
    }

    if (!config.llmEndpoint) {
      const fallback = `Thanks for that, ${viewerId}! I think we should keep this simple and do ${message.length > 35 ? "that" : "something fun"}.`;
      cache.set(key, { text: fallback, exp: now + 5000 });
      return fallback;
    }

    try {
      const response = await axios.post(
        config.llmEndpoint,
        {
          prompt: `You are a live Twitch-style host. Keep replies short, clear, and viewer-friendly. Viewer says: ${message}`,
          max_tokens: 90,
          temperature: 0.6,
        },
        {
          headers: {
            Authorization: config.llmApiKey ? `Bearer ${config.llmApiKey}` : undefined,
          },
          timeout: config.llmTimeoutMs,
        }
      );

      const generated =
        response?.data?.text ??
        response?.data?.choices?.[0]?.message?.content ??
        "Let's continue this after this queue.";

      cache.set(key, { text: String(generated).trim(), exp: now + 5000 });
      return String(generated).trim();
    } catch {
      const fallback = config.llmFallbackText;
      cache.set(key, { text: fallback, exp: now + 3000 });
      return fallback;
    }
  }

  async generateFromJob(job: MessageJobData): Promise<string> {
    return this.generate(job.channelId, job.viewerId, job.message);
  }
}
