-- Funzioni pubbliche raggiungibili dal ruolo anon tramite il token personale.
-- Nessuna di queste concede accesso diretto alle tabelle: restituiscono solo
-- gli insiemi di campi esplicitamente elencati qui sotto.

-- ---------------------------------------------------------------------------
-- rpc_get_invito: stato dell'invito + dati pubblici della partita.
-- Non restituisce mai telefono, livello, affidabilità o note.
-- ---------------------------------------------------------------------------
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
  v_mia_posizione int;
begin
  select * into v_partecipazione from match_participants where token_hash = v_hash;
  if not found then
    return jsonb_build_object('errore', 'link_non_valido');
  end if;

  select * into v_match from matches where id = v_partecipazione.match_id;

  if v_partecipazione.stato = 'lista_attesa' then
    select count(*) + 1 into v_mia_posizione
    from match_participants
    where match_id = v_match.id
      and stato = 'lista_attesa'
      and risposto_at < v_partecipazione.risposto_at;
  else
    v_mia_posizione := null;
  end if;

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
      'stato', v_match.stato,
      'motivo_annullamento', v_match.motivo_annullamento
    ),
    'mia_partecipazione', jsonb_build_object(
      'stato', v_partecipazione.stato,
      'posizione_attesa', v_mia_posizione
    ),
    'partecipanti', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'nome', p.nome, 'cognome', p.cognome, 'stato', mp.stato
      ) order by mp.risposto_at nulls last), '[]'::jsonb)
      from match_participants mp
      join players p on p.id = mp.player_id
      where mp.match_id = v_match.id and mp.stato in ('confermato', 'lista_attesa')
    )
  );
end;
$$;

grant execute on function rpc_get_invito(text) to anon;

-- ---------------------------------------------------------------------------
-- rpc_rispondi_invito: conferma / declina / rinuncia.
-- Le SELECT ... FOR UPDATE serializzano le richieste concorrenti sulla
-- stessa partita, evitando che due conferme simultanee sull'ultimo posto
-- producano più di 4 partecipanti confermati.
-- ---------------------------------------------------------------------------
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
  v_primo_in_attesa match_participants%rowtype;
begin
  if p_azione not in ('conferma', 'declina', 'rinuncia') then
    return jsonb_build_object('errore', 'azione_non_valida');
  end if;

  select * into v_partecipazione
  from match_participants
  where token_hash = v_hash
  for update;

  if not found then
    return jsonb_build_object('errore', 'link_non_valido');
  end if;

  select * into v_match from matches where id = v_partecipazione.match_id for update;

  if v_match.stato in ('annullata', 'conclusa') then
    return jsonb_build_object('errore', 'partita_non_modificabile');
  end if;

  if p_azione = 'conferma' then
    if v_partecipazione.stato in ('confermato', 'lista_attesa') then
      return jsonb_build_object('ok', true, 'stato', v_partecipazione.stato);
    end if;

    select count(*) into v_confermati
    from match_participants
    where match_id = v_match.id and stato = 'confermato';

    if v_confermati < 4 then
      update match_participants
      set stato = 'confermato', risposto_at = now(), posizione_attesa = null
      where id = v_partecipazione.id;
    else
      update match_participants
      set stato = 'lista_attesa',
          risposto_at = now(),
          posizione_attesa = (
            select coalesce(max(posizione_attesa), 0) + 1
            from match_participants
            where match_id = v_match.id and stato = 'lista_attesa'
          )
      where id = v_partecipazione.id;
    end if;

    perform ricalcola_stato_partita(v_match.id);

  elsif p_azione = 'declina' then
    if v_partecipazione.stato in ('confermato', 'lista_attesa') then
      return jsonb_build_object('errore', 'usa_rinuncia');
    end if;

    update match_participants
    set stato = 'declinato', risposto_at = now()
    where id = v_partecipazione.id;

  elsif p_azione = 'rinuncia' then
    if v_partecipazione.stato not in ('confermato', 'lista_attesa') then
      return jsonb_build_object('errore', 'azione_non_valida_per_stato');
    end if;

    update match_participants
    set stato = 'rinunciato', risposto_at = now(), posizione_attesa = null
    where id = v_partecipazione.id;

    if v_partecipazione.stato = 'confermato' then
      select * into v_primo_in_attesa
      from match_participants
      where match_id = v_match.id and stato = 'lista_attesa'
      order by risposto_at asc
      limit 1
      for update;

      if found then
        update match_participants
        set stato = 'confermato', posizione_attesa = null
        where id = v_primo_in_attesa.id;
      end if;
    end if;

    perform ricalcola_stato_partita(v_match.id);
  end if;

  select * into v_partecipazione from match_participants where id = v_partecipazione.id;
  return jsonb_build_object('ok', true, 'stato', v_partecipazione.stato);
end;
$$;

grant execute on function rpc_rispondi_invito(text, text) to anon;

-- ---------------------------------------------------------------------------
-- rpc_invia_messaggio: messaggio privato giocatore -> admin.
-- Consentito anche dopo l'annullamento della partita (solo le azioni di
-- adesione sono bloccate in quel caso, vedi ARCHITECTURE.md §10).
-- ---------------------------------------------------------------------------
create or replace function rpc_invia_messaggio(p_token text, p_testo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text := encode(digest(p_token, 'sha256'), 'hex');
  v_partecipazione match_participants%rowtype;
  v_testo text := trim(coalesce(p_testo, ''));
begin
  if char_length(v_testo) = 0 or char_length(v_testo) > 2000 then
    return jsonb_build_object('errore', 'testo_non_valido');
  end if;

  select * into v_partecipazione from match_participants where token_hash = v_hash;
  if not found then
    return jsonb_build_object('errore', 'link_non_valido');
  end if;

  insert into player_messages (match_id, player_id, testo)
  values (v_partecipazione.match_id, v_partecipazione.player_id, v_testo);

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function rpc_invia_messaggio(text, text) to anon;
