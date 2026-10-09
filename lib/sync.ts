import { db } from "./db";
const dt = (s: any) => (s && !isNaN(+new Date(s)) ? new Date(s) : null);
const get = async (u: string, init?: RequestInit) => {
  const r = await fetch(u, { ...init, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(u + " -> " + r.status);
  return r.json();
};
// NOTE: field names below follow these sites' public JSON endpoints as last known; verify with one /api/cron/sync run.
const sources: Record<string, () => Promise<any[]>> = {
  async devfolio() {
    const j = await get("https://api.devfolio.co/api/search/hackathons", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "application_open", from: 0, size: 30 }) });
    return (j.hits?.hits ?? []).map((h: any) => h._source).map((s: any) => ({
      externalId: String(s.uuid ?? s.slug), title: s.name, url: `https://${s.slug}.devfolio.co`, description: s.desc ?? s.tagline ?? null,
      startsAt: dt(s.starts_at), endsAt: dt(s.ends_at), registrationDeadline: dt(s.reg_ends_at ?? s.registration_ends_at),
      mode: s.is_online ? "ONLINE" : "INPERSON", city: s.city ?? null, country: s.country ?? null, venue: s.location ?? null, imageUrl: s.cover_img ?? null, isFree: true,
    }));
  },
  async unstop() {
    const j = await get("https://unstop.com/api/public/opportunity/search-result?opportunity=hackathons&per_page=30&oppstatus=open");
    return (j.data?.data ?? []).map((s: any) => ({
      externalId: String(s.id), title: s.title, url: s.public_url?.startsWith("http") ? s.public_url : `https://unstop.com/${s.public_url}`,
      startsAt: dt(s.start_date), endsAt: dt(s.end_date), registrationDeadline: dt(s.regnRequirements?.end_regn_dt),
      mode: /online/i.test(s.region ?? "") ? "ONLINE" : /offline|in.?person/i.test(s.region ?? "") ? "INPERSON" : null,
      imageUrl: s.logoUrl2 ?? null, prize: s.prizes?.[0]?.cash ? `₹${s.prizes[0].cash}` : null,
    }));
  },
};
export async function runSync() {
  const out: Record<string, string> = {};
  for (const [source, fn] of Object.entries(sources)) {
    try {
      const items = (await fn()).filter(i => i.title && i.externalId);
      for (const i of items) {
        const { externalId, ...rest } = i;
        await db.event.upsert({ where: { source_externalId: { source, externalId } }, create: { source, externalId, kind: "HACKATHON", tags: [], ...rest }, update: rest });
      }
      out[source] = `ok ${items.length}`;
    } catch (e: any) { out[source] = "error: " + e.message; }
  }
  return out;
}
