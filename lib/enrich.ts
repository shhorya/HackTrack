import { z } from "zod";
import { db } from "./db";
import { askJSON, pageText } from "./ai";
const S = z.string().nullish();
const X = z.object({
  title: S, kind: z.enum(["HACKATHON", "MEETUP", "WORKSHOP", "CONFERENCE", "OTHER"]).nullish(),
  description: S, problemStatements: z.array(z.string()).default([]), rules: S,
  rounds: z.array(z.object({ name: z.string(), start: S, end: S, mode: S })).default([]),
  startsAt: S, endsAt: S, registrationDeadline: S, mode: z.enum(["ONLINE", "INPERSON", "HYBRID"]).nullish(),
  venue: S, city: S, country: S, isFree: z.boolean().nullish(), prize: S, tags: z.array(z.string()).default([]),
});
const d = (s?: string | null) => (s && !isNaN(+new Date(s)) ? new Date(s) : null);
const empty = (j: unknown) => !Array.isArray(j) || j.length === 0;
export async function enrich(id: string) {
  const e = await db.event.findUnique({ where: { id } });
  if (!e?.url) return e;
  const text = await pageText(e.url);
  const x = await askJSON(
    "Extract event details from this web page text. Use null/[] when unknown; never guess. Dates as ISO 8601. rounds = stages/phases of the event with dates.",
    `URL: ${e.url}\nKeys: title, kind, description (<=600 chars), problemStatements[], rules (<=1500 chars), rounds[{name,start,end,mode}], startsAt, endsAt, registrationDeadline, mode(ONLINE|INPERSON|HYBRID), venue, city, country, isFree, prize, tags[]\n\n${text}`, X);
  return db.event.update({ where: { id }, data: {
    title: e.title === "Importing…" ? x.title || e.url : e.title,
    kind: e.source === "import" ? x.kind ?? e.kind : e.kind,
    description: e.description ?? x.description, rules: e.rules ?? x.rules,
    problemStatements: empty(e.problemStatements) ? x.problemStatements : undefined,
    rounds: empty(e.rounds) ? x.rounds : undefined,
    startsAt: e.startsAt ?? d(x.startsAt), endsAt: e.endsAt ?? d(x.endsAt),
    registrationDeadline: e.registrationDeadline ?? d(x.registrationDeadline),
    mode: e.mode ?? x.mode, venue: e.venue ?? x.venue, city: e.city ?? x.city, country: e.country ?? x.country,
    isFree: e.isFree ?? x.isFree, prize: e.prize ?? x.prize,
    tags: e.tags.length ? e.tags : x.tags, enrichedAt: new Date(),
  } });
}
