# DATABASE_SCHEMA.md — Quarto Giocatore (QG)

Schema Postgres/Supabase proposto. Nessuna migrazione viene applicata finché
questo documento non è verificato. Tutti gli identificatori sono in italiano
dove riflettono concetti di dominio, in inglese dove sono infrastrutturali
(id, created_at) per coerenza con le convenzioni Supabase.

## 1. Tabella `app_admins`

Elenco degli utenti Supabase Auth abilitati come amministratori. Nell'MVP ne
esisterà uno solo, ma il modello non lo presuppone hardcoded.

```sql
create table app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  creato_at timestamptz not null default now()
);
```

Funzione helper usata da tutte le policy RLS:

```sql
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from app_admins where user_id = auth.uid()
  );
$$;
```

## 2. Tabella `players` (giocatori)

```sql
create table players (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cognome text not null,
  telefono text not null,
  sesso text not null check (sesso in ('M','F','Altro')),
  anno_nascita int not null check (anno_nascita between 1930 and extract(year from now())::int),
  fascia_eta text,
  livello numeric(2,1) not null check (livello between 1 and 5 and (livello * 2) = round(livello * 2)),
  lato_preferito text not null check (lato_preferito in ('sinistra','destra','indifferente')),
  affidabilita smallint check (affidabilita between 1 and 5),
  note_private text,
  attivo boolean not null default true,
  creato_at timestamptz not null default now(),
  aggiornato_at timestamptz not null default now(),
  creato_da uuid references app_admins(user_id)
);

create index players_attivo_idx on players (attivo);
create index players_livello_idx on players (livello);
```

Note:
- `livello` con vincolo che impone incrementi di 0,5 tra 1 e 5.
- `affidabilita` assunta scala 1–5 (da confermare, vedi ARCHITECTURE.md §10).
- `fascia_eta` è testo libero/etichetta scelta dall'admin, non derivata
  automaticamente da `anno_nascita` (da confermare).
- Cancellazione = soft delete via `attivo=false`, mai `DELETE` fisico, per
  preservare l'integrità storica di `match_participants`.

## 3. Tabella `matches` (partite)

```sql
create table matches (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  ora_inizio time not null,
  ora_fine time not null,
  circolo text not null,
  indirizzo text not null,
  numero_campo text,
  costo numeric(6,2) check (costo >= 0),
  sesso_richiesto text not null default 'Qualsiasi'
    check (sesso_richiesto in ('M','F','Misto','Qualsiasi')),
  fascia_eta text,
  livello_min numeric(2,1) check (livello_min between 1 and 5),
  livello_max numeric(2,1) check (livello_max between 1 and 5),
  note text,
  stato_campo text not null default 'da_prenotare'
    check (stato_campo in ('da_prenotare','prenotato')),
  stato text not null default 'bozza' check (stato in (
    'bozza',
    'aperta_campo_da_prenotare',
    'aperta_campo_prenotato',
    'completa_campo_da_prenotare',
    'confermata',
    'ricerca_sostituto',
    'annullata',
    'conclusa'
  )),
  motivo_annullamento text,
  creato_da uuid references app_admins(user_id),
  creato_at timestamptz not null default now(),
  aggiornato_at timestamptz not null default now(),
  constraint orario_valido check (ora_fine > ora_inizio),
  constraint livelli_validi check (
    livello_min is null or livello_max is null or livello_min <= livello_max
  ),
  constraint motivo_annullamento_richiesto check (
    stato <> 'annullata' or motivo_annullamento is not null
  )
);

create index matches_stato_idx on matches (stato);
create index matches_data_idx on matches (data);
```

## 4. Tabella `match_participants` (inviti/adesioni)

```sql
create table match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id) on delete restrict,
  stato text not null default 'invitato' check (stato in (
    'invitato',
    'confermato',
    'lista_attesa',
    'declinato',
    'rinunciato'
  )),
  token_hash text not null unique,
  token_creato_at timestamptz not null default now(),
  posizione_attesa int,
  risposto_at timestamptz,
  creato_at timestamptz not null default now(),
  aggiornato_at timestamptz not null default now(),
  unique (match_id, player_id)
);

create index match_participants_match_idx on match_participants (match_id);
create index match_participants_token_idx on match_participants (token_hash);
```

Note:
- `player_id` con `on delete restrict`: un giocatore con storico partecipazioni
  non può essere cancellato fisicamente (coerente con il soft delete di `players`).
- `posizione_attesa` è opzionale: l'ordine di FIFO in lista d'attesa può anche
  essere derivato da `risposto_at`; il campo esplicito serve solo se si vuole
  permettere riordini manuali in futuro (non nell'MVP).
- Re-invito dopo un rifiuto: l'admin aggiorna la stessa riga (`stato` torna a
  `invitato`, nuovo `token_hash`/`token_creato_at`), non ne crea una nuova,
  per rispettare il vincolo `unique (match_id, player_id)`.

## 5. Tabella `player_messages` (messaggi privati)

```sql
create table player_messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id) on delete restrict,
  testo text not null check (char_length(testo) between 1 and 2000),
  letto_at timestamptz,
  creato_at timestamptz not null default now()
);

create index player_messages_match_idx on player_messages (match_id);
create index player_messages_non_letti_idx on player_messages (letto_at) where letto_at is null;
```

I messaggi sono sempre in direzione giocatore → admin (l'admin risponde fuori
dall'app, via WhatsApp). `letto_at` alimenta l'indicatore "non letti" nella
dashboard admin.

## 6. Row Level Security

RLS abilitata su tutte le tabelle; nessuna policy per il ruolo `anon`, quindi
accesso diretto negato di default per chiunque non sia admin.

```sql
alter table players enable row level security;
alter table matches enable row level security;
alter table match_participants enable row level security;
alter table player_messages enable row level security;
alter table app_admins enable row level security;

create policy admin_full_access on players
  for all using (is_admin()) with check (is_admin());

create policy admin_full_access on matches
  for all using (is_admin()) with check (is_admin());

create policy admin_full_access on match_participants
  for all using (is_admin()) with check (is_admin());

create policy admin_full_access on player_messages
  for all using (is_admin()) with check (is_admin());

create policy admin_read_self on app_admins
  for select using (is_admin());
```

Il ruolo `anon` non riceve **nessun** `GRANT` diretto su queste tabelle:
`revoke all on players, matches, match_participants, player_messages from anon;`
(esplicito, anche se il default Postgres/Supabase già nega senza policy).

## 7. Funzioni RPC — accesso pubblico (token)

Tutte `security definer`, tutte con `set search_path = public` per evitare
hijacking dello schema, tutte con `grant execute ... to anon`.

### 7.1 `rpc_get_invito(token text)`

Restituisce i dati pubblici della partita + lo stato della propria
partecipazione + i nomi (solo nome e cognome) degli altri partecipanti
confermati. Non restituisce mai telefono, livello, affidabilità, note.

```sql
create or replace function rpc_get_invito(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text := encode(digest(p_token, 'sha256'), 'hex');
  v_partecipazione match_participants%rowtype;
  v_match matches%rowtype;
begin
  select * into v_partecipazione from match_participants where token_hash = v_hash;
  if not found then
    return jsonb_build_object('errore', 'link_non_valido');
  end if;

  select * into v_match from matches where id = v_partecipazione.match_id;

  return jsonb_build_object(
    'partita', jsonb_build_object(
      'data', v_match.data,
      'ora_inizio', v_match.ora_inizio,
      'ora_fine', v_match.ora_fine,
      'circolo', v_match.circolo,
      'indirizzo', v_match.indirizzo,
      'numero_campo', v_match.numero_campo,
      'costo', v_match.costo,
      'note', v_match.note,
      'stato', v_match.stato
    ),
    'mia_partecipazione', jsonb_build_object(
      'stato', v_partecipazione.stato,
      'posizione_attesa', v_partecipazione.posizione_attesa
    ),
    'partecipanti', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'nome', p.nome, 'cognome', p.cognome, 'stato', mp.stato
      )), '[]'::jsonb)
      from match_participants mp
      join players p on p.id = mp.player_id
      where mp.match_id = v_match.id and mp.stato in ('confermato','lista_attesa')
    )
  );
end;
$$;

grant execute on function rpc_get_invito(text) to anon;
```

### 7.2 `rpc_rispondi_invito(token text, azione text)`

`azione in ('conferma','declina','rinuncia')`. Esegue la transizione di stato
dentro un'unica funzione (quindi atomica) e ricalcola lo stato della partita.
Vedi `IMPLEMENTATION_PLAN.md` per lo pseudocodice completo della macchina a
stati; qui lo schema di ritorno e le guardie principali:

```sql
create or replace function rpc_rispondi_invito(p_token text, p_azione text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text := encode(digest(p_token, 'sha256'), 'hex');
  v_partecipazione match_participants%rowtype;
  v_match matches%rowtype;
  v_confermati int;
begin
  if p_azione not in ('conferma','declina','rinuncia') then
    return jsonb_build_object('errore', 'azione_non_valida');
  end if;

  select * into v_partecipazione from match_participants where token_hash = v_hash for update;
  if not found then
    return jsonb_build_object('errore', 'link_non_valido');
  end if;

  select * into v_match from matches where id = v_partecipazione.match_id for update;

  if v_match.stato in ('annullata','conclusa') then
    return jsonb_build_object('errore', 'partita_non_modificabile');
  end if;

  -- ... logica di transizione (dettagliata in IMPLEMENTATION_PLAN.md) ...

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function rpc_rispondi_invito(text, text) to anon;
```

Le `select ... for update` su `match_participants` e `matches` serializzano
gli accessi concorrenti sulla stessa partita, prevenendo la race condition
del "quinto conferma" simultaneo.

### 7.3 `rpc_invia_messaggio(token text, testo text)`

Verifica il token, inserisce in `player_messages`. Consentito anche dopo
`annullata` (vedi assunzione in ARCHITECTURE.md §10); rifiutato solo se il
token non è valido.

```sql
grant execute on function rpc_invia_messaggio(text, text) to anon;
```

## 8. Funzioni RPC — uso admin

### 8.1 `admin_invite_player(match_id uuid, player_id uuid)`

Verifica `is_admin()`, genera il token, salva l'hash, restituisce il token in
chiaro (unica volta). Se esiste già una riga per quella coppia
`(match_id, player_id)`, la aggiorna (re-invito) invece di crearne una nuova.

```sql
create or replace function admin_invite_player(p_match_id uuid, p_player_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_hash text;
begin
  if not is_admin() then
    raise exception 'non autorizzato';
  end if;

  v_token := encode(gen_random_bytes(32), 'base64');
  v_hash := encode(digest(v_token, 'sha256'), 'hex');

  insert into match_participants (match_id, player_id, stato, token_hash, token_creato_at)
  values (p_match_id, p_player_id, 'invitato', v_hash, now())
  on conflict (match_id, player_id) do update
    set stato = 'invitato',
        token_hash = v_hash,
        token_creato_at = now(),
        risposto_at = null,
        posizione_attesa = null,
        aggiornato_at = now();

  return v_token;
end;
$$;

grant execute on function admin_invite_player(uuid, uuid) to authenticated;
```

`grant ... to authenticated` (non `anon`): solo utenti loggati arrivano a
questa funzione, e il controllo `is_admin()` interno nega comunque l'accesso
a un utente autenticato non admin.

### 8.2 `admin_annulla_partita(match_id uuid, motivo text)`

Verifica `is_admin()`, richiede `motivo` non vuoto, imposta
`stato='annullata'`, `motivo_annullamento=motivo`. Dopo questa chiamata,
`rpc_rispondi_invito` rifiuterà ogni ulteriore azione su quella partita.

## 9. Diagramma delle relazioni

```
app_admins 1---* (creato_da) matches 1---* match_participants *---1 players
                                  |
                                  '---* player_messages *---1 players
```

## 10. Vincoli di integrità riepilogati

- `players.livello`, `matches.livello_min/max`: step di 0,5 tra 1 e 5.
- `matches`: `ora_fine > ora_inizio`; `motivo_annullamento` obbligatorio se
  `stato = 'annullata'`.
- `match_participants`: unicità `(match_id, player_id)`; `token_hash` unico
  globale (collisione praticamente impossibile con 256 bit, ma il vincolo
  `unique` la rende comunque rilevabile anziché silenziosa).
- Nessuna tabella permette `DELETE` da `anon`/`authenticated` non admin: solo
  `is_admin()` può cancellare, e comunque il pattern preferito resta il soft
  delete su `players`.
