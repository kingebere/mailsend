# Mailer — Drizzle + Cloudflare D1

This project is set up for:
- Drizzle ORM
- Cloudflare D1
- OpenNext / Workers deploy
- local + production parity

## Stack
- Next.js 16
- React 19
- Drizzle ORM
- Cloudflare D1 in production
- local SQLite via `@libsql/client` during development
- OpenNext Cloudflare adapter

## Local setup

```bash
rm -rf node_modules package-lock.json .next
npm install
```

Create `.env.local` and set the app secrets you use locally:

```bash
JWT_SECRET=replace-me
NEXT_PUBLIC_APP_URL=http://localhost:3000

R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=
```

## Database

Local development uses:

```bash
file:./.data/mailer-local.db
```

Apply the local schema:

```bash
npm run db:migrate:local
```

Generate Cloudflare env typings:

```bash
npm run cf:typegen
```

Run locally:

```bash
npm run dev
```

## Cloudflare D1

Configured database:
- name: `mailer`
- id: `43926806-7448-42c1-b238-0151b78d1515`

Apply the schema remotely:

```bash
npm run db:migrate:remote
```

## Preview and deploy

Build and preview locally with OpenNext:

```bash
npm run cf:build
npm run cf:preview
```

Deploy:

```bash
npm run cf:deploy
```

## Required Cloudflare secrets

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put R2_ENDPOINT
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
npx wrangler secret put R2_BUCKET
npx wrangler secret put R2_PUBLIC_URL
```

## Notes
- Prisma has been removed from this codebase.
- Hyperdrive is not used.
- Production reads the `DB` D1 binding from the Workers runtime.
- Local development uses the same schema via the SQLite-compatible libSQL driver.
