import { z } from "zod";
import { db } from "@/lib/db";
import { api, err } from "@/lib/api";
import { askJSON } from "@/lib/ai";
import { ghInfo } from "@/lib/github";
export const maxDuration = 60;
export const GET = api(async (_r, _c, uid) => db.project.findMany({ where: { userId: uid }, orderBy: { createdAt: "desc" } }));
const B = z.object({ name: z.string().min(1).max(150), userEventId: z.string().optional(), repoUrl: z.string().url().optional(), liveUrl: z.string().url().optional(),
  summary: z.string().max(3000).optional(), features: z.array(z.string()).optional(), techStack: z.array(z.string()).optional() });
export const POST = api(async (req, _c, uid) => {
  const b = B.parse(await req.json());
  if (b.userEventId && !(await db.userEvent.findFirst({ where: { id: b.userEventId, userId: uid } }))) return err("tracked event not found", 404);
  const gh = b.repoUrl ? await ghInfo(b.repoUrl).catch(() => null) : null;
  let { summary, features, techStack } = b;
  if (gh?.readme && (!summary || !features?.length)) {
    try {
      const a = await askJSON("Summarize a software project from its README.", `Keys: summary (2-3 sentences, what it does and for whom), features[] (max 6), techStack[]\n\n${gh.readme}`,
        z.object({ summary: z.string(), features: z.array(z.string()).default([]), techStack: z.array(z.string()).default([]) }));
      summary ??= a.summary; features = features?.length ? features : a.features; techStack = techStack?.length ? techStack : a.techStack;
    } catch {}
  }
  return db.project.create({ data: { ...b, userId: uid, summary, features: features ?? [], techStack: techStack ?? [], repoStars: gh?.stars, lastPushAt: gh?.pushedAt } });
});
