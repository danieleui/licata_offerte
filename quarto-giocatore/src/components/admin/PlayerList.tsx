import { useMemo, useState } from 'react';
import PlayerFilters from './PlayerFilters';
import PlayerTable from './PlayerTable';
import { FILTRI_INIZIALI, filtraGiocatori } from '../../lib/domain/players';
import type { PlayerRow } from '../../lib/supabase/types';

interface Props {
  giocatoriIniziali: PlayerRow[];
}

export default function PlayerList({ giocatoriIniziali }: Props) {
  const [filtri, setFiltri] = useState(FILTRI_INIZIALI);
  const giocatoriFiltrati = useMemo(
    () => filtraGiocatori(giocatoriIniziali, filtri),
    [giocatoriIniziali, filtri],
  );

  return (
    <div>
      <div className="gruppo-pulsanti" style={{ marginBottom: '1rem' }}>
        <a className="pulsante pulsante--primario" href="/admin/giocatori/nuovo">
          + Nuovo giocatore
        </a>
      </div>
      <PlayerFilters filtri={filtri} onChange={setFiltri} />
      <p className="testo-muto">{giocatoriFiltrati.length} giocatori trovati</p>
      <PlayerTable giocatori={giocatoriFiltrati} />
    </div>
  );
}
