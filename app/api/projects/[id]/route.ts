import { z } from "zod";
import { db } from "@/lib/db";
import { api, err } from "@/lib/api";
const B = z.object({ name: z.string().max(150), userEventId: z.string().nullable(), repoUrl: z.string().url().nullable(), liveUrl: z.string().url().nullable(),
  summary: z.string().max(3000), features: z.array(z.string()), techStack: z.array(z.string()) }).partial();
export const PATCH = api(async (req, ctx, uid) => {
  const id = (await ctx.params).id, b = B.parse(await req.json());
  if (b.userEventId && !(await db.userEvent.findFirst({ where: { id: b.userEventId, userId: uid } }))) return err("tracked event not found", 404);
  const r = await db.project.updateMany({ where: { id, userId: uid }, data: b });
  return r.count ? db.project.findUnique({ where: { id } }) : err("not found", 404);
});
export const DELETE = api(async (_r, ctx, uid) => { await db.project.deleteMany({ where: { id: (await ctx.params).id, userId: uid } }); return { ok: true }; });
