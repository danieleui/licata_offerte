import { useState } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { giocatoreSchema, type GiocatoreForm } from '../../lib/domain/validation';
import { FASCE_ETA_SUGGERITE } from '../../lib/domain/players';
import type { PlayerRow } from '../../lib/supabase/types';

interface Props {
  giocatore?: PlayerRow;
}

function datiIniziali(giocatore?: PlayerRow): GiocatoreForm {
  return {
    nome: giocatore?.nome ?? '',
    cognome: giocatore?.cognome ?? '',
    telefono: giocatore?.telefono ?? '',
    sesso: giocatore?.sesso ?? 'M',
    anno_nascita: giocatore?.anno_nascita ?? new Date().getFullYear() - 30,
    fascia_eta: giocatore?.fascia_eta ?? null,
    livello: giocatore?.livello ?? 3,
    lato_preferito: giocatore?.lato_preferito ?? 'indifferente',
    affidabilita: giocatore?.affidabilita ?? null,
    note_private: giocatore?.note_private ?? null,
    attivo: giocatore?.attivo ?? true,
  };
}

export default function PlayerForm({ giocatore }: Props) {
  const [dati, setDati] = useState<GiocatoreForm>(datiIniziali(giocatore));
  const [errori, setErrori] = useState<Record<string, string>>({});
  const [salvataggio, setSalvataggio] = useState(false);
  const [erroreGenerale, setErroreGenerale] = useState<string | null>(null);

  function aggiorna<K extends keyof GiocatoreForm>(campo: K, valore: GiocatoreForm[K]) {
    setDati((prev) => ({ ...prev, [campo]: valore }));
  }

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setErroreGenerale(null);

    const risultato = giocatoreSchema.safeParse(dati);
    if (!risultato.success) {
      const nuoviErrori: Record<string, string> = {};
      for (const issue of risultato.error.issues) {
        const chiave = issue.path[0];
        if (typeof chiave === 'string') nuoviErrori[chiave] = issue.message;
      }
      setErrori(nuoviErrori);
      return;
    }
    setErrori({});
    setSalvataggio(true);

    const supabase = getSupabaseBrowserClient();
    const { error } = giocatore
      ? await supabase.from('players').update(risultato.data).eq('id', giocatore.id)
      : await supabase.from('players').insert(risultato.data);

    setSalvataggio(false);
    if (error) {
      setErroreGenerale('Salvataggio non riuscito. Controlla i dati e riprova.');
      return;
    }
    window.location.href = '/admin/giocatori';
  }

  return (
    <form className="scheda" onSubmit={handleSubmit}>
      <div className="campo">
        <label htmlFor="nome">Nome</label>
        <input id="nome" value={dati.nome} onChange={(e) => aggiorna('nome', e.target.value)} required />
        {errori.nome && <p className="errore">{errori.nome}</p>}
      </div>

      <div className="campo">
        <label htmlFor="cognome">Cognome</label>
        <input id="cognome" value={dati.cognome} onChange={(e) => aggiorna('cognome', e.target.value)} required />
        {errori.cognome && <p className="errore">{errori.cognome}</p>}
      </div>

      <div className="campo">
        <label htmlFor="telefono">Telefono</label>
        <input
          id="telefono"
          type="tel"
          value={dati.telefono}
          onChange={(e) => aggiorna('telefono', e.target.value)}
          placeholder="+39 333 1234567"
          required
        />
        {errori.telefono && <p className="errore">{errori.telefono}</p>}
      </div>

      <div className="campo">
        <label htmlFor="sesso">Sesso</label>
        <select id="sesso" value={dati.sesso} onChange={(e) => aggiorna('sesso', e.target.value as GiocatoreForm['sesso'])}>
          <option value="M">Uomo</option>
          <option value="F">Donna</option>
          <option value="Altro">Altro</option>
        </select>
      </div>

      <div className="campo">
        <label htmlFor="anno_nascita">Anno di nascita</label>
        <input
          id="anno_nascita"
          type="number"
          value={dati.anno_nascita}
          onChange={(e) => aggiorna('anno_nascita', Number(e.target.value))}
        />
        {errori.anno_nascita && <p className="errore">{errori.anno_nascita}</p>}
      </div>

      <div className="campo">
        <label htmlFor="fascia_eta">Fascia d'età</label>
        <input
          id="fascia_eta"
          list="fasce-eta"
          value={dati.fascia_eta ?? ''}
          onChange={(e) => aggiorna('fascia_eta', e.target.value || null)}
          placeholder="Es. 35-44"
        />
        <datalist id="fasce-eta">
          {FASCE_ETA_SUGGERITE.map((fascia) => (
            <option key={fascia} value={fascia} />
          ))}
        </datalist>
      </div>

      <div className="campo">
        <label htmlFor="livello">Livello (1–5, incrementi di 0,5)</label>
        <input
          id="livello"
          type="number"
          step={0.5}
          min={1}
          max={5}
          value={dati.livello}
          onChange={(e) => aggiorna('livello', Number(e.target.value))}
        />
        {errori.livello && <p className="errore">{errori.livello}</p>}
      </div>

      <div className="campo">
        <label htmlFor="lato_preferito">Lato preferito</label>
        <select
          id="lato_preferito"
          value={dati.lato_preferito}
          onChange={(e) => aggiorna('lato_preferito', e.target.value as GiocatoreForm['lato_preferito'])}
        >
          <option value="sinistra">Sinistra</option>
          <option value="destra">Destra</option>
          <option value="indifferente">Indifferente</option>
        </select>
      </div>

      <div className="campo">
        <label htmlFor="affidabilita">Affidabilità (1–5)</label>
        <input
          id="affidabilita"
          type="number"
          min={1}
          max={5}
          value={dati.affidabilita ?? ''}
          onChange={(e) => aggiorna('affidabilita', e.target.value === '' ? null : Number(e.target.value))}
        />
        {errori.affidabilita && <p className="errore">{errori.affidabilita}</p>}
      </div>

      <div className="campo">
        <label htmlFor="note_private">Note private</label>
        <textarea
          id="note_private"
          rows={3}
          value={dati.note_private ?? ''}
          onChange={(e) => aggiorna('note_private', e.target.value || null)}
        />
      </div>

      <div className="campo">
        <label>
          <input
            type="checkbox"
            checked={dati.attivo}
            onChange={(e) => aggiorna('attivo', e.target.checked)}
            style={{ width: 'auto', marginRight: '0.5rem' }}
          />
          Giocatore attivo
        </label>
      </div>

      {erroreGenerale && <p className="errore">{erroreGenerale}</p>}

      <button className="pulsante pulsante--primario" type="submit" disabled={salvataggio}>
        {salvataggio ? 'Salvataggio…' : 'Salva'}
      </button>
    </form>
  );
}
