import { db } from "@/lib/db";
import { api } from "@/lib/api";
import { Filters, buildWhere } from "@/lib/filters";
// ?presetId=… (else default preset, else no filters) · ?kind=MEETUP|WORKSHOP|… overrides kinds
export const GET = api(async (req, _c, uid) => {
  const p = new URL(req.url).searchParams, id = p.get("presetId");
  const preset = await db.preset.findFirst({ where: id ? { id, userId: uid } : { userId: uid, isDefault: true } });
  const f = Filters.parse(preset?.filters ?? {});
  if (p.get("kind")) f.kinds = [p.get("kind") as any];
  const where = buildWhere(f, uid);
  (where.AND as any[]).push({ userEvents: { none: { userId: uid } } });
  return db.event.findMany({ where, orderBy: [{ registrationDeadline: { sort: "asc", nulls: "last" } }, { startsAt: "asc" }], take: 30 });
});
