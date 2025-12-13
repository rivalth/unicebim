# UniCebim (Student Budget Tracker MVP)

UniCebim is a modern budget & expense tracker for university students.

## Tech Stack

- Next.js (App Router, `src/app`)
- TypeScript
- Tailwind CSS
- shadcn/ui-style components
- React Hook Form + Zod
- Zustand (client state)
- Supabase (Auth + Postgres)
- Vitest + Testing Library

## Local Setup

1. Install deps:

```bash
yarn
```

2. Configure env:

```bash
cp env.example .env.local
```

Fill `.env.local` with values from Supabase Dashboard → Project Settings → API:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Run dev server:

```bash
yarn dev
```

Open `http://localhost:3000`.

## Scripts

- `yarn lint`
- `yarn test` (watch)
- `yarn test:run` (CI)
- `yarn build`

## API Docs

OpenAPI spec: `docs/openapi.yaml`

## Supabase Schema (assumed)

See prompt/SQL used for the MVP tables:

- `profiles` (users)
- `transactions`

