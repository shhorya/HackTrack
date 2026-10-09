import { z } from "zod";
import type { Prisma } from "@prisma/client";
export const Filters = z.object({
  city: z.string().optional(), country: z.string().optional(), includeOnline: z.boolean().default(true),
  mode: z.enum(["ONLINE", "INPERSON", "HYBRID"]).optional(), isFree: z.boolean().optional(),
  kinds: z.array(z.enum(["HACKATHON", "MEETUP", "WORKSHOP", "CONFERENCE", "OTHER"])).optional(),
  tags: z.array(z.string()).optional(), sources: z.array(z.string()).optional(),
});
export type F = z.infer<typeof Filters>;
export const buildWhere = (f: F, uid: string): Prisma.EventWhereInput => {
  const now = new Date(), A: Prisma.EventWhereInput[] = [
    { OR: [{ endsAt: { gte: now } }, { startsAt: { gte: now } }] },
    { OR: [{ createdById: null }, { createdById: uid }] },
  ];
  const loc: Prisma.EventWhereInput[] = [];
  if (f.city) loc.push({ city: { contains: f.city, mode: "insensitive" } });
  if (f.country) loc.push({ country: { contains: f.country, mode: "insensitive" } });
  if (loc.length) A.push({ OR: [...loc, ...(f.includeOnline ? [{ mode: "ONLINE" as const }] : [])] });
  if (f.mode) A.push({ mode: f.mode });
  if (f.isFree !== undefined) A.push({ isFree: f.isFree });
  if (f.kinds?.length) A.push({ kind: { in: f.kinds } });
  if (f.tags?.length) A.push({ tags: { hasSome: f.tags } });
  if (f.sources?.length) A.push({ source: { in: f.sources } });
  return { AND: A };
};
