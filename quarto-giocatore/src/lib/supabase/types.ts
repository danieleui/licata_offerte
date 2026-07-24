// Tipi generati manualmente a partire da supabase/migrations/*.sql.
// Quando il progetto Supabase reale è disponibile, rigenerare con:
//   supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts

export type Sesso = 'M' | 'F' | 'Altro';
export type LatoPreferito = 'sinistra' | 'destra' | 'indifferente';
export type SessoRichiesto = 'M' | 'F' | 'Misto' | 'Qualsiasi';
export type StatoCampo = 'da_prenotare' | 'prenotato';
export type StatoPartita =
  | 'bozza'
  | 'aperta_campo_da_prenotare'
  | 'aperta_campo_prenotato'
  | 'completa_campo_da_prenotare'
  | 'confermata'
  | 'ricerca_sostituto'
  | 'annullata'
  | 'conclusa';
export type StatoPartecipazione =
  | 'invitato'
  | 'confermato'
  | 'lista_attesa'
  | 'declinato'
  | 'rinunciato';

// Nota: usiamo sempre "type" e mai "interface" in questo file. A differenza
// di un type alias, un'interface non soddisfa strutturalmente Record<string,
// unknown> in TypeScript, e i tipi generici di supabase-js (GenericTable,
// GenericSchema, ecc.) richiedono proprio quella compatibilità: con
// "interface" qui, ogni chiamata a .from(...) o .rpc(...) degraderebbe
// silenziosamente a "never"/"undefined" invece di dare i tipi attesi.
export type PlayerRow = {
  id: string;
  nome: string;
  cognome: string;
  telefono: string;
  sesso: Sesso;
  anno_nascita: number;
  fascia_eta: string | null;
  livello: number;
  lato_preferito: LatoPreferito;
  affidabilita: number | null;
  note_private: string | null;
  attivo: boolean;
  creato_at: string;
  aggiornato_at: string;
  creato_da: string | null;
};

type PlayerCampiOpzionaliInserimento = 'id' | 'creato_at' | 'aggiornato_at' | 'creato_da';
export type PlayerInsert = Omit<PlayerRow, PlayerCampiOpzionaliInserimento> &
  Partial<Pick<PlayerRow, PlayerCampiOpzionaliInserimento>>;
export type PlayerUpdate = Partial<PlayerInsert>;

export type MatchRow = {
  id: string;
  data: string;
  ora_inizio: string;
  ora_fine: string;
  circolo: string;
  indirizzo: string;
  numero_campo: string | null;
  costo: number | null;
  sesso_richiesto: SessoRichiesto;
  fascia_eta: string | null;
  livello_min: number | null;
  livello_max: number | null;
  note: string | null;
  stato_campo: StatoCampo;
  stato: StatoPartita;
  motivo_annullamento: string | null;
  creato_da: string | null;
  creato_at: string;
  aggiornato_at: string;
};

type MatchCampiOpzionaliInserimento =
  | 'id'
  | 'creato_at'
  | 'aggiornato_at'
  | 'stato'
  | 'stato_campo'
  | 'creato_da'
  | 'motivo_annullamento';
export type MatchInsert = Omit<MatchRow, MatchCampiOpzionaliInserimento> &
  Partial<Pick<MatchRow, MatchCampiOpzionaliInserimento>>;
export type MatchUpdate = Partial<MatchInsert>;

export type MatchParticipantRow = {
  id: string;
  match_id: string;
  player_id: string;
  stato: StatoPartecipazione;
  token_hash: string;
  token_creato_at: string;
  posizione_attesa: number | null;
  risposto_at: string | null;
  creato_at: string;
  aggiornato_at: string;
};

export type PlayerMessageRow = {
  id: string;
  match_id: string;
  player_id: string;
  testo: string;
  letto_at: string | null;
  creato_at: string;
};

export type AppAdminRow = {
  user_id: string;
  creato_at: string;
};

export type Database = {
  public: {
    Tables: {
      players: {
        Row: PlayerRow;
        Insert: PlayerInsert;
        Update: PlayerUpdate;
        Relationships: [];
      };
      matches: {
        Row: MatchRow;
        Insert: MatchInsert;
        Update: MatchUpdate;
        Relationships: [];
      };
      match_participants: {
        Row: MatchParticipantRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      player_messages: {
        Row: PlayerMessageRow;
        Insert: never;
        // Unica modifica diretta consentita all'app: marcare un messaggio come letto.
        Update: Partial<Pick<PlayerMessageRow, 'letto_at'>>;
        Relationships: [];
      };
      app_admins: {
        Row: AppAdminRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
    Functions: {
      admin_invite_player: {
        Args: { p_match_id: string; p_player_id: string };
        Returns: string;
      };
      admin_annulla_partita: {
        Args: { p_match_id: string; p_motivo: string };
        Returns: void;
      };
      admin_segna_campo_prenotato: {
        Args: { p_match_id: string };
        Returns: void;
      };
      admin_apri_partita: {
        Args: { p_match_id: string };
        Returns: void;
      };
      admin_imposta_ricerca_sostituto: {
        Args: { p_match_id: string };
        Returns: void;
      };
      admin_conclude_partita: {
        Args: { p_match_id: string };
        Returns: void;
      };
      rpc_get_invito: {
        Args: { p_token: string };
        Returns: InvitoPubblico | { errore: string };
      };
      rpc_rispondi_invito: {
        Args: { p_token: string; p_azione: 'conferma' | 'declina' | 'rinuncia' };
        Returns: { ok: true; stato: StatoPartecipazione } | { errore: string };
      };
      rpc_invia_messaggio: {
        Args: { p_token: string; p_testo: string };
        Returns: { ok: true } | { errore: string };
      };
    };
  };
};

export type InvitoPubblico = {
  partita: {
    data: string;
    ora_inizio: string;
    ora_fine: string;
    circolo: string;
    indirizzo: string;
    numero_campo: string | null;
    costo: number | null;
    note: string | null;
    stato: StatoPartita;
    motivo_annullamento: string | null;
  };
  mia_partecipazione: {
    stato: StatoPartecipazione;
    posizione_attesa: number | null;
  };
  partecipanti: Array<{ nome: string; cognome: string; stato: StatoPartecipazione }>;
};
