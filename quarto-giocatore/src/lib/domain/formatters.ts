import type {
  LatoPreferito,
  Sesso,
  SessoRichiesto,
  StatoCampo,
  StatoPartecipazione,
  StatoPartita,
} from '../supabase/types';

const FORMATO_DATA = new Intl.DateTimeFormat('it-IT', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function formattaData(dataISO: string): string {
  // Le date sono civili (senza fuso), evitiamo lo slittamento di un giorno
  // che può capitare interpretando "YYYY-MM-DD" come UTC.
  const [anno, mese, giorno] = dataISO.split('-').map(Number);
  const data = new Date(anno ?? 1970, (mese ?? 1) - 1, giorno ?? 1);
  return FORMATO_DATA.format(data);
}

export function formattaOra(ora: string): string {
  return ora.slice(0, 5);
}

export function formattaLivello(livello: number): string {
  return livello.toFixed(1).replace('.', ',');
}

export function formattaCosto(costo: number | null): string {
  if (costo === null) return 'da definire';
  return `${costo.toFixed(2).replace('.', ',')} €`;
}

export const LABEL_SESSO: Record<Sesso, string> = {
  M: 'Uomo',
  F: 'Donna',
  Altro: 'Altro',
};

export const LABEL_SESSO_RICHIESTO: Record<SessoRichiesto, string> = {
  M: 'Solo uomini',
  F: 'Solo donne',
  Misto: 'Misto',
  Qualsiasi: 'Qualsiasi',
};

export const LABEL_LATO: Record<LatoPreferito, string> = {
  sinistra: 'Sinistra',
  destra: 'Destra',
  indifferente: 'Indifferente',
};

export const LABEL_STATO_CAMPO: Record<StatoCampo, string> = {
  da_prenotare: 'Campo da prenotare',
  prenotato: 'Campo prenotato',
};

export const LABEL_STATO_PARTITA: Record<StatoPartita, string> = {
  bozza: 'Bozza',
  aperta_campo_da_prenotare: 'Aperta (campo da prenotare)',
  aperta_campo_prenotato: 'Aperta (campo prenotato)',
  completa_campo_da_prenotare: 'Completa (campo da prenotare)',
  confermata: 'Confermata',
  ricerca_sostituto: 'Ricerca sostituto',
  annullata: 'Annullata',
  conclusa: 'Conclusa',
};

export const LABEL_STATO_PARTECIPAZIONE: Record<StatoPartecipazione, string> = {
  invitato: 'Invitato',
  confermato: 'Confermato',
  lista_attesa: 'Lista d\'attesa',
  declinato: 'Declinato',
  rinunciato: 'Ha rinunciato',
};

export function classeBadgeStatoPartecipazione(stato: StatoPartecipazione): string {
  const mappa: Record<StatoPartecipazione, string> = {
    invitato: 'badge--invitato',
    confermato: 'badge--confermato',
    lista_attesa: 'badge--attesa',
    declinato: 'badge--declinato',
    rinunciato: 'badge--rinunciato',
  };
  return mappa[stato];
}

export function classeBadgeStatoPartita(stato: StatoPartita): string {
  if (stato === 'confermata') return 'badge--confermato';
  if (stato === 'annullata') return 'badge--annullata';
  if (stato === 'ricerca_sostituto') return 'badge--attesa';
  if (stato === 'conclusa') return 'badge--rinunciato';
  return 'badge--invitato';
}
