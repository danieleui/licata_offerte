import { useState } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { motivoAnnullamentoSchema } from '../../lib/domain/validation';
import type { MatchRow } from '../../lib/supabase/types';

interface Props {
  partita: MatchRow;
}

export default function MatchActions({ partita }: Props) {
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function eseguiRpc(nome: 'admin_apri_partita' | 'admin_segna_campo_prenotato' | 'admin_imposta_ricerca_sostituto' | 'admin_conclude_partita') {
    setErrore(null);
    setInCorso(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.rpc(nome, { p_match_id: partita.id });
    setInCorso(false);
    if (error) {
      setErrore("Azione non riuscita. Ricarica la pagina e riprova.");
      return;
    }
    window.location.reload();
  }

  async function annullaPartita() {
    const motivo = window.prompt('Motivo dell\'annullamento (obbligatorio):');
    if (motivo === null) return;

    const risultato = motivoAnnullamentoSchema.safeParse(motivo);
    if (!risultato.success) {
      setErrore(risultato.error.issues[0]?.message ?? 'Motivo non valido');
      return;
    }

    if (!window.confirm('Confermi l\'annullamento della partita? Non sarà più possibile modificarla.')) return;

    setErrore(null);
    setInCorso(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.rpc('admin_annulla_partita', {
      p_match_id: partita.id,
      p_motivo: risultato.data,
    });
    setInCorso(false);
    if (error) {
      setErrore('Annullamento non riuscito. Riprova.');
      return;
    }
    window.location.reload();
  }

  const terminale = partita.stato === 'annullata' || partita.stato === 'conclusa';
  if (terminale) return null;

  return (
    <div className="scheda">
      <h2>Azioni</h2>
      {errore && <p className="errore">{errore}</p>}
      <div className="gruppo-pulsanti">
        {partita.stato === 'bozza' && (
          <button className="pulsante pulsante--primario" disabled={inCorso} onClick={() => eseguiRpc('admin_apri_partita')}>
            Apri agli inviti
          </button>
        )}
        {partita.stato_campo === 'da_prenotare' && partita.stato !== 'bozza' && (
          <button
            className="pulsante pulsante--primario"
            disabled={inCorso}
            onClick={() => eseguiRpc('admin_segna_campo_prenotato')}
          >
            Segna campo come prenotato
          </button>
        )}
        {partita.stato !== 'bozza' && (
          <button
            className="pulsante pulsante--secondario"
            disabled={inCorso}
            onClick={() => eseguiRpc('admin_imposta_ricerca_sostituto')}
          >
            Segna ricerca sostituto
          </button>
        )}
        <button className="pulsante pulsante--secondario" disabled={inCorso} onClick={() => eseguiRpc('admin_conclude_partita')}>
          Segna come conclusa
        </button>
        <button className="pulsante pulsante--pericolo" disabled={inCorso} onClick={annullaPartita}>
          Annulla partita
        </button>
      </div>
    </div>
  );
}
