# Migrations

## The baseline gap

The live project's schema was applied out-of-band before this directory existed. Consequences:

- The Supabase migration history on the live project (`list_migrations`) is **empty**.
- There is no replayed migration chain that reproduces the live schema.
- `supabase db reset` against this directory will **not** reproduce production. Do not rely on it.

This is a known, recorded gap — not an accident to be papered over. Do not fabricate a baseline
migration that only looks correct.

## Restoring a baseline (human step)

A full baseline requires credentials this repository does not hold (DB password or a personal
access token). From a machine with the CLI and the project password:

```bash
npx supabase link --project-ref rivfogygicrhkpfkwmlu
npx supabase db pull
```

`db pull` writes an initial migration capturing the live schema. Commit it as its own change and
record the date. Until that happens, treat the live project as the schema source of truth.

## Forward fixes only

Every schema or RPC change from now on is a dated, forward migration in this directory:

```
migrations/YYYYMMDDHHMMSS_short_description.sql
```

Rules:

- Migrations are additive and idempotent where practical (`if not exists`, `create or replace`).
- Never rewrite or delete an applied migration.
- Record data-affecting migrations (backfills, deactivations) explicitly in the file header.
- Validate on the dev project before promoting to production.
