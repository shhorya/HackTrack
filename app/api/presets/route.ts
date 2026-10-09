import { z } from "zod";
import { db } from "@/lib/db";
import { api } from "@/lib/api";
import { Filters } from "@/lib/filters";
export const GET = api(async (_r, _c, uid) => db.preset.findMany({ where: { userId: uid } }));
export const POST = api(async (req, _c, uid) => {
  const b = z.object({ name: z.string().min(1).max(60), filters: Filters, isDefault: z.boolean().default(false) }).parse(await req.json());
  if (b.isDefault) await db.preset.updateMany({ where: { userId: uid }, data: { isDefault: false } });
  return db.preset.create({ data: { ...b, userId: uid } });
});
export const DELETE = api(async (req, _c, uid) => { await db.preset.deleteMany({ where: { userId: uid, id: new URL(req.url).searchParams.get("id") ?? "" } }); return { ok: true }; });
