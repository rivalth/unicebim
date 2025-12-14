# UniCebim Docs

## API (OpenAPI)

- Spec file: `docs/openapi.yaml`
- Local server (default): `http://localhost:3000`

## Database (Supabase)

- Schema + RLS script: `docs/supabase.sql`

## Supabase Types (TypeScript)

This repo keeps a minimal `Database` type in `src/lib/supabase/types.ts`.

For production-grade typing, generate types from your Supabase project:

```bash
yarn supabase:types
```

Requirements:

- Supabase CLI installed (`supabase`)
- Either:
  - `SUPABASE_PROJECT_ID` env set, or
  - `supabase link --project-ref <project-ref>` completed

Output defaults to: `src/lib/supabase/types.generated.ts`

## RLS Integration Tests (optional)

There is an integration test suite that validates RLS isolation. It is **skipped by default** unless you provide:

- `SUPABASE_TEST_URL`
- `SUPABASE_TEST_ANON_KEY`
- `SUPABASE_TEST_SERVICE_ROLE_KEY`

Then run:

```bash
yarn test:run
```

## Auth (Supabase Email Confirmation)

UniCebim uses Supabase email confirmation links.

- **Callback route**: `/auth/callback`
- After confirmation, user is redirected to: `/auth/confirming` → `/dashboard`

Supabase Dashboard settings to verify:

- **Authentication → URL Configuration**
  - Site URL: `http://localhost:3000` (for local dev)
  - Redirect URLs should include: `http://localhost:3000/auth/callback`

## Timezone Strategy

UniCebim uses **UTC-based timezone strategy** for all date/time operations. See `docs/timezone-strategy.md` for detailed documentation.

**Key points:**
- All timestamps stored in UTC (`timestamptz` in PostgreSQL)
- Month boundaries calculated in UTC
- Date inputs from users are interpreted as UTC dates
- Display formatting uses browser's local timezone

**Related files:**
- `src/lib/month.ts`: UTC month range utilities
- `docs/timezone-strategy.md`: Complete timezone strategy documentation


