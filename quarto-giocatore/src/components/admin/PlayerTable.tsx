import { formattaLivello, LABEL_LATO, LABEL_SESSO } from '../../lib/domain/formatters';
import type { PlayerRow } from '../../lib/supabase/types';

interface Props {
  giocatori: PlayerRow[];
}

export default function PlayerTable({ giocatori }: Props) {
  if (giocatori.length === 0) {
    return <p className="testo-muto">Nessun giocatore corrisponde ai filtri.</p>;
  }

  return (
    <div>
      {giocatori.map((g) => (
        <a
          key={g.id}
          href={`/admin/giocatori/${g.id}`}
          className="scheda"
          style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
        >
          <strong>
            {g.nome} {g.cognome}
          </strong>
          {!g.attivo && <span className="badge badge--rinunciato" style={{ marginLeft: '0.5rem' }}>Inattivo</span>}
          <p className="testo-muto" style={{ margin: '0.25rem 0 0' }}>
            {LABEL_SESSO[g.sesso]} · {g.anno_nascita} · livello {formattaLivello(g.livello)} · lato {LABEL_LATO[g.lato_preferito]}
          </p>
          <p className="testo-muto" style={{ margin: '0.25rem 0 0' }}>
            {g.telefono}
            {g.affidabilita !== null && ` · affidabilità ${g.affidabilita}/5`}
          </p>
        </a>
      ))}
    </div>
  );
}
