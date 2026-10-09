import { z } from "zod";
import { db } from "@/lib/db";
import { api } from "@/lib/api";
import { Filters, buildWhere } from "@/lib/filters";
export const GET = api(async (req, _c, uid) => {
  const p = new URL(req.url).searchParams, q = p.get("q"), kind = p.get("kind"), past = p.get("past") === "1";
  const where: any = past ? { OR: [{ createdById: null }, { createdById: uid }] } : buildWhere(Filters.parse({}), uid);
  if (q) where.title = { contains: q, mode: "insensitive" };
  if (kind) where.kind = kind;
  const page = Math.max(1, +(p.get("page") ?? 1));
  return db.event.findMany({ where, orderBy: { startsAt: "asc" }, skip: (page - 1) * 30, take: 30 });
});
const B = z.object({ title: z.string().min(1).max(200), kind: z.enum(["HACKATHON", "MEETUP", "WORKSHOP", "CONFERENCE", "OTHER"]).default("HACKATHON"),
  url: z.string().url().optional(), description: z.string().max(5000).optional(), startsAt: z.coerce.date().optional(), endsAt: z.coerce.date().optional(),
  mode: z.enum(["ONLINE", "INPERSON", "HYBRID"]).optional(), venue: z.string().optional(), city: z.string().optional(), country: z.string().optional(), isFree: z.boolean().optional() });
export const POST = api(async (req, _c, uid) =>
  db.event.create({ data: { ...B.parse(await req.json()), source: "manual", externalId: crypto.randomUUID(), createdById: uid, enrichedAt: new Date(), tags: [] } }));
