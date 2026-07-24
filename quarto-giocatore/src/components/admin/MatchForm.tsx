import { useState } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';
import { partitaSchema, type PartitaForm } from '../../lib/domain/validation';
import type { MatchRow } from '../../lib/supabase/types';

interface Props {
  partita?: MatchRow;
  onSalvato?: (partitaId: string) => void;
}

function datiIniziali(partita?: MatchRow): PartitaForm {
  return {
    data: partita?.data ?? '',
    ora_inizio: partita?.ora_inizio.slice(0, 5) ?? '',
    ora_fine: partita?.ora_fine.slice(0, 5) ?? '',
    circolo: partita?.circolo ?? '',
    indirizzo: partita?.indirizzo ?? '',
    numero_campo: partita?.numero_campo ?? null,
    costo: partita?.costo ?? null,
    sesso_richiesto: partita?.sesso_richiesto ?? 'Qualsiasi',
    fascia_eta: partita?.fascia_eta ?? null,
    livello_min: partita?.livello_min ?? null,
    livello_max: partita?.livello_max ?? null,
    note: partita?.note ?? null,
  };
}

export default function MatchForm({ partita, onSalvato }: Props) {
  const [dati, setDati] = useState<PartitaForm>(datiIniziali(partita));
  const [errori, setErrori] = useState<Record<string, string>>({});
  const [salvataggio, setSalvataggio] = useState(false);
  const [erroreGenerale, setErroreGenerale] = useState<string | null>(null);

  function aggiorna<K extends keyof PartitaForm>(campo: K, valore: PartitaForm[K]) {
    setDati((prev) => ({ ...prev, [campo]: valore }));
  }

  async function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setErroreGenerale(null);

    const risultato = partitaSchema.safeParse(dati);
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
    if (partita) {
      const { error } = await supabase.from('matches').update(risultato.data).eq('id', partita.id);
      setSalvataggio(false);
      if (error) {
        setErroreGenerale('Salvataggio non riuscito. Controlla i dati e riprova.');
        return;
      }
      onSalvato?.(partita.id);
    } else {
      const { data: nuovaPartita, error } = await supabase
        .from('matches')
        .insert(risultato.data)
        .select('id')
        .single();
      setSalvataggio(false);
      if (error || !nuovaPartita) {
        setErroreGenerale('Creazione non riuscita. Controlla i dati e riprova.');
        return;
      }
      window.location.href = `/admin/partite/${nuovaPartita.id}`;
    }
  }

  return (
    <form className="scheda" onSubmit={handleSubmit}>
      <div className="campo">
        <label htmlFor="data">Data</label>
        <input id="data" type="date" value={dati.data} onChange={(e) => aggiorna('data', e.target.value)} required />
        {errori.data && <p className="errore">{errori.data}</p>}
      </div>

      <div className="campo">
        <label htmlFor="ora_inizio">Ora di inizio</label>
        <input
          id="ora_inizio"
          type="time"
          value={dati.ora_inizio}
          onChange={(e) => aggiorna('ora_inizio', e.target.value)}
          required
        />
        {errori.ora_inizio && <p className="errore">{errori.ora_inizio}</p>}
      </div>

      <div className="campo">
        <label htmlFor="ora_fine">Ora di fine</label>
        <input
          id="ora_fine"
          type="time"
          value={dati.ora_fine}
          onChange={(e) => aggiorna('ora_fine', e.target.value)}
          required
        />
        {errori.ora_fine && <p className="errore">{errori.ora_fine}</p>}
      </div>

      <div className="campo">
        <label htmlFor="circolo">Circolo</label>
        <input id="circolo" value={dati.circolo} onChange={(e) => aggiorna('circolo', e.target.value)} required />
        {errori.circolo && <p className="errore">{errori.circolo}</p>}
      </div>

      <div className="campo">
        <label htmlFor="indirizzo">Indirizzo</label>
        <input id="indirizzo" value={dati.indirizzo} onChange={(e) => aggiorna('indirizzo', e.target.value)} required />
        {errori.indirizzo && <p className="errore">{errori.indirizzo}</p>}
      </div>

      <div className="campo">
        <label htmlFor="numero_campo">Numero campo (opzionale)</label>
        <input
          id="numero_campo"
          value={dati.numero_campo ?? ''}
          onChange={(e) => aggiorna('numero_campo', e.target.value || null)}
        />
      </div>

      <div className="campo">
        <label htmlFor="costo">Costo (€, opzionale)</label>
        <input
          id="costo"
          type="number"
          step={0.5}
          min={0}
          value={dati.costo ?? ''}
          onChange={(e) => aggiorna('costo', e.target.value === '' ? null : Number(e.target.value))}
        />
      </div>

      <div className="campo">
        <label htmlFor="sesso_richiesto">Sesso richiesto</label>
        <select
          id="sesso_richiesto"
          value={dati.sesso_richiesto}
          onChange={(e) => aggiorna('sesso_richiesto', e.target.value as PartitaForm['sesso_richiesto'])}
        >
          <option value="Qualsiasi">Qualsiasi</option>
          <option value="M">Solo uomini</option>
          <option value="F">Solo donne</option>
          <option value="Misto">Misto</option>
        </select>
      </div>

      <div className="campo">
        <label htmlFor="fascia_eta">Fascia d'età richiesta (opzionale)</label>
        <input
          id="fascia_eta"
          value={dati.fascia_eta ?? ''}
          onChange={(e) => aggiorna('fascia_eta', e.target.value || null)}
          placeholder="Es. 35-44"
        />
      </div>

      <div className="campo">
        <label htmlFor="livello_min">Livello minimo (opzionale)</label>
        <input
          id="livello_min"
          type="number"
          step={0.5}
          min={1}
          max={5}
          value={dati.livello_min ?? ''}
          onChange={(e) => aggiorna('livello_min', e.target.value === '' ? null : Number(e.target.value))}
        />
        {errori.livello_min && <p className="errore">{errori.livello_min}</p>}
      </div>

      <div className="campo">
        <label htmlFor="livello_max">Livello massimo (opzionale)</label>
        <input
          id="livello_max"
          type="number"
          step={0.5}
          min={1}
          max={5}
          value={dati.livello_max ?? ''}
          onChange={(e) => aggiorna('livello_max', e.target.value === '' ? null : Number(e.target.value))}
        />
        {errori.livello_max && <p className="errore">{errori.livello_max}</p>}
      </div>

      <div className="campo">
        <label htmlFor="note">Note (opzionale)</label>
        <textarea id="note" rows={3} value={dati.note ?? ''} onChange={(e) => aggiorna('note', e.target.value || null)} />
      </div>

      {erroreGenerale && <p className="errore">{erroreGenerale}</p>}

      <button className="pulsante pulsante--primario" type="submit" disabled={salvataggio}>
        {salvataggio ? 'Salvataggio…' : 'Salva'}
      </button>
    </form>
  );
}
