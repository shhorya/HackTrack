import { db } from "@/lib/db";
import { api } from "@/lib/api";
export const GET = api(async (req, _c, uid) => {
  const p = new URL(req.url).searchParams, from = new Date(p.get("from") ?? Date.now() - 30 * 864e5), to = new Date(p.get("to") ?? Date.now() + 90 * 864e5);
  const rows = await db.userEvent.findMany({ where: { userId: uid, status: { not: "SKIPPED" }, event: { startsAt: { lte: to }, OR: [{ endsAt: { gte: from } }, { endsAt: null, startsAt: { gte: from } }] } }, include: { event: true } });
  return rows.map(r => ({ id: r.id, title: r.event.title, kind: r.event.kind, status: r.status, start: r.event.startsAt, end: r.event.endsAt ?? r.event.startsAt,
    mode: r.event.mode, venue: r.event.venue, url: r.event.url, registrationDeadline: r.event.registrationDeadline, rounds: r.event.rounds }));
});
