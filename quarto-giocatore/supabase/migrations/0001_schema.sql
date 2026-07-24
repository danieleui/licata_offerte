-- Quarto Giocatore (QG) — schema iniziale
-- Vedi DATABASE_SCHEMA.md per la descrizione completa.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- app_admins
-- ---------------------------------------------------------------------------
create table app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  creato_at timestamptz not null default now()
);

create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from app_admins where user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- players
-- ---------------------------------------------------------------------------
create table players (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 100),
  cognome text not null check (char_length(cognome) between 1 and 100),
  telefono text not null check (char_length(telefono) between 1 and 30),
  sesso text not null check (sesso in ('M','F','Altro')),
  anno_nascita int not null check (anno_nascita between 1930 and extract(year from now())::int),
  fascia_eta text,
  livello numeric(2,1) not null check (livello between 1 and 5 and (livello * 2) = round(livello * 2)),
  lato_preferito text not null check (lato_preferito in ('sinistra','destra','indifferente')),
  affidabilita smallint check (affidabilita between 1 and 5),
  note_private text check (char_length(note_private) <= 2000),
  attivo boolean not null default true,
  creato_at timestamptz not null default now(),
  aggiornato_at timestamptz not null default now(),
  creato_da uuid references app_admins(user_id)
);

create index players_attivo_idx on players (attivo);
create index players_livello_idx on players (livello);

-- ---------------------------------------------------------------------------
-- matches
-- ---------------------------------------------------------------------------
create table matches (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  ora_inizio time not null,
  ora_fine time not null,
  circolo text not null check (char_length(circolo) between 1 and 200),
  indirizzo text not null check (char_length(indirizzo) between 1 and 300),
  numero_campo text,
  costo numeric(6,2) check (costo >= 0),
  sesso_richiesto text not null default 'Qualsiasi'
    check (sesso_richiesto in ('M','F','Misto','Qualsiasi')),
  fascia_eta text,
  livello_min numeric(2,1) check (livello_min between 1 and 5),
  livello_max numeric(2,1) check (livello_max between 1 and 5),
  note text check (char_length(note) <= 2000),
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

-- ---------------------------------------------------------------------------
-- match_participants
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- player_messages
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- trigger generico per aggiornato_at
-- ---------------------------------------------------------------------------
create or replace function set_aggiornato_at()
returns trigger
language plpgsql
as $$
begin
  new.aggiornato_at = now();
  return new;
end;
$$;

create trigger players_set_aggiornato_at
  before update on players
  for each row execute function set_aggiornato_at();

create trigger matches_set_aggiornato_at
  before update on matches
  for each row execute function set_aggiornato_at();

create trigger match_participants_set_aggiornato_at
  before update on match_participants
  for each row execute function set_aggiornato_at();
