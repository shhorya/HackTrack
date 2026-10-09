export async function ghInfo(repoUrl: string) {
  const m = repoUrl.match(/github\.com\/([^/]+)\/([^/#?]+)/);
  if (!m) return null;
  const base = `https://api.github.com/repos/${m[1]}/${m[2].replace(/\.git$/, "")}`;
  const h: Record<string, string> = { "user-agent": "hacktrack", accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) h.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const r = await fetch(base, { headers: h });
  if (!r.ok) return null;
  const j = await r.json();
  const rd = await fetch(base + "/readme", { headers: { ...h, accept: "application/vnd.github.raw+json" } });
  return { stars: j.stargazers_count as number, pushedAt: new Date(j.pushed_at), language: j.language as string | null, readme: rd.ok ? (await rd.text()).slice(0, 8000) : "" };
}
