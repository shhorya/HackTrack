import { db } from "@/lib/db";
import { api } from "@/lib/api";
export const GET = api(async (_r, _c, uid) => db.user.findUnique({ where: { id: uid }, select: { id: true, name: true, email: true, image: true, calendarToken: true } }));
