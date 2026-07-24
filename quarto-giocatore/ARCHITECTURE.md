# ARCHITECTURE.md — Quarto Giocatore (QG)

> "Trova il quarto. Chiudi la partita."

Questo documento descrive l'architettura tecnica dell'MVP di Quarto Giocatore (QG),
prima di qualsiasi implementazione. Nessun codice applicativo viene scritto finché
questo documento, `DATABASE_SCHEMA.md` e `IMPLEMENTATION_PLAN.md` non sono stati
verificati dall'organizzatore.

## 1. Obiettivo dell'MVP

Un solo amministratore (l'organizzatore) gestisce un proprio database privato di
giocatori di padel, crea partite e invita giocatori selezionati. I giocatori
invitati non hanno un account: ricevono un link personale e da lì possono
confermare, declinare, rinunciare o scrivere un messaggio privato all'organizzatore.

Fuori scope per questo MVP (esplicitamente esclusi): pagamenti, classifiche,
suggerimento automatico delle squadre, integrazione WhatsApp Business API.

## 2. Stack tecnico

- **Astro** con componenti **React** (isole interattive solo dove serve interattività
  client-side: form admin, azioni pubbliche di adesione). Le pagine sono per
  default statiche/SSR, senza idratazione superflua.
- **TypeScript strict** ovunque (`strict: true`, `noUncheckedIndexedAccess: true`).
- **Supabase**: Postgres, Auth (per il solo admin), Row Level Security.
- **Netlify**: hosting, adapter SSR Astro, variabili d'ambiente, deploy da branch.
- Interfaccia utente interamente in **italiano**.
- Progettazione **mobile-first**: il caso d'uso primario è il giocatore che apre
  il link personale dal telefono via WhatsApp.
- Nessuna dipendenza non necessaria: niente state manager globale, niente UI kit
  pesante, niente ORM aggiuntivo (si usa il client `@supabase/supabase-js` e i
  tipi generati dallo schema).

## 3. Ruoli e superfici applicative

| Ruolo | Autenticazione | Superficie |
|---|---|---|
| Amministratore | Supabase Auth (magic link, un solo account inizialmente) | `/admin/*`, protetta da middleware |
| Giocatore invitato | Nessun account, token personale nell'URL | `/i/[token]`, pagina pubblica |

Non esiste registrazione self-service per i giocatori: solo l'admin crea le
schede giocatore nel proprio database.

## 4. Decisione architetturale chiave: niente service role key, mai

Per rispettare "non utilizzare la service role key nel browser" nel modo più
robusto possibile, l'MVP **non usa affatto la service role key**, né lato
client né lato server. Invece:

- Tutte le tabelle hanno **RLS attiva con deny-by-default**.
- L'admin opera con il client Supabase lato browser usando la **anon key** +
  la sessione autenticata (`auth.uid()`); le policy RLS verificano
  l'appartenenza a `app_admins`.
- Il flusso pubblico (token) **non passa mai per l'accesso diretto alle
  tabelle**. Passa esclusivamente attraverso funzioni Postgres
  `SECURITY DEFINER` (RPC), che:
  1. ricevono il token in chiaro come parametro,
  2. lo hashano (SHA-256) internamente e lo confrontano con `token_hash`,
  3. eseguono la transizione di stato richiesta dentro una transazione atomica,
  4. restituiscono solo i campi "pubblici" (mai telefono, livello, affidabilità, note).

Questo elimina completamente il rischio "service role key esposta" perché
quella chiave non esiste nel perimetro applicativo: i privilegi elevati sono
incapsulati nelle funzioni RPC, non in una chiave trasportabile.

Conseguenza pratica: `anon key` e `SUPABASE_URL` sono le uniche credenziali
Supabase nel browser, e sono per design pubblicabili (la sicurezza sta nelle
RLS policy e nelle RPC, non nella segretezza della anon key).

## 5. Modello dei token personali

- Un token è legato a un singolo invito (`match_participants`), non al
  giocatore in generale: ogni invito a una partita genera un link diverso.
  Questo limita il danno di un token trapelato a una sola partita e permette
  di reinvitare con un token nuovo dopo un rifiuto.
- Generazione: funzione RPC `admin_invite_player(match_id, player_id)`,
  eseguibile solo da admin (verificato dentro la funzione), genera 32 byte
  casuali (`gen_random_bytes(32)`), li codifica in base64url, salva
  **solo l'hash SHA-256** in `token_hash` e restituisce il token in chiaro
  **una sola volta** alla UI admin, che compone il link e il messaggio
  WhatsApp precompilato.
- Nessuna tabella o log conserva il token in chiaro dopo la generazione.
- Il link pubblico ha la forma `https://<dominio>/i/<token>`.

> **Assunzione da confermare**: un token non scade automaticamente per
> definizione, ma perde di utilità pratica quando la partita passa a
> `annullata` o `conclusa` (le RPC di modifica rifiutano l'azione). Se si
> desidera una scadenza esplicita (es. 30 giorni), va aggiunta a
> `token_created_at` in una iterazione successiva.

## 6. Architettura ad alto livello

```
Browser (giocatore)                Browser (admin)
      |                                   |
      | GET /i/[token] (SSR Astro)        | Supabase Auth (magic link)
      | POST azioni via isola React       | client supabase-js (anon key + sessione)
      v                                   v
+---------------------------+     +----------------------------+
| Astro pages (SSR/Netlify) |     | Astro pages /admin/* (SSR)  |
| - /i/[token].astro        |     | - protette da middleware    |
| - isole React minime      |     | - isole React per form/CRUD |
+-------------+-------------+     +--------------+---------------+
              |                                  |
              v                                  v
      supabase.rpc(...)                  supabase.from(...) / rpc(...)
      (SECURITY DEFINER,                 (RLS: solo app_admins)
       nessun accesso diretto
       alle tabelle per anon)
              |                                  |
              +----------------+-----------------+
                               v
                        Supabase Postgres
                 (RLS + funzioni RPC + trigger di stato)
```

Netlify ospita sia le pagine SSR (Astro Netlify adapter) sia esegue le
funzioni serverless generate automaticamente dall'adapter: non servono
Netlify Functions scritte a mano per l'MVP.

## 7. Middleware e protezione delle rotte admin

Un middleware Astro (`src/middleware.ts`) verifica la sessione Supabase su
ogni richiesta a `/admin/*` (tramite i cookie di sessione Supabase SSR) e
reindirizza a `/admin/login` se assente. La verifica "sei admin" avviene
comunque anche lato database (RLS), quindi il middleware è un miglioramento
di UX, non l'unico controllo di sicurezza.

## 8. Struttura delle cartelle proposta

```
quarto-giocatore/
├── ARCHITECTURE.md
├── DATABASE_SCHEMA.md
├── IMPLEMENTATION_PLAN.md
├── README.md
├── astro.config.mjs
├── netlify.toml
├── package.json
├── tsconfig.json
├── .env.example
├── public/
│   └── favicon.svg
├── supabase/
│   ├── migrations/
│   │   ├── 0001_schema.sql
│   │   ├── 0002_rls.sql
│   │   ├── 0003_rpc_admin.sql
│   │   └── 0004_rpc_public.sql
│   └── seed.sql               (dati di sviluppo locale, opzionale)
├── src/
│   ├── middleware.ts
│   ├── env.d.ts
│   ├── layouts/
│   │   ├── AdminLayout.astro
│   │   └── PublicLayout.astro
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── login.astro
│   │   │   ├── index.astro          (dashboard: partite recenti)
│   │   │   ├── giocatori/
│   │   │   │   ├── index.astro      (elenco + filtri)
│   │   │   │   └── [id].astro       (dettaglio/modifica)
│   │   │   └── partite/
│   │   │       ├── index.astro
│   │   │       ├── nuova.astro
│   │   │       └── [id].astro       (dettaglio: inviti, stati, messaggi)
│   │   └── i/
│   │       └── [token].astro        (pagina pubblica del giocatore invitato)
│   ├── components/
│   │   ├── admin/
│   │   │   ├── PlayerForm.tsx
│   │   │   ├── PlayerFilters.tsx
│   │   │   ├── PlayerTable.tsx
│   │   │   ├── MatchForm.tsx
│   │   │   ├── InviteSelector.tsx
│   │   │   ├── ParticipantsBoard.tsx   (confermati/declinati/attesa)
│   │   │   ├── MessagesInbox.tsx
│   │   │   └── WhatsAppMessageBuilder.tsx
│   │   ├── public/
│   │   │   ├── InviteActions.tsx       (conferma/declina/rinuncia)
│   │   │   ├── ParticipantsPublicList.tsx
│   │   │   └── PrivateMessageForm.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Badge.tsx
│   │       └── Modal.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts        (browser client, anon key)
│   │   │   ├── server.ts        (client SSR con cookie di sessione, anon key)
│   │   │   └── types.ts         (tipi generati da Supabase)
│   │   ├── domain/
│   │   │   ├── matchState.ts    (helper di stato lato UI, no logica di sicurezza)
│   │   │   ├── formatters.ts    (data/ora, livello, fascia d'età)
│   │   │   └── whatsapp.ts      (template messaggi precompilati)
│   │   └── auth/
│   │       └── guards.ts
│   └── styles/
│       └── global.css
└── tests/
    └── domain/
        └── matchState.test.ts
```

## 9. Sicurezza — riepilogo dei punti chiave

1. RLS attiva su tutte le tabelle, default deny; nessuna policy per `anon` sulle
   tabelle, solo `GRANT EXECUTE` mirati sulle funzioni RPC pubbliche.
2. Nessuna service role key nel perimetro applicativo (vedi §4).
3. Token: 256 bit di entropia, mai salvato in chiaro, solo hash SHA-256.
4. Le RPC pubbliche selezionano esplicitamente le colonne da restituire
   (mai `select *`), per garantire che telefono, livello, affidabilità e
   note private non lascino mai il database verso un client pubblico.
5. Le azioni pubbliche che cambiano stato (`conferma`, `declina`, `rinuncia`,
   messaggio privato) usano `POST`, non `GET`, per evitare che crawler o
   prefetch attivino azioni per errore.
6. Le RPC verificano sempre lo stato della partita prima di accettare una
   modifica: se `stato in ('annullata','conclusa')` l'azione è rifiutata.
7. Risposta generica ("link non valido") per token inesistenti, scaduti o
   malformati: nessuna differenza di messaggio che permetta enumerazione.
8. Promozione dalla lista d'attesa e conferma sono gestite in una singola
   transazione/istruzione atomica per evitare race condition (due giocatori
   che confermano nello stesso istante sull'ultimo posto libero).
9. Cancellazione soft dei giocatori (`attivo=false`) invece di delete fisico,
   per preservare la storia delle partite passate.
10. Header di sicurezza HTTP (CSP, X-Frame-Options, Referrer-Policy) impostati
    in `netlify.toml`.

L'elenco completo di sicurezza e casi limite, con le motivazioni di design e
le alternative scartate, è nella sezione dedicata di `IMPLEMENTATION_PLAN.md`.

## 10. Punti aperti da confermare con l'organizzatore

- **Scala "affidabilità"**: assunta 1–5 intero. Confermare o correggere.
- **"Fascia d'età"**: assunta come etichetta libera scelta dall'admin
  (es. Under 25, 25-34, 35-44, 45+), indipendente dall'anno di nascita
  esatto, usata solo a scopo di filtro/informazione (non enforcement
  automatico). Confermare o correggere.
- **Promozione dalla lista d'attesa**: assunta come promozione automatica a
  "confermato" quando si libera un posto (l'admin poi avvisa via WhatsApp).
  In alternativa, il giocatore in lista d'attesa dovrebbe ri-cliccare
  "conferma" sul proprio link per attivare la promozione. Confermare quale
  comportamento è quello voluto.
- **Messaggi privati dopo annullamento**: assunto che restino consentiti
  (solo le azioni di adesione sono bloccate dopo `annullata`). Confermare.
- **`ricerca_sostituto` e `conclusa`**: assunti come stati impostati
  manualmente dall'admin nell'MVP (nessun cron automatico, per non introdurre
  dipendenze/infrastruttura non necessarie). Confermare che va bene per l'MVP.
