import { useState } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import type { PlayerMessageRow, PlayerRow } from '../../lib/supabase/types';

export interface MessaggioConGiocatore extends PlayerMessageRow {
  player: Pick<PlayerRow, 'nome' | 'cognome'>;
}

interface Props {
  messaggi: MessaggioConGiocatore[];
}

export default function MessagesInbox({ messaggi }: Props) {
  const [letti, setLetti] = useState<Set<string>>(
    new Set(messaggi.filter((m) => m.letto_at !== null).map((m) => m.id)),
  );

  async function segnaComeLetto(id: string) {
    setLetti((prev) => new Set(prev).add(id));
    const supabase = getSupabaseBrowserClient();
    await supabase.from('player_messages').update({ letto_at: new Date().toISOString() }).eq('id', id);
  }

  if (messaggi.length === 0) {
    return (
      <div className="scheda">
        <h2>Messaggi privati</h2>
        <p className="testo-muto">Nessun messaggio per questa partita.</p>
      </div>
    );
  }

  return (
    <div className="scheda">
      <h2>Messaggi privati</h2>
      {messaggi.map((m) => {
        const nonLetto = !letti.has(m.id);
        return (
          <div
            key={m.id}
            className="scheda"
            style={{ background: nonLetto ? '#fdf1dc' : 'var(--colore-sfondo-alt)' }}
          >
            <strong>
              {m.player.nome} {m.player.cognome}
            </strong>
            <p style={{ whiteSpace: 'pre-wrap' }}>{m.testo}</p>
            <p className="testo-muto">{new Date(m.creato_at).toLocaleString('it-IT')}</p>
            {nonLetto && (
              <button className="pulsante pulsante--secondario" onClick={() => segnaComeLetto(m.id)}>
                Segna come letto
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
