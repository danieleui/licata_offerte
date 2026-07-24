import { useState } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { formattaLivello, LABEL_LATO } from '../../lib/domain/formatters';
import { linkInvitoPubblico, linkWhatsApp, messaggioInvito } from '../../lib/domain/whatsapp';
import type { MatchRow, PlayerRow, StatoPartecipazione } from '../../lib/supabase/types';

export interface PartecipanteConGiocatore {
  id: string;
  stato: StatoPartecipazione;
  posizione_attesa: number | null;
  risposto_at: string | null;
  player: PlayerRow;
}

interface Props {
  partita: Pick<MatchRow, 'id' | 'data' | 'ora_inizio' | 'ora_fine' | 'circolo' | 'indirizzo' | 'costo'>;
  partecipanti: PartecipanteConGiocatore[];
}

const COLONNE: Array<{ stato: StatoPartecipazione; titolo: string }> = [
  { stato: 'confermato', titolo: 'Confermati' },
  { stato: 'lista_attesa', titolo: "Lista d'attesa" },
  { stato: 'invitato', titolo: 'In attesa di risposta' },
  { stato: 'declinato', titolo: 'Declinati' },
  { stato: 'rinunciato', titolo: 'Hanno rinunciato' },
];

export default function ParticipantsBoard({ partita, partecipanti }: Props) {
  const [rigenerati, setRigenerati] = useState<Record<string, string>>({});
  const [inCorso, setInCorso] = useState<string | null>(null);

  async function reinvita(p: PartecipanteConGiocatore) {
    setInCorso(p.id);
    const supabase = getSupabaseBrowserClient();
    const { data: token, error } = await supabase.rpc('admin_invite_player', {
      p_match_id: partita.id,
      p_player_id: p.player.id,
    });
    setInCorso(null);
    if (error || !token) return;

    const link = linkInvitoPubblico(window.location.origin, token);
    const messaggio = messaggioInvito({ nomeGiocatore: p.player.nome, partita, link });
    setRigenerati((prev) => ({ ...prev, [p.id]: linkWhatsApp(p.player.telefono, messaggio) }));
  }

  return (
    <div className="scheda">
      <h2>Partecipanti</h2>
      {COLONNE.map(({ stato, titolo }) => {
        const righe = partecipanti.filter((p) => p.stato === stato);
        if (righe.length === 0) return null;
        return (
          <div key={stato} style={{ marginBottom: '1rem' }}>
            <h3>
              {titolo} ({righe.length})
            </h3>
            {righe.map((p) => (
              <div key={p.id} className="scheda" style={{ background: 'var(--colore-sfondo-alt)' }}>
                <strong>
                  {p.player.nome} {p.player.cognome}
                </strong>
                {stato === 'lista_attesa' && p.posizione_attesa !== null && (
                  <span className="testo-muto"> — posizione {p.posizione_attesa}</span>
                )}
                <p className="testo-muto" style={{ margin: '0.25rem 0' }}>
                  {p.player.telefono} · livello {formattaLivello(p.player.livello)} · lato {LABEL_LATO[p.player.lato_preferito]}
                  {p.player.affidabilita !== null && ` · affidabilità ${p.player.affidabilita}/5`}
                </p>
                {p.player.note_private && <p className="testo-muto">Note: {p.player.note_private}</p>}

                {(stato === 'invitato' || stato === 'declinato' || stato === 'rinunciato') && (
                  <div>
                    <button
                      className="pulsante pulsante--secondario"
                      disabled={inCorso === p.id}
                      onClick={() => reinvita(p)}
                    >
                      {inCorso === p.id ? 'Generazione link…' : 'Reinvita (nuovo link)'}
                    </button>
                    {rigenerati[p.id] && (
                      <a
                        className="pulsante pulsante--primario"
                        href={rigenerati[p.id]}
                        target="_blank"
                        rel="noreferrer noopener"
                        style={{ marginTop: '0.5rem' }}
                      >
                        Apri su WhatsApp
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
