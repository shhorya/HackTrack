# HackTrack backend (Next.js 15 + Prisma/Postgres + Auth.js + Claude)
Deploy: push to GitHub → import in Vercel → add Postgres (Neon/Vercel) + Blob store → set env from `.env.example` → deploy.
OAuth callbacks: `https://<domain>/api/auth/callback/github` and `/linkedin`. Drop the v0 UI into `app/`. First run: `GET /api/cron/sync` with `Authorization: Bearer $CRON_SECRET`.
Endpoints (all need login): events, events/import, events/:id/enrich, tracker, projects, certificates, presets, recommendations, calendar, calendar.ics?token=, captions, stats.

## Frontend
v0 UI is wired to the API (app/page.tsx, lib/api.ts, components/FluidBackground.tsx). `npm i && npm run dev`.
