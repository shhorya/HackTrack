import { z } from "zod";
import { db } from "@/lib/db";
import { api, err } from "@/lib/api";
const B = z.object({ name: z.string().min(1).max(100), role: z.string().max(60).optional(), email: z.string().email().optional(),
  linkedinUrl: z.string().url().optional(), githubUrl: z.string().url().optional() });
const owns = (id: string, userId: string) => db.userEvent.findFirst({ where: { id, userId } });
// GET ?userEventId=…  → teammates for one tracked event
export const GET = api(async (req, _c, uid) => {
  const id = new URL(req.url).searchParams.get("userEventId") ?? "";
  return (await owns(id, uid)) ? db.teammate.findMany({ where: { userEventId: id }, orderBy: { createdAt: "asc" } }) : err("not found", 404);
});
export const POST = api(async (req, _c, uid) => {
  const { userEventId, ...b } = B.extend({ userEventId: z.string() }).parse(await req.json());
  if (!(await owns(userEventId, uid))) return err("tracked event not found", 404);
  return db.teammate.create({ data: { ...b, userEventId, userId: uid } });
});
export const PATCH = api(async (req, _c, uid) => {
  const { id, ...b } = B.partial().extend({ id: z.string() }).parse(await req.json());
  const r = await db.teammate.updateMany({ where: { id, userId: uid }, data: b });
  return r.count ? db.teammate.findUnique({ where: { id } }) : err("not found", 404);
});
export const DELETE = api(async (req, _c, uid) => {
  await db.teammate.deleteMany({ where: { userId: uid, id: new URL(req.url).searchParams.get("id") ?? "" } });
  return { ok: true };
});
