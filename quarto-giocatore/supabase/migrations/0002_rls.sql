-- Row Level Security: deny-by-default, accesso diretto alle tabelle riservato
-- agli admin. Il flusso pubblico (giocatore invitato) passa esclusivamente
-- dalle funzioni RPC definite in 0003_rpc_admin.sql e 0004_rpc_public.sql.

alter table app_admins enable row level security;
alter table players enable row level security;
alter table matches enable row level security;
alter table match_participants enable row level security;
alter table player_messages enable row level security;

-- Nessun GRANT diretto per anon sulle tabelle di dominio.
revoke all on players, matches, match_participants, player_messages from anon;
revoke all on app_admins from anon;

create policy admin_read_self on app_admins
  for select using (is_admin());

create policy admin_full_access on players
  for all using (is_admin()) with check (is_admin());

create policy admin_full_access on matches
  for all using (is_admin()) with check (is_admin());

create policy admin_full_access on match_participants
  for all using (is_admin()) with check (is_admin());

create policy admin_full_access on player_messages
  for all using (is_admin()) with check (is_admin());
