import { db } from "@/lib/db";
import { api } from "@/lib/api";
export const GET = api(async (_r, _c, uid) => {
  const now = new Date(), w = { userId: uid };
  const [byStatus, upcoming, completed, projects, certificates] = await Promise.all([
    db.userEvent.groupBy({ by: ["status"], where: w, _count: true }),
    db.userEvent.count({ where: { ...w, status: { in: ["SAVED", "REGISTERED"] }, event: { OR: [{ startsAt: { gt: now } }, { endsAt: { gt: now } }] } } }),
    db.userEvent.count({ where: { ...w, event: { endsAt: { lt: now } } } }),
    db.project.count({ where: w }), db.certificate.count({ where: w }),
  ]);
  return { byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count])), upcoming, completed, projects, certificates };
});
