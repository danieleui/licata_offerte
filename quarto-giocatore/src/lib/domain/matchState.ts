import type { StatoPartecipazione, StatoPartita } from '../supabase/types';

// Helper di sola lettura per la UI. La transizione di stato "vera" avviene
// dentro le funzioni RPC di Postgres (vedi supabase/migrations/0003 e 0004):
// qui non si scrive mai stato, si legge soltanto per decidere cosa mostrare.

export const STATI_TERMINALI: ReadonlySet<StatoPartita> = new Set(['annullata', 'conclusa']);

export function partitaModificabile(stato: StatoPartita): boolean {
  return !STATI_TERMINALI.has(stato);
}

export function postiLiberi(confermati: number): number {
  return Math.max(0, 4 - confermati);
}

export interface AzioniConsentite {
  puoConfermare: boolean;
  puoDeclinare: boolean;
  puoRinunciare: boolean;
  puoScrivere: boolean;
}

export function azioniConsentite(
  statoPartita: StatoPartita,
  statoPartecipazione: StatoPartecipazione,
): AzioniConsentite {
  if (!partitaModificabile(statoPartita)) {
    return { puoConfermare: false, puoDeclinare: false, puoRinunciare: false, puoScrivere: true };
  }

  return {
    puoConfermare: statoPartecipazione === 'invitato' || statoPartecipazione === 'declinato' || statoPartecipazione === 'rinunciato',
    puoDeclinare: statoPartecipazione === 'invitato',
    puoRinunciare: statoPartecipazione === 'confermato' || statoPartecipazione === 'lista_attesa',
    puoScrivere: true,
  };
}
