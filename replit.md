# Talent Graph

A full-stack recruitment platform for a Product & Engineering search firm focused on the Indian startup ecosystem — manages candidates, clients, hiring roles ("Hiring DNA"), recruiter-scored candidate fits, a trust/referral network, placements, and revenue analytics.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/talent-graph run dev` — run the web frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed demo data (candidates, clients, roles, scores, trust, referrals, placements, activity)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional email env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` — transactional email (verification, password reset, client invites). Without SMTP config, emails are logged to the server console in development (and throw in production). `APP_URL` overrides the base URL used in email links (defaults to the first `REPLIT_DOMAINS` host).

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Frontend: React + Vite, shadcn/ui, recharts, react-force-graph-2d
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- DB schema (source of truth): `lib/db/src/schema/talent.ts`
- API contract (source of truth): `lib/api-spec/openapi.yaml` → generates `@workspace/api-zod` and `@workspace/api-client-react`
- Server routes: `artifacts/api-server/src/routes/*.ts` (registered in `routes/index.ts`)
- Business logic helpers: `artifacts/api-server/src/lib/talent.ts` (composite score, trust weights, scout score)
- DB-row → API-response mappers: `artifacts/api-server/src/lib/mappers.ts` (includes `iso()` Date→string helper)
- Frontend pages: `artifacts/talent-graph/src/pages/*.tsx`
- Seed script: `scripts/src/seed.ts`

## Architecture decisions

- OpenAPI-first: the spec drives generated Zod schemas (server validation) and React Query hooks (client). Never change the OpenAPI `info.title` — it controls generated filenames.
- Candidate scores are recruiter-input only (not auto-computed); composite = roleFit*0.4 + evidence*0.25 + leadership*0.15 + trust*0.1 + evaluation*0.1.
- Trust edges auto-create reverse edges: WORKED_WITH self-reverses; MANAGED ↔ MANAGED_BY.
- Postgres `timestamp` columns return `Date` objects but response schemas require ISO strings — always wrap timestamp fields with `iso()` before `Response.parse()`. Date-only columns already return strings.

## Product

- Candidates: profiles, skills matrix, career timeline, recruiter notes, composite scoring.
- Roles ("Hiring DNA"): client mandates with must/nice skills, comp ranges (₹ LPA), success criteria; pipeline kanban by stage.
- Clients: companies with their roles, placements, and fee totals.
- Trust Graph: force-directed network of candidate trust/referral relationships.
- Referrals: scout leaderboard (scoutScore = submitted*1 + shortlisted*5 + interviewed*10 + hired*50; TalentScout ≥ 100).
- Placements: confirmed hires with fee computation; placing a candidate marks the role, candidate, and that role's score as PLACED.
- Analytics: revenue vs target, pipeline funnel + bottleneck, source effectiveness, referral health.
- Accounts/Auth: email verification on signup (unverified-email banner with resend in the app shell); password reset (forgot/reset pages); admin invites a client user from the client detail page, tying them to that company. Single-use, hashed, expiring tokens (`authTokensTable`): verify 24h, reset 1h, invite 7d. Invited users start with `passwordHash=null` and set their password via the accept-invite link.

## User preferences

- Dark mode by default.
- No emojis anywhere in the UI.
- Indian compensation formatting: ₹ LPA for salaries, ₹ Cr for revenue/fees.

## Gotchas

- Always wrap `timestamp`-column values with `iso()` before passing to a generated `Response.parse()`, or Zod will reject the `Date` object.
- When marking scores as PLACED on a placement, filter by BOTH `candidateId` AND `roleId` — never `candidateId` alone (that would mark all of a candidate's role scores).
- Dossier score lookup must use the exact candidate+role pair; do not fall back to an unrelated role's score.
- Referrer portal referrals submit external candidates with `candidateId: null` — the self-referral rule must match the referrer's own email/name, not just `candidateId`, or self-referral is bypassable.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
