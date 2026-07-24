import type { LatoPreferito, PlayerRow, Sesso } from '../supabase/types';

// Etichette suggerite, non vincolanti: il campo fascia_eta resta testo
// libero sul giocatore (vedi ARCHITECTURE.md §10).
export const FASCE_ETA_SUGGERITE = ['Under 25', '25-34', '35-44', '45-54', '55+'] as const;

export interface FiltriGiocatori {
  testo: string;
  sesso: Sesso | 'tutti';
  fasciaEta: string | 'tutte';
  lato: LatoPreferito | 'tutti';
  livelloMin: number | null;
  livelloMax: number | null;
  stato: 'attivi' | 'inattivi' | 'tutti';
}

export const FILTRI_INIZIALI: FiltriGiocatori = {
  testo: '',
  sesso: 'tutti',
  fasciaEta: 'tutte',
  lato: 'tutti',
  livelloMin: null,
  livelloMax: null,
  stato: 'attivi',
};

export function filtraGiocatori(giocatori: PlayerRow[], filtri: FiltriGiocatori): PlayerRow[] {
  const testo = filtri.testo.trim().toLowerCase();

  return giocatori.filter((g) => {
    if (filtri.stato === 'attivi' && !g.attivo) return false;
    if (filtri.stato === 'inattivi' && g.attivo) return false;
    if (filtri.sesso !== 'tutti' && g.sesso !== filtri.sesso) return false;
    if (filtri.fasciaEta !== 'tutte' && g.fascia_eta !== filtri.fasciaEta) return false;
    if (filtri.lato !== 'tutti' && g.lato_preferito !== filtri.lato) return false;
    if (filtri.livelloMin !== null && g.livello < filtri.livelloMin) return false;
    if (filtri.livelloMax !== null && g.livello > filtri.livelloMax) return false;
    if (testo.length > 0) {
      const nomeCompleto = `${g.nome} ${g.cognome}`.toLowerCase();
      if (!nomeCompleto.includes(testo)) return false;
    }
    return true;
  });
}
