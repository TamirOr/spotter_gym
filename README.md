# Spotter

A private iPhone and Android app that gets a group of friends to the gym more often. Each person's plan, follow-through
and cheers are visible to the clique. The core loop: **see friends training → tap Going → get cheered on →
climb the leaderboard**.

Phase 1 (this repository): sign-in and sign-up with a 6-digit email code, admin approval of sign-ups and
user management, profiles, friends, goals, a weekly plan, manual
check-ins (Going and Done), cliques, the Today screen and Today bar, the consistency leaderboard, cheers,
nudges and web push. It ships as a free home-screen web app, so it costs $0 while the group is private.

## Stack

| Part    | What                                                                        | Where                          |
| ------- | --------------------------------------------------------------------------- | ------------------------------ |
| App     | Expo SDK 58, Expo Router, React Query, i18next (Hebrew first, RTL)          | `src/`                         |
| Backend | Supabase: Postgres with RLS, RPCs and triggers; Auth with email codes       | `supabase/migrations/`         |
| Push    | Standard Web Push from the `push-dispatch` Edge Function, driven by pg_cron | `supabase/functions/`          |
| Hosting | Expo Hosting (web export)                                                   | `.github/workflows/deploy.yml` |

## Layout

```
src/
  app/            Routes only. Each file re-exports a screen from a feature.
  features/<x>/   One folder per feature: api.ts (queries and mutations), pure logic with *.test.ts, components.
  ui/             Design-system primitives and tokens from the mockups.
  i18n/           he.ts (source of truth), en.ts (type-checked against it).
  lib/            Supabase client, generated database types, query keys, dates, errors.
supabase/
  migrations/     Schema, privacy rules, business rules, read models, notifications, platform wiring.
  functions/      push-dispatch (Deno) and _shared/ code that the app and the function both use.
  tests/          SQL tests that run on plain Postgres with a stub of the Supabase auth schema.
public/           PWA shell: index.html, manifest, service worker, icons.
```

## Commands

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase URL and keys
npm run web                  # dev server
npm run typecheck
npm run lint
npm test                     # Jest: domain logic, i18n, shared push text
npm run build                # web export to dist/
```

SQL tests need Postgres 15+ with `pg_trgm`:

```bash
PGHOST=localhost PGPORT=5432 PGUSER=postgres npm run test:db
```

Setting up Supabase, email-code sign-in, web push and hosting: [docs/setup.md](docs/setup.md).
