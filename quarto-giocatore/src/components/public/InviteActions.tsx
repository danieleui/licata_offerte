import { useState } from 'react';
import { azioniConsentite } from '../../lib/domain/matchState';
import { LABEL_STATO_PARTECIPAZIONE } from '../../lib/domain/formatters';
import type { StatoPartecipazione, StatoPartita } from '../../lib/supabase/types';

interface Props {
  token: string;
  statoPartita: StatoPartita;
  statoPartecipazione: StatoPartecipazione;
  posizioneAttesa: number | null;
}

export default function InviteActions({ token, statoPartita, statoPartecipazione, posizioneAttesa }: Props) {
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const azioni = azioniConsentite(statoPartita, statoPartecipazione);

  async function rispondi(azione: 'conferma' | 'declina' | 'rinuncia') {
    setErrore(null);
    setInCorso(true);
    try {
      const risposta = await fetch(`/api/i/${token}/rispondi`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ azione }),
      });
      const corpo = (await risposta.json()) as { ok?: boolean; errore?: string };
      if (!risposta.ok || corpo.errore) {
        setErrore('Non è stato possibile registrare la tua risposta. Ricarica la pagina e riprova.');
        setInCorso(false);
        return;
      }
      window.location.reload();
    } catch {
      setErrore('Connessione non riuscita. Controlla la rete e riprova.');
      setInCorso(false);
    }
  }

  return (
    <div className="scheda">
      <p>
        Il tuo stato: <strong>{LABEL_STATO_PARTECIPAZIONE[statoPartecipazione]}</strong>
        {statoPartecipazione === 'lista_attesa' && posizioneAttesa !== null && (
          <span> (posizione {posizioneAttesa})</span>
        )}
      </p>

      {errore && <p className="errore">{errore}</p>}

      <div className="gruppo-pulsanti">
        {azioni.puoConfermare && (
          <button className="pulsante pulsante--primario" disabled={inCorso} onClick={() => rispondi('conferma')}>
            Partecipo
          </button>
        )}
        {azioni.puoDeclinare && (
          <button className="pulsante pulsante--secondario" disabled={inCorso} onClick={() => rispondi('declina')}>
            Non posso
          </button>
        )}
        {azioni.puoRinunciare && (
          <button className="pulsante pulsante--pericolo" disabled={inCorso} onClick={() => rispondi('rinuncia')}>
            Rinuncio
          </button>
        )}
      </div>
    </div>
  );
}
