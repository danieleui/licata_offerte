# IMPLEMENTATION_PLAN.md — Quarto Giocatore (QG)

Questo piano è organizzato in fasi sequenziali, ciascuna con un output
verificabile. Nessuna fase inizia prima che `ARCHITECTURE.md` e
`DATABASE_SCHEMA.md` siano stati verificati e le assunzioni aperte confermate.

## Fase 0 — Setup progetto

- Scaffold Astro (`npm create astro@latest`) con integrazione `@astrojs/react`
  e adapter `@astrojs/netlify`.
- `tsconfig.json` in modalità strict (`strict`, `noUncheckedIndexedAccess`,
  `noImplicitOverride`, `exactOptionalPropertyTypes`).
- `.env.example` con `PUBLIC_SUPABASE_URL` e `PUBLIC_SUPABASE_ANON_KEY`
  (nessuna variabile "segreta" perché non serve service role key, vedi
  ARCHITECTURE.md §4).
- `netlify.toml` con header di sicurezza (CSP, X-Frame-Options,
  Referrer-Policy, X-Content-Type-Options).
- Progetto Supabase creato manualmente dall'organizzatore (fuori dal repo);
  qui si versiona solo lo schema in `supabase/migrations/`.

**Output verificabile**: `npm run build` passa, deploy preview su Netlify
mostra una pagina placeholder.

## Fase 1 — Schema database e sicurezza

- Migrazioni SQL da `DATABASE_SCHEMA.md`: tabelle, vincoli, indici, RLS,
  funzioni RPC (pubbliche e admin).
- Generazione tipi TypeScript dallo schema (`supabase gen types typescript`)
  in `src/lib/supabase/types.ts`.
- Script di verifica RLS: query manuali con la `anon key` per confermare che
  `select * from players` fallisca (0 righe, non errore che riveli struttura).

**Output verificabile**: con la sola anon key, l'accesso diretto alle tabelle
restituisce insiemi vuoti; le RPC pubbliche funzionano con un token di test.

## Fase 2 — Autenticazione admin

- Supabase Auth con **magic link** (niente password da gestire per un singolo
  organizzatore; superficie di attacco più piccola di email+password).
- Riga in `app_admins` inserita manualmente per il primo organizzatore (via
  SQL editor Supabase, non da UI, per l'MVP a singolo admin).
- `src/middleware.ts`: legge la sessione dai cookie SSR di Supabase,
  reindirizza a `/admin/login` se assente su ogni rotta `/admin/*`.

**Output verificabile**: login via magic link funziona; senza sessione,
`/admin` reindirizza al login; con sessione ma senza riga in `app_admins`,
ogni azione RLS-protetta fallisce silenziosamente (0 righe / errore RLS).

## Fase 3 — Gestione giocatori (admin)

- CRUD completo su `players` tramite isole React (`PlayerForm`, `PlayerTable`).
- `PlayerFilters`: filtro per sesso, fascia d'età, livello (min/max), lato
  preferito, stato attivo/inattivo — client-side su dati già caricati per
  l'MVP (il volume atteso è basso; niente ricerca full-text lato server).
- Cancellazione = toggle `attivo`, mai delete fisico dalla UI.

**Output verificabile**: creare, modificare, disattivare un giocatore;
verificare che campi privati non compaiano mai fuori da `/admin`.

## Fase 4 — Gestione partite (admin)

- CRUD `matches`: creazione in stato `bozza`, modifica campi, transizione
  esplicita `bozza → aperta_campo_da_prenotare` / `aperta_campo_prenotato`
  quando l'admin decide di aprire la partita agli inviti.
- Azione "segna campo come prenotato" (`stato_campo: da_prenotare → prenotato`):
  ricalcola `stato` della partita secondo la matrice in §Fase 6.
- Azione "annulla partita" con campo motivo obbligatorio (`admin_annulla_partita`).

**Output verificabile**: creare una partita, cambiarne lo stato del campo,
annullarla con motivo; verificare che dopo annullamento nessuna azione
pubblica sia più accettata (testato in Fase 7).

## Fase 5 — Selezione e invito giocatori

- `InviteSelector`: lista filtrabile dei giocatori attivi, selezione multipla,
  invito in blocco → chiama `admin_invite_player` per ciascuno.
- `WhatsAppMessageBuilder`: genera testo precompilato con link personale,
  usando `wa.me/<telefono>?text=<messaggio-encodato>`; l'admin copia/apre il
  link, l'invio resta un'azione manuale dell'admin (niente API Business).
- Gestione re-invito dopo rifiuto: stesso flusso, la RPC aggiorna la riga
  esistente e genera un nuovo token.

**Output verificabile**: invitare 4+ giocatori a una partita, generare i
messaggi WhatsApp, verificare che ogni link sia unico e funzionante.

## Fase 6 — Macchina a stati della partita

Pseudocodice della logica dentro `rpc_rispondi_invito`, eseguita dentro la
transazione con le righe già lockate (`for update`, vedi DATABASE_SCHEMA.md §7.2):

```
onConferma:
  confermati = count(match_participants where match_id=X and stato='confermato')
  se confermati < 4:
    partecipazione.stato = 'confermato'
    partecipazione.risposto_at = now()
  altrimenti:
    partecipazione.stato = 'lista_attesa'
    partecipazione.posizione_attesa = prossimo_numero_in_coda
    partecipazione.risposto_at = now()
  ricalcola_stato_partita()

onDeclina:
  partecipazione.stato = 'declinato'
  partecipazione.risposto_at = now()
  # nessun impatto su conteggio confermati

onRinuncia:
  era_confermato = partecipazione.stato == 'confermato'
  partecipazione.stato = 'rinunciato'
  se era_confermato:
    primo_in_attesa = match_participants
      where match_id=X and stato='lista_attesa'
      order by posizione_attesa asc limit 1 for update
    se primo_in_attesa esiste:
      primo_in_attesa.stato = 'confermato'
      primo_in_attesa.posizione_attesa = null
      # promozione automatica — vedi assunzione in ARCHITECTURE.md §10
  ricalcola_stato_partita()

ricalcola_stato_partita():
  confermati = count(stato='confermato')
  se partita.stato in ('annullata','conclusa'):
    return  # mai toccare uno stato terminale
  se confermati == 4:
    partita.stato = partita.stato_campo == 'prenotato'
      ? 'confermata'
      : 'completa_campo_da_prenotare'
  altrimenti se confermati < 4:
    se partita.stato in ('confermata','completa_campo_da_prenotare','ricerca_sostituto'):
      # si è liberato un posto senza lista d'attesa da promuovere
      partita.stato = partita.stato_campo == 'prenotato'
        ? 'aperta_campo_prenotato'
        : 'aperta_campo_da_prenotare'
      # nota: 'ricerca_sostituto' resta uno stato impostabile manualmente
      # dall'admin quando vuole segnalare la ricerca attiva di un sostituto;
      # qui si riapre semplicemente agli inviti standard
```

Quando l'admin segna il campo come prenotato:

```
onCampoRenotato:
  partita.stato_campo = 'prenotato'
  se count(stato='confermato') == 4:
    partita.stato = 'confermata'
  altrimenti se partita.stato == 'aperta_campo_da_prenotare':
    partita.stato = 'aperta_campo_prenotato'
  altrimenti se partita.stato == 'completa_campo_da_prenotare':
    partita.stato = 'confermata'   # già a 4, ora anche il campo è pronto
```

**Output verificabile**: sequenza di test manuali che copre ogni transizione
della tabella sopra, incluso il caso di due conferme quasi simultanee
sull'ultimo posto (verificare che una vada a `confermato` e l'altra a
`lista_attesa`, mai due `confermato` in eccesso).

## Fase 7 — Pagina pubblica del giocatore

- `/i/[token].astro`: SSR, chiama `rpc_get_invito` server-side per il render
  iniziale (evita di esporre logica in JS client), poi isola React
  (`InviteActions`) per le azioni via `POST` a `rpc_rispondi_invito`.
- Stati UI: invitato (mostra 3 azioni), confermato, lista d'attesa (mostra
  posizione), declinato, rinunciato, partita annullata (sola lettura +
  motivo), partita conclusa (sola lettura).
- `PrivateMessageForm`: invio libero in qualunque stato (vedi assunzione).
- Pagina di errore generica per token invalido/non trovato (nessun dettaglio
  sul motivo).

**Output verificabile**: percorso completo dal link WhatsApp alla conferma,
su viewport mobile reale (o emulato ≤390px di larghezza).

## Fase 8 — Dashboard admin per partita

- `ParticipantsBoard`: colonne confermati / lista d'attesa / declinati /
  rinunciati, con accesso ai campi privati (telefono, livello, affidabilità,
  note) solo qui.
- `MessagesInbox`: messaggi privati per partita, marcatura come letti
  (`letto_at`).

**Output verificabile**: un cambiamento di stato fatto dal giocatore sulla
pagina pubblica si riflette nella dashboard admin (refresh o realtime
opzionale — vedi Fase 9).

## Fase 9 — Rifinitura e hardening

- Validazione Zod lato client per tutti i form admin, a specchio dei vincoli
  DB (difesa in profondità, non sostituzione dei CHECK).
- Verifica manuale di tutti i punti di sicurezza elencati sotto.
- Eventuale Supabase Realtime su `match_participants` per aggiornare la
  dashboard admin senza refresh (valutare se giustifica la dipendenza
  aggiuntiva rispetto a un semplice polling/refresh manuale — per l'MVP si
  può partire senza, per rispettare "nessuna dipendenza non necessaria").

## Fase 10 — Deploy

- Collegamento repo → sito Netlify, branch di produzione da definire con
  l'organizzatore.
- Variabili d'ambiente Netlify: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`.
- Smoke test end-to-end in produzione: login admin, creazione partita,
  invito, risposta pubblica, annullamento.

---

## Sicurezza — elenco completo

1. **Nessuna service role key nel perimetro applicativo** (browser o server):
   i privilegi elevati sono incapsulati in funzioni `SECURITY DEFINER` con
   controlli espliciti (`is_admin()` o validazione token), non in una chiave
   trasportabile. Riduce drasticamente il danno potenziale di una fuga di
   variabili d'ambiente.
2. **RLS deny-by-default**: nessuna policy per `anon` sulle tabelle;
   `revoke all ... from anon` esplicito oltre all'assenza di policy.
3. **Token**: 256 bit di entropia (`gen_random_bytes(32)`), hash SHA-256
   salvato al posto del valore in chiaro, mai loggato (attenzione ai log
   Netlify Functions: non stampare l'URL completo con token in caso di errore).
4. **Allow-list di colonne nelle RPC pubbliche**: mai `select *`; ogni campo
   restituito a un client pubblico è elencato esplicitamente, cosa che rende
   impossibile una regressione silenziosa che esponga `telefono`, `livello`,
   `affidabilita` o `note_private`.
5. **Azioni pubbliche solo `POST`**: `conferma`/`declina`/`rinuncia`/messaggio
   non devono essere raggiungibili con una `GET`, per evitare trigger
   accidentali da prefetch del browser, bot, o scanner di link WhatsApp.
6. **Risposta generica per token invalido**: stesso messaggio ("link non
   valido") per token inesistente, malformato o di formato sbagliato — nessun
   oracolo che aiuti un attaccante a distinguere i casi.
7. **Niente enumerazione cross-match**: un token è scoped a un solo
   `match_participants`, quindi non permette di scoprire le altre partite a
   cui lo stesso giocatore è invitato.
8. **Concorrenza sull'ultimo posto**: `select ... for update` su
   `match_participants` e `matches` dentro `rpc_rispondi_invito` serializza
   le richieste concorrenti sulla stessa partita, evitando che due conferme
   quasi simultanee producano 5 "confermato".
9. **Stati terminali immutabili**: `annullata` e `conclusa` sono guardie
   esplicite in cima a `rpc_rispondi_invito`; nessuna azione pubblica può
   modificarli o modificare partecipazioni legate ad essi.
10. **Motivo di annullamento obbligatorio**: vincolo CHECK a livello DB, non
    solo validazione applicativa.
11. **Soft delete dei giocatori**: `attivo=false` invece di `DELETE`,
    `on delete restrict` sulle FK da `match_participants`/`player_messages`,
    per non perdere lo storico e non rompere l'integrità referenziale.
12. **Header di sicurezza HTTP** via `netlify.toml`: CSP restrittiva (niente
    script esterni non necessari), `X-Frame-Options: DENY`,
    `Referrer-Policy: strict-origin-when-cross-origin` (evita che il token
    finisca nel Referer di eventuali risorse di terze parti caricate dalla
    pagina pubblica).
13. **Variabili pubbliche vs private**: solo variabili prefissate `PUBLIC_`
    finiscono nel bundle client (convenzione Astro); nessuna variabile
    sensibile esiste comunque, dato il punto 1.
14. **Rate limiting sui tentativi di token**: **limite noto dell'MVP**.
    Supabase RPC non ha un rate limiter nativo per-IP integrato in questa
    configurazione; la mitigazione primaria è l'entropia del token (256 bit,
    non enumerabile in pratica). Un rate limiting esplicito (es. Netlify Edge
    Function o tabella di tentativi con backoff) è rimandato a un'iterazione
    successiva per non introdurre infrastruttura non necessaria nell'MVP,
    ma va rivalutato se il numero di giocatori/partite cresce.
15. **Log**: evitare di loggare corpo completo delle richieste RPC pubbliche
    (conterrebbero il token in chiaro); loggare solo esito e id partita.

## Casi limite

1. **Race condition sull'ultimo posto**: due giocatori confermano nello
   stesso istante con un solo posto libero → risolto con locking esplicito
   (sicurezza punto 8); il secondo arrivato finisce in `lista_attesa`.
2. **Re-invito dopo rifiuto**: l'admin invita di nuovo un giocatore che aveva
   declinato → stessa riga `match_participants` aggiornata (`on conflict`),
   nuovo token, vecchio token immediatamente invalidato (l'hash cambia).
3. **Rinuncia da lista d'attesa** (non da confermato): libera semplicemente
   la propria posizione, non promuove nessuno (non c'era un posto "vero" da
   liberare), va solo ricalcolato l'ordine dei rimanenti in attesa.
4. **Partita annullata con lista d'attesa piena**: tutte le partecipazioni
   restano congelate nel loro stato attuale a scopo storico; nessuna azione
   pubblica ulteriore è accettata.
5. **Modifica di data/ora/circolo dopo inviti già inviati**: l'MVP non
   notifica automaticamente i partecipanti già confermati (nessun sistema di
   notifiche push/email); l'admin deve informarli manualmente via il
   generatore di messaggi WhatsApp. Da considerare esplicitamente come limite
   noto, non un bug.
6. **Giocatore disattivato (`attivo=false`) con inviti pendenti**: gli inviti
   già esistenti restano validi (il token continua a funzionare); l'admin non
   può però selezionarlo per nuovi inviti dai filtri (che di default mostrano
   solo attivi).
7. **Partita mai raggiunge 4 conferme e la data passa**: nessuna transizione
   automatica a `conclusa` nell'MVP (niente cron/scheduled function per
   restare minimali); l'admin la marca manualmente come `conclusa` o la
   annulla. Da confermare se accettabile o se serve un job schedulato futuro.
8. **Token malformato o con caratteri non validi nell'URL**: la funzione RPC
   semplicemente non troverà corrispondenza in hash → stesso messaggio
   generico "link non valido" (nessuna eccezione non gestita da esporre).
9. **`livello_min`/`livello_max` non impostati sulla partita**: nessun
   vincolo applicato, il filtro admin li tratta come "nessun limite".
10. **`sesso_richiesto` o `fascia_eta` sulla partita**: puramente informativi
    per aiutare l'admin a filtrare i giocatori da invitare; il sistema non
    impedisce all'admin di invitare chi non rientra nei criteri (la selezione
    resta manuale e discrezionale, come da flusso descritto).
11. **Numero di campo assente**: campo opzionale, nessuna azione bloccata
    dalla sua assenza.
12. **Doppio invio dello stesso messaggio privato** (utente clicca due volte
    "invia"): per l'MVP si accetta la possibilità di un duplicato in
    `player_messages` (basso impatto, nessuna azione di stato in gioco); si
    può aggiungere un debounce lato UI come mitigazione semplice.
13. **Fuso orario**: si assume che tutte le partite siano nel fuso Europe/Rome
    e che data/ora inserite dall'admin siano già in ora locale civile; niente
    gestione multi-fuso nell'MVP (assunzione da confermare, ma ragionevole
    per un singolo organizzatore/circolo).
