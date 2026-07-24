import { useMemo, useState } from 'react';
import PlayerFilters from './PlayerFilters';
import WhatsAppMessageBuilder, { type InvitoGenerato } from './WhatsAppMessageBuilder';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { FILTRI_INIZIALI, filtraGiocatori } from '../../lib/domain/players';
import { LABEL_STATO_PARTECIPAZIONE } from '../../lib/domain/formatters';
import { linkInvitoPubblico, messaggioInvito } from '../../lib/domain/whatsapp';
import type { MatchRow, PlayerRow, StatoPartecipazione } from '../../lib/supabase/types';

interface Props {
  partita: Pick<MatchRow, 'id' | 'data' | 'ora_inizio' | 'ora_fine' | 'circolo' | 'indirizzo' | 'costo'>;
  giocatoriDisponibili: PlayerRow[];
  statoAttuale: Record<string, StatoPartecipazione>;
}

const STATI_GIA_ATTIVI: ReadonlySet<StatoPartecipazione> = new Set(['invitato', 'confermato', 'lista_attesa']);

export default function InviteSelector({ partita, giocatoriDisponibili, statoAttuale }: Props) {
  const [filtri, setFiltri] = useState(FILTRI_INIZIALI);
  const [selezionati, setSelezionati] = useState<Set<string>>(new Set());
  const [invioInCorso, setInvioInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [invitiGenerati, setInvitiGenerati] = useState<InvitoGenerato[]>([]);

  const giocatoriFiltrati = useMemo(
    () => filtraGiocatori(giocatoriDisponibili, filtri),
    [giocatoriDisponibili, filtri],
  );

  function toggleSelezione(id: string) {
    setSelezionati((prev) => {
      const nuovo = new Set(prev);
      if (nuovo.has(id)) nuovo.delete(id);
      else nuovo.add(id);
      return nuovo;
    });
  }

  async function invitaSelezionati() {
    if (selezionati.size === 0) return;
    setErrore(null);
    setInvioInCorso(true);

    const supabase = getSupabaseBrowserClient();
    const origin = window.location.origin;
    const nuoviInviti: InvitoGenerato[] = [];

    for (const giocatoreId of selezionati) {
      const giocatore = giocatoriDisponibili.find((g) => g.id === giocatoreId);
      if (!giocatore) continue;

      const { data: token, error } = await supabase.rpc('admin_invite_player', {
        p_match_id: partita.id,
        p_player_id: giocatoreId,
      });

      if (error || !token) {
        setErrore(`Invito non riuscito per ${giocatore.nome} ${giocatore.cognome}.`);
        continue;
      }

      const link = linkInvitoPubblico(origin, token);
      nuoviInviti.push({
        giocatoreId,
        nomeCompleto: `${giocatore.nome} ${giocatore.cognome}`,
        telefono: giocatore.telefono,
        messaggio: messaggioInvito({ nomeGiocatore: giocatore.nome, partita, link }),
      });
    }

    setInvioInCorso(false);
    setInvitiGenerati(nuoviInviti);
    setSelezionati(new Set());
  }

  return (
    <div className="scheda">
      <h2>Invita giocatori</h2>
      <PlayerFilters filtri={filtri} onChange={setFiltri} />
      <div>
        {giocatoriFiltrati.map((g) => {
          const statoEsistente = statoAttuale[g.id];
          const giaAttivo = statoEsistente !== undefined && STATI_GIA_ATTIVI.has(statoEsistente);
          return (
            <label
              key={g.id}
              className="scheda"
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: giaAttivo ? 0.6 : 1 }}
            >
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={selezionati.has(g.id)}
                disabled={giaAttivo}
                onChange={() => toggleSelezione(g.id)}
              />
              <span>
                {g.nome} {g.cognome}
                {statoEsistente && (
                  <span className="testo-muto"> — {LABEL_STATO_PARTECIPAZIONE[statoEsistente]}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {errore && <p className="errore">{errore}</p>}

      <button
        className="pulsante pulsante--primario"
        disabled={invioInCorso || selezionati.size === 0}
        onClick={invitaSelezionati}
      >
        {invioInCorso ? 'Invio in corso…' : `Invita ${selezionati.size || ''} giocatori`.trim()}
      </button>

      <WhatsAppMessageBuilder inviti={invitiGenerati} />
      {invitiGenerati.length > 0 && (
        <button className="pulsante pulsante--secondario" onClick={() => window.location.reload()}>
          Aggiorna pagina per vedere gli inviti
        </button>
      )}
    </div>
  );
}
