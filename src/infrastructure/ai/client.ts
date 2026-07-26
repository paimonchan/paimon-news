// Klien OpenAI-compatible (OpenAI, OpenRouter, Groq, DeepSeek, Ollama, dll).
// Komunikasi lewat HTTP biasa — tanpa SDK, model bebas diganti via env.

import { config } from "@/infrastructure/config";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export interface AiResult<T> {
  data: T;
  usage: { inputTokens: number | null; outputTokens: number | null };
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export async function chatJson<T>(messages: ChatMessage[]): Promise<AiResult<T> | null> {
  if (!config.ai.configured) return null;

  try {
    const res = await fetch(`${config.ai.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.ai.apiKey}`,
      },
      body: JSON.stringify({
        model: config.ai.model,
        messages,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!res.ok) {
      console.error(`[ai] HTTP ${res.status}: ${await res.text().catch(() => "")}`);
      return null;
    }

    const body = (await res.json()) as ChatCompletionResponse;
    let content = body.choices?.[0]?.message?.content;
    if (!content) return null;

    // Bersihkan code fences (```json ... ``` atau ``` ... ```) — beberapa model (Gemini, Ollama) suka bungkus JSON
    content = content.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    return {
      data: JSON.parse(content) as T,
      usage: {
        inputTokens: body.usage?.prompt_tokens ?? null,
        outputTokens: body.usage?.completion_tokens ?? null,
      },
    };
  } catch (err) {
    console.error("[ai] gagal:", err instanceof Error ? err.message : err);
    return null;
  }
}
