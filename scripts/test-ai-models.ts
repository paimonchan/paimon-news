import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
const lines = readFileSync(envPath, "utf-8").split("\n");
for (const line of lines) {
  const m = line.match(/^([^=]+)="?([^"]*)"?$/);
  if (m) process.env[m[1]] = m[2];
}

const apiKey = process.env.AI_MODEL_API_KEY;
const baseUrl = process.env.AI_MODEL_URL.replace(/\/$/, "");

const models = ["mimo-v2.5", "mimo-v2.5-pro", "gpt-4o-mini", "gpt-3.5-turbo", "deepseek-chat", "claude-3-haiku"];

async function testModel(model: string) {
  console.log("Trying model:", model);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: "user", content: "hi" }], max_tokens: 5 }),
    });
    const text = await res.text();
    console.log("Status:", res.status, text.slice(0, 300));
    console.log("---");
    return res.ok;
  } catch (e: any) {
    console.log("Error:", e.message);
    return false;
  }
}

async function main() {
  for (const m of models) {
    if (await testModel(m)) {
      console.log("WORKS:", m);
      break;
    }
  }
}
main();
