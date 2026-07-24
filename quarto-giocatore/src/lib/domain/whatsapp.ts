import { formattaCosto, formattaData, formattaOra } from './formatters';
import type { MatchRow } from '../supabase/types';

export interface DatiMessaggioInvito {
  nomeGiocatore: string;
  partita: Pick<MatchRow, 'data' | 'ora_inizio' | 'ora_fine' | 'circolo' | 'indirizzo' | 'costo'>;
  link: string;
}

export function messaggioInvito({ nomeGiocatore, partita, link }: DatiMessaggioInvito): string {
  const righe = [
    `Ciao ${nomeGiocatore}! 🎾`,
    `Ti va di giocare a padel ${formattaData(partita.data)} alle ${formattaOra(partita.ora_inizio)}?`,
    `Circolo: ${partita.circolo}`,
    `Indirizzo: ${partita.indirizzo}`,
    `Costo: ${formattaCosto(partita.costo)}`,
    '',
    `Conferma qui: ${link}`,
  ];
  return righe.join('\n');
}

export function linkWhatsApp(telefono: string, testo: string): string {
  const numeroPulito = telefono.replace(/[^\d+]/g, '');
  return `https://wa.me/${numeroPulito}?text=${encodeURIComponent(testo)}`;
}

export function linkInvitoPubblico(origin: string, token: string): string {
  return `${origin}/i/${token}`;
}
