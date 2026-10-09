import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
const c = new Anthropic();
export async function askJSON<T>(system: string, user: string, schema: z.ZodType<T>): Promise<T> {
  const r = await c.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5", max_tokens: 2000,
    system: system + "\nReply with ONLY one valid JSON object. No prose, no code fences.",
    messages: [{ role: "user", content: user }],
  });
  const t = r.content.map(b => (b.type === "text" ? b.text : "")).join("");
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("AI returned no JSON");
  return schema.parse(JSON.parse(m[0]));
}
export async function pageText(raw: string) {
  const u = new URL(raw);
  if (!/^https?:$/.test(u.protocol) || /^(localhost|127\.|10\.|0\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[)/.test(u.hostname)) throw new Error("blocked url");
  const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 HackTrack" }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error("fetch failed " + r.status);
  const h = await r.text();
  const meta = [...h.matchAll(/<meta[^>]+(?:name|property)=["'](?:og:|twitter:)?(?:title|description)["'][^>]*>/gi)].map(m => m[0]).join(" ");
  const body = h.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  return (meta + " " + body).slice(0, 24000);
}
