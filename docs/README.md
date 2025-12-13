# UniCebim Docs

## API (OpenAPI)

- Spec file: `docs/openapi.yaml`
- Local server (default): `http://localhost:3000`

## Database (Supabase)

- Schema + RLS script: `docs/supabase.sql`

## Auth (Supabase Email Confirmation)

UniCebim uses Supabase email confirmation links.

- **Callback route**: `/auth/callback`
- After confirmation, user is redirected to: `/auth/confirming` → `/dashboard`

Supabase Dashboard settings to verify:

- **Authentication → URL Configuration**
  - Site URL: `http://localhost:3000` (for local dev)
  - Redirect URLs should include: `http://localhost:3000/auth/callback`


