import { linkWhatsApp } from '../../lib/domain/whatsapp';

export interface InvitoGenerato {
  giocatoreId: string;
  nomeCompleto: string;
  telefono: string;
  messaggio: string;
}

interface Props {
  inviti: InvitoGenerato[];
}

export default function WhatsAppMessageBuilder({ inviti }: Props) {
  if (inviti.length === 0) return null;

  return (
    <div className="scheda">
      <h2>Messaggi da inviare</h2>
      <p className="testo-muto">
        Apri WhatsApp con il messaggio già pronto per ciascun giocatore invitato.
      </p>
      {inviti.map((invito) => (
        <div key={invito.giocatoreId} className="scheda" style={{ background: 'var(--colore-sfondo-alt)' }}>
          <strong>{invito.nomeCompleto}</strong>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.9rem' }}>{invito.messaggio}</pre>
          <a
            className="pulsante pulsante--primario"
            href={linkWhatsApp(invito.telefono, invito.messaggio)}
            target="_blank"
            rel="noreferrer noopener"
          >
            Apri su WhatsApp
          </a>
        </div>
      ))}
    </div>
  );
}
