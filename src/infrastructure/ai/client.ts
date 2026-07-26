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

/** Cari JSON value pertama (object atau array) dalam string, buang teks sebelum/sesudah. */
function extractJson(raw: string): string {
  const idx = raw.search(/[[{]/);
  if (idx === -1) return raw;
  const first = raw[idx];
  const close = first === "[" ? "]" : "}";
  let depth = 0, inStr = false;
  for (let i = idx; i < raw.length; i++) {
    const ch = raw[i];
    if (inStr) {
      if (ch === "\\") { i++; continue; }
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === first) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return raw.slice(idx, i + 1);
    }
  }
  return raw;
}

export async function chatJson<T>(messages: ChatMessage[]): Promise<AiResult<T> | null> {
  if (!config.ai.configured) {
    console.log("[ai] SKIP: configured=" + config.ai.configured + " key=" + (config.ai.apiKey ? "set" : "unset") + " model=" + config.ai.model);
    return null;
  }

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
        response_format: { type: "json_object" },
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

    // Bersihkan code fences & teks luar JSON
    content = content.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    content = extractJson(content);

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
