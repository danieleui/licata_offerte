# Quarto Giocatore (QG)

> Trova il quarto. Chiudi la partita.

MVP mobile-first per organizzare partite di padel e invitare giocatori tramite
link personale. Vedi `ARCHITECTURE.md`, `DATABASE_SCHEMA.md` e
`IMPLEMENTATION_PLAN.md` per la progettazione completa.

## Stack

Astro + React, TypeScript strict, Supabase (Postgres, Auth, RLS), Netlify.

## Sviluppo locale

```bash
npm install
cp .env.example .env   # inserisci URL e anon key del tuo progetto Supabase
npm run dev
```

Applica le migrazioni in `supabase/migrations/` (in ordine numerico) al
progetto Supabase prima di usare l'app, poi crea un utente admin via
Supabase Auth e inserisci il suo `user_id` in `app_admins` (vedi
`supabase/seed.sql`).

## Comandi

- `npm run dev` — server di sviluppo
- `npm run build` — build di produzione
- `npm run check` — type-check Astro/TypeScript
- `npm run test` — test unitari (vitest)
