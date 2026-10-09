import { z } from "zod";
import { db } from "@/lib/db";
import { api, err } from "@/lib/api";
import { enrich } from "@/lib/enrich";
export const maxDuration = 60;
const phase = (e: { startsAt: Date | null; endsAt: Date | null }) => {
  const n = Date.now(), s = e.startsAt ? +e.startsAt : null, en = e.endsAt ? +e.endsAt : s;
  return en !== null && en < n ? "completed" : s !== null && s <= n ? "ongoing" : "upcoming";
};
export const GET = api(async (_r, _c, uid) => {
  const rows = await db.userEvent.findMany({ where: { userId: uid }, include: { event: true, projects: true, certificates: true, teammates: true }, orderBy: { createdAt: "desc" } });
  return rows.map(r => ({ ...r, phase: phase(r.event) }));
});
const B = z.object({ eventId: z.string(), status: z.enum(["SAVED", "REGISTERED", "PARTICIPATED", "SKIPPED"]).default("SAVED"),
  notes: z.string().max(5000).optional(), teamName: z.string().max(100).optional(), result: z.string().max(200).optional() });
export const POST = api(async (req, _c, uid) => {
  const { eventId, ...d } = B.parse(await req.json());
  const ev = await db.event.findUnique({ where: { id: eventId } });
  if (!ev || (ev.createdById && ev.createdById !== uid)) return err("event not found", 404);
  const row = await db.userEvent.upsert({ where: { userId_eventId: { userId: uid, eventId } }, create: { userId: uid, eventId, ...d }, update: d });
  if (!ev.enrichedAt) await enrich(ev.id).catch(() => {});
  return row;
});
export const DELETE = api(async (req, _c, uid) => {
  await db.userEvent.deleteMany({ where: { userId: uid, eventId: new URL(req.url).searchParams.get("eventId") ?? "" } });
  return { ok: true };
});
