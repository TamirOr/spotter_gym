# CLAUDE.md

Spotter: a private Hebrew-first web app for iPhone and Android for a clique of friends. See README.md for the layout and
docs/setup.md for the platform. Expo-specific guidance is in @AGENTS.md.

## Principles

1. **Business rules live in the database** (RLS, guard triggers, RPCs in `supabase/migrations/`). The app
   never re-implements a rule the server enforces; it may mirror one only for optimistic UI or filtering.
2. **Clean, small modules.** Pure logic sits next to its feature as plain functions with a `*.test.ts`.
   Components render; `api.ts` files hold queries and mutations; routes in `src/app/` only re-export screens.
3. **No duplication.** Query keys live in `src/lib/queryKeys.ts`. Code the app and Edge Functions share lives
   in `supabase/functions/_shared/` and is imported as `@shared/...`.
4. **All UI text in `src/i18n/he.ts` and `en.ts`.** No string literals in components except the brand name.
   Wording avoids gendered Hebrew verbs. Text people write renders with `userContent` (direction `auto`).
5. **Tests with every change.** A database rule gets a case in `supabase/tests/test_*.sql`, including the
   "should fail" side. Client logic gets a Jest test next to it.

## Conventions

- Functions are executable by nobody by default. Grant `execute ... to authenticated` right after a function
  the app calls; leave server-only helpers ungranted.
- Security definer functions set `search_path = ''` and qualify every name.
- Server errors are raised with a stable snake_case message and mapped in `src/lib/errors.ts`.
- Nothing personal goes to logs or push text beyond a first name: ids and counts only.
- Commits use Conventional Commits (`feat(db): …`, `fix(app): …`).

## Before committing

```bash
npm run typecheck && npm run lint && npm test
PGHOST=... PGPORT=... PGUSER=postgres npm run test:db
```
