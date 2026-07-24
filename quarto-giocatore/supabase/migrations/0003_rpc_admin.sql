-- Funzione condivisa di ricalcolo stato partita (usata sia da funzioni admin
-- sia da funzioni pubbliche in 0004_rpc_public.sql). Non è mai concessa in
-- esecuzione diretta a nessun ruolo: viene chiamata solo internamente da
-- altre funzioni SECURITY DEFINER, dentro la stessa transazione in cui le
-- righe di matches/match_participants sono già lockate dal chiamante.
create or replace function ricalcola_stato_partita(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match matches%rowtype;
  v_confermati int;
begin
  select * into v_match from matches where id = p_match_id;
  if not found or v_match.stato in ('annullata', 'conclusa') then
    return;
  end if;

  select count(*) into v_confermati
  from match_participants
  where match_id = p_match_id and stato = 'confermato';

  if v_confermati >= 4 then
    update matches set stato = case
      when stato_campo = 'prenotato' then 'confermata'
      else 'completa_campo_da_prenotare'
    end
    where id = p_match_id;
  elsif v_match.stato in ('confermata', 'completa_campo_da_prenotare', 'ricerca_sostituto') then
    update matches set stato = case
      when stato_campo = 'prenotato' then 'aperta_campo_prenotato'
      else 'aperta_campo_da_prenotare'
    end
    where id = p_match_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_invite_player: genera (o rigenera) il token di un invito.
-- Il token in chiaro è restituito una sola volta al chiamante admin.
-- ---------------------------------------------------------------------------
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
        posizione_attesa = null;

  return v_token;
end;
$$;

grant execute on function admin_invite_player(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_annulla_partita: annulla la partita con motivo obbligatorio.
-- Dopo questa chiamata rpc_rispondi_invito rifiuta ogni ulteriore azione.
-- ---------------------------------------------------------------------------
create or replace function admin_annulla_partita(p_match_id uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'non autorizzato';
  end if;

  if p_motivo is null or char_length(trim(p_motivo)) = 0 then
    raise exception 'motivo obbligatorio';
  end if;

  update matches
  set stato = 'annullata', motivo_annullamento = trim(p_motivo)
  where id = p_match_id;
end;
$$;

grant execute on function admin_annulla_partita(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_segna_campo_prenotato: segna il campo come prenotato e ricalcola
-- lo stato della partita di conseguenza.
-- ---------------------------------------------------------------------------
create or replace function admin_segna_campo_prenotato(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stato text;
begin
  if not is_admin() then
    raise exception 'non autorizzato';
  end if;

  select stato into v_stato from matches where id = p_match_id;
  if v_stato is null or v_stato in ('annullata', 'conclusa') then
    raise exception 'partita non modificabile';
  end if;

  update matches set stato_campo = 'prenotato' where id = p_match_id;
  perform ricalcola_stato_partita(p_match_id);
end;
$$;

grant execute on function admin_segna_campo_prenotato(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_apri_partita: passa la partita da 'bozza' allo stato aperto
-- corrispondente allo stato_campo corrente, rendendola pronta per gli inviti.
-- ---------------------------------------------------------------------------
create or replace function admin_apri_partita(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match matches%rowtype;
begin
  if not is_admin() then
    raise exception 'non autorizzato';
  end if;

  select * into v_match from matches where id = p_match_id;
  if not found or v_match.stato <> 'bozza' then
    raise exception 'la partita non è in bozza';
  end if;

  update matches set stato = case
    when stato_campo = 'prenotato' then 'aperta_campo_prenotato'
    else 'aperta_campo_da_prenotare'
  end
  where id = p_match_id;
end;
$$;

grant execute on function admin_apri_partita(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_imposta_ricerca_sostituto / admin_conclude_partita:
-- transizioni manuali esplicite, come da assunzioni confermate in
-- ARCHITECTURE.md (nessun cron automatico nell'MVP).
-- ---------------------------------------------------------------------------
create or replace function admin_imposta_ricerca_sostituto(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stato text;
begin
  if not is_admin() then
    raise exception 'non autorizzato';
  end if;

  select stato into v_stato from matches where id = p_match_id;
  if v_stato is null or v_stato in ('annullata', 'conclusa') then
    raise exception 'partita non modificabile';
  end if;

  update matches set stato = 'ricerca_sostituto' where id = p_match_id;
end;
$$;

grant execute on function admin_imposta_ricerca_sostituto(uuid) to authenticated;

create or replace function admin_conclude_partita(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stato text;
begin
  if not is_admin() then
    raise exception 'non autorizzato';
  end if;

  select stato into v_stato from matches where id = p_match_id;
  if v_stato is null or v_stato = 'annullata' then
    raise exception 'partita non modificabile';
  end if;

  update matches set stato = 'conclusa' where id = p_match_id;
end;
$$;

grant execute on function admin_conclude_partita(uuid) to authenticated;
