import { put, del } from "@vercel/blob";
import { db } from "@/lib/db";
import { api, err } from "@/lib/api";
export const GET = api(async (_r, _c, uid) => db.certificate.findMany({ where: { userId: uid }, orderBy: { createdAt: "desc" }, include: { userEvent: { include: { event: { select: { title: true } } } } } }));
export const POST = api(async (req, _c, uid) => {
  const f = await req.formData(), file = f.get("file"), title = String(f.get("title") ?? "").trim(), ue = (f.get("userEventId") as string) || null;
  if (!(file instanceof File) || !title) return err("file and title required");
  if (!/^(image\/(png|jpe?g|webp)|application\/pdf)$/.test(file.type) || file.size > 8e6) return err("png/jpg/webp/pdf up to 8MB only");
  if (ue && !(await db.userEvent.findFirst({ where: { id: ue, userId: uid } }))) return err("tracked event not found", 404);
  const blob = await put(`certs/${uid}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`, file, { access: "public" });
  const issued = f.get("issuedAt") ? new Date(String(f.get("issuedAt"))) : null;
  return db.certificate.create({ data: { userId: uid, userEventId: ue, title, fileUrl: blob.url, issuedAt: issued && !isNaN(+issued) ? issued : null } });
});
export const DELETE = api(async (req, _c, uid) => {
  const c = await db.certificate.findFirst({ where: { id: new URL(req.url).searchParams.get("id") ?? "", userId: uid } });
  if (!c) return err("not found", 404);
  await db.certificate.delete({ where: { id: c.id } });
  await del(c.fileUrl).catch(() => {});
  return { ok: true };
});
