import { db } from "@/lib/db";
// Per-user feed: subscribe in Google/Apple Calendar → /api/calendar.ics?token=<user.calendarToken>
const f = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
const esc = (s: string) => s.replace(/[\\;,]/g, m => "\\" + m).replace(/\r?\n/g, "\\n");
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  const u = token ? await db.user.findUnique({ where: { calendarToken: token } }) : null;
  if (!u) return new Response("not found", { status: 404 });
  const rows = await db.userEvent.findMany({ where: { userId: u.id, status: { not: "SKIPPED" }, event: { startsAt: { not: null } } }, include: { event: true } });
  const ev = rows.map(({ event: e }) => ["BEGIN:VEVENT", `UID:${e.id}@hackhub`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(e.startsAt!)}`,
    `DTEND:${f(e.endsAt ?? new Date(+e.startsAt! + 36e5))}`, `SUMMARY:${esc(e.title)}`, e.venue ? `LOCATION:${esc(e.venue)}` : "", e.url ? `URL:${e.url}` : "", "END:VEVENT"].filter(Boolean).join("\r\n"));
  return new Response(["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:	-//HackTrack//EN", "	X-WR-CALNAME:HackTrack", ...ev, "END:VCALENDAR"].join("\r\n"), { headers: { "content-type": "text/calendar; charset=utf-8" } });
}
