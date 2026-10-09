import { z } from "zod";
import { db } from "@/lib/db";
import { api, err } from "@/lib/api";
import { enrich } from "@/lib/enrich";
export const maxDuration = 60;
export const POST = api(async (req) => {
  const { url } = z.object({ url: z.string().url() }).parse(await req.json());
  const e = await db.event.upsert({ where: { source_externalId: { source: "import", externalId: url } }, update: {},
    create: { source: "import", externalId: url, url, title: "Importing…", tags: [] } });
  try { return await enrich(e.id) ?? err("not found", 404); } catch (x: any) { return err("Could not read that page: " + x.message, 422); }
});
