import { api, err } from "@/lib/api";
import { enrich } from "@/lib/enrich";
export const maxDuration = 60;
export const POST = api(async (_r, ctx) => {
  try { return (await enrich((await ctx.params).id)) ?? err("not found", 404); } catch (x: any) { return err(x.message, 422); }
});
