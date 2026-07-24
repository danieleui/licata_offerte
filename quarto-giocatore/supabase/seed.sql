-- Dati di sviluppo locale, opzionale. Non applicare in produzione.
-- Prerequisito: crea un utente admin via Supabase Auth (Studio > Authentication)
-- e inserisci manualmente il suo user_id qui sotto al posto del placeholder.

-- insert into app_admins (user_id) values ('00000000-0000-0000-0000-000000000000');

insert into players (nome, cognome, telefono, sesso, anno_nascita, fascia_eta, livello, lato_preferito, affidabilita, attivo)
values
  ('Mario', 'Rossi', '+39 333 1234567', 'M', 1988, '35-44', 3.5, 'destra', 5, true),
  ('Luca', 'Bianchi', '+39 333 2345678', 'M', 1995, '25-34', 4.0, 'sinistra', 4, true),
  ('Giulia', 'Verdi', '+39 333 3456789', 'F', 1992, '25-34', 3.0, 'indifferente', 5, true),
  ('Anna', 'Neri', '+39 333 4567890', 'F', 1980, '45-54', 2.5, 'destra', 3, true);
