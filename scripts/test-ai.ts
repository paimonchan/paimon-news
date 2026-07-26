import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Load .env.local manual untuk DEBUG vars (skip jika tidak ada, misal di GHA)
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([^=]+)="?([^"]*)"?$/);
    if (m) process.env[m[1]] = m[2];
  }
}

// Pakai GHA env vars dulu, fallback ke DEBUG vars
const apiKey = process.env.AI_API_KEY || process.env.AI_MODEL_API_KEY;
const baseUrl = (process.env.AI_BASE_URL || process.env.AI_MODEL_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const model = process.env.AI_MODEL || process.env.AI_MODEL_DEBUG || "gpt-4o-mini";

async function main() {
  console.log("=== Config ===");
  console.log("API Key:", apiKey ? apiKey.slice(0, 8) + "..." : "MISSING");
  console.log("Base URL:", baseUrl);
  console.log("Model:", model);
  console.log("");

  if (!apiKey) {
    console.error("FAIL: No API key");
    process.exit(1);
  }

  // Test 1: JSON mode
  console.log("=== Test 1: JSON mode ===");
  const payload = {
    model,
    messages: [
      { role: "system", content: "Kamu adalah asisten yang membantu. Jawab dengan JSON." },
      { role: "user", content: 'Balas dengan JSON: { "test": true, "model": "mimo-v2.5" }' },
    ],
    response_format: { type: "json_object" },
  };

  const res1 = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });
  const text1 = await res1.text();
  console.log("Status:", res1.status);
  console.log("Response:", text1.slice(0, 300));
  console.log("");

  if (!res1.ok) {
    console.error("FAIL: JSON mode test");
    process.exit(1);
  }

  // Test 2: config.ai.chatJson path (via env vars langsung)
  console.log("=== Test 2: Langsung seperti config.ai ===");
  const cfg = {
    apiKey: process.env.AI_API_KEY || "",
    baseUrl: (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
    model: process.env.AI_MODEL || "gpt-4o-mini",
  };
  console.log("configured:", Boolean(cfg.apiKey));
  if (cfg.apiKey) {
    const res2 = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 5,
      }),
    });
    const text2 = await res2.text();
    console.log("Status:", res2.status);
    console.log("Response:", text2.slice(0, 300));
    if (!res2.ok) {
      console.error("FAIL: config.ai path test");
      process.exit(1);
    }
  }

  console.log("ALL OK");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
