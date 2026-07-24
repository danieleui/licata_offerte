import { useMemo, useState } from 'react';
import MatchActions from './MatchActions';
import MatchForm from './MatchForm';
import InviteSelector from './InviteSelector';
import ParticipantsBoard, { type PartecipanteConGiocatore } from './ParticipantsBoard';
import MessagesInbox, { type MessaggioConGiocatore } from './MessagesInbox';
import {
  formattaCosto,
  formattaData,
  formattaOra,
  LABEL_SESSO_RICHIESTO,
  LABEL_STATO_CAMPO,
  LABEL_STATO_PARTITA,
  classeBadgeStatoPartita,
} from '../../lib/domain/formatters';
import type { MatchRow, PlayerRow, StatoPartecipazione } from '../../lib/supabase/types';

interface Props {
  partita: MatchRow;
  giocatoriAttivi: PlayerRow[];
  partecipanti: PartecipanteConGiocatore[];
  messaggi: MessaggioConGiocatore[];
}

export default function MatchDetail({ partita, giocatoriAttivi, partecipanti, messaggi }: Props) {
  const [modificaAperta, setModificaAperta] = useState(false);

  const statoAttuale = useMemo(() => {
    const mappa: Record<string, StatoPartecipazione> = {};
    for (const p of partecipanti) mappa[p.player.id] = p.stato;
    return mappa;
  }, [partecipanti]);

  const terminale = partita.stato === 'annullata' || partita.stato === 'conclusa';

  return (
    <div>
      <div className="scheda">
        <span className={`badge ${classeBadgeStatoPartita(partita.stato)}`}>{LABEL_STATO_PARTITA[partita.stato]}</span>
        <span className="badge badge--invitato" style={{ marginLeft: '0.5rem' }}>
          {LABEL_STATO_CAMPO[partita.stato_campo]}
        </span>
        <h1 style={{ marginTop: '0.75rem' }}>
          {formattaData(partita.data)} · {formattaOra(partita.ora_inizio)}–{formattaOra(partita.ora_fine)}
        </h1>
        <p>{partita.circolo}</p>
        <p className="testo-muto">{partita.indirizzo}{partita.numero_campo && ` · campo ${partita.numero_campo}`}</p>
        <p className="testo-muto">Costo: {formattaCosto(partita.costo)}</p>
        <p className="testo-muto">
          Richiesti: {LABEL_SESSO_RICHIESTO[partita.sesso_richiesto]}
          {partita.fascia_eta && ` · fascia età ${partita.fascia_eta}`}
          {partita.livello_min !== null && ` · livello min ${partita.livello_min}`}
          {partita.livello_max !== null && ` · livello max ${partita.livello_max}`}
        </p>
        {partita.note && <p className="testo-muto">Note: {partita.note}</p>}
        {partita.stato === 'annullata' && partita.motivo_annullamento && (
          <p className="errore">Motivo annullamento: {partita.motivo_annullamento}</p>
        )}

        {!terminale && (
          <button className="pulsante pulsante--secondario" onClick={() => setModificaAperta((v) => !v)}>
            {modificaAperta ? 'Chiudi modifica' : 'Modifica dettagli'}
          </button>
        )}
      </div>

      {modificaAperta && <MatchForm partita={partita} onSalvato={() => window.location.reload()} />}

      <MatchActions partita={partita} />

      {!terminale && (
        <InviteSelector partita={partita} giocatoriDisponibili={giocatoriAttivi} statoAttuale={statoAttuale} />
      )}

      <ParticipantsBoard partita={partita} partecipanti={partecipanti} />

      <MessagesInbox messaggi={messaggi} />
    </div>
  );
}
