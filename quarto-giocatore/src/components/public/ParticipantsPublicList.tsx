import { classeBadgeStatoPartecipazione, LABEL_STATO_PARTECIPAZIONE } from '../../lib/domain/formatters';
import type { StatoPartecipazione } from '../../lib/supabase/types';

interface Props {
  partecipanti: Array<{ nome: string; cognome: string; stato: StatoPartecipazione }>;
}

export default function ParticipantsPublicList({ partecipanti }: Props) {
  if (partecipanti.length === 0) {
    return (
      <div className="scheda">
        <h2>Partecipanti</h2>
        <p className="testo-muto">Nessuno ha ancora confermato.</p>
      </div>
    );
  }

  return (
    <div className="scheda">
      <h2>Partecipanti</h2>
      {partecipanti.map((p, indice) => (
        <p key={`${p.nome}-${p.cognome}-${indice}`}>
          {p.nome} {p.cognome}{' '}
          <span className={`badge ${classeBadgeStatoPartecipazione(p.stato)}`}>{LABEL_STATO_PARTECIPAZIONE[p.stato]}</span>
        </p>
      ))}
    </div>
  );
}
