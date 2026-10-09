import { z } from "zod";
import { db } from "@/lib/db";
import { api, err } from "@/lib/api";
import { askJSON } from "@/lib/ai";
export const maxDuration = 60;
const B = z.object({ userEventId: z.string(), projectId: z.string().optional(), tone: z.enum(["professional", "casual", "humble", "excited"]).default("professional") });
export const POST = api(async (req, _c, uid) => {
  const b = B.parse(await req.json());
  const ue = await db.userEvent.findFirst({ where: { id: b.userEventId, userId: uid }, include: { event: true, projects: true, certificates: true, teammates: true } });
  if (!ue) return err("not found", 404);
  const pr = ue.projects.find(p => p.id === b.projectId) ?? ue.projects[0] ?? null, e = ue.event;
  const out = await askJSON(
    "You write authentic first-person LinkedIn posts for a student/developer. Rules: strong first-line hook; <=1300 chars; no invented facts, numbers or awards; mention teammates only by the names provided (tag-style @mentions are not possible, just use names); mention the result only if provided; max 3 emoji; end with a light question or thanks to organizers. " +
    (pr ? "A project exists: explain what it does, who it helps and the standout features, naming the tech stack naturally." : "No project exists (likely a workshop/meetup/learning event): focus on key takeaways, what was learned, people met, and what you'll try next. Do not pretend a project was built."),
    JSON.stringify({ tone: b.tone, event: { title: e.title, kind: e.kind, mode: e.mode, city: e.city, url: e.url, startsAt: e.startsAt }, myStatus: ue.status, team: ue.teamName, teammates: ue.teammates.map(t => ({ name: t.name, role: t.role })), result: ue.result, notes: ue.notes,
      project: pr && { name: pr.name, summary: pr.summary, features: pr.features, techStack: pr.techStack, repo: pr.repoUrl, live: pr.liveUrl } }) +
    "\nKeys: caption (string), hashtags (string[] max 5, no #), angle (one-line description of the approach)",
    z.object({ caption: z.string(), hashtags: z.array(z.string()).default([]), angle: z.string().default("") }));
  const text = `${out.caption}\n\n${out.hashtags.map(h => "#" + h.replace(/^#/, "")).join(" ")}`.trim();
  return { ...out, text, certificateUrl: ue.certificates[0]?.fileUrl ?? null, shareUrl: "https://www.linkedin.com/feed/?shareActive=true&text=" + encodeURIComponent(text) };
});
