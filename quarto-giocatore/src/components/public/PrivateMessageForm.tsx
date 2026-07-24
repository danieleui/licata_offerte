import { useState } from 'react';
import { messaggioPrivatoSchema } from '../../lib/domain/validation';

interface Props {
  token: string;
}

export default function PrivateMessageForm({ token }: Props) {
  const [testo, setTesto] = useState('');
  const [invio, setInvio] = useState(false);
  const [inviato, setInviato] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrore(null);

    const risultato = messaggioPrivatoSchema.safeParse(testo);
    if (!risultato.success) {
      setErrore(risultato.error.issues[0]?.message ?? 'Testo non valido');
      return;
    }

    setInvio(true);
    try {
      const risposta = await fetch(`/api/i/${token}/messaggio`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ testo: risultato.data }),
      });
      const corpo = (await risposta.json()) as { ok?: boolean; errore?: string };
      setInvio(false);
      if (!risposta.ok || corpo.errore) {
        setErrore('Invio non riuscito. Riprova.');
        return;
      }
      setInviato(true);
      setTesto('');
    } catch {
      setInvio(false);
      setErrore('Connessione non riuscita. Riprova.');
    }
  }

  return (
    <div className="scheda">
      <h2>Scrivi all'organizzatore</h2>
      <form onSubmit={handleSubmit}>
        <div className="campo">
          <textarea
            rows={3}
            value={testo}
            onChange={(e) => setTesto(e.target.value)}
            placeholder="Scrivi un messaggio privato…"
          />
        </div>
        {errore && <p className="errore">{errore}</p>}
        {inviato && <p className="testo-muto">Messaggio inviato.</p>}
        <button className="pulsante pulsante--secondario" type="submit" disabled={invio}>
          {invio ? 'Invio…' : 'Invia messaggio'}
        </button>
      </form>
    </div>
  );
}
