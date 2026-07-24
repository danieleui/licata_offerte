import { FASCE_ETA_SUGGERITE, type FiltriGiocatori } from '../../lib/domain/players';

interface Props {
  filtri: FiltriGiocatori;
  onChange: (filtri: FiltriGiocatori) => void;
}

export default function PlayerFilters({ filtri, onChange }: Props) {
  return (
    <div className="scheda">
      <div className="campo">
        <label htmlFor="filtro-testo">Cerca per nome</label>
        <input
          id="filtro-testo"
          type="search"
          value={filtri.testo}
          onChange={(e) => onChange({ ...filtri, testo: e.target.value })}
          placeholder="Nome o cognome…"
        />
      </div>

      <div className="campo">
        <label htmlFor="filtro-stato">Stato</label>
        <select
          id="filtro-stato"
          value={filtri.stato}
          onChange={(e) => onChange({ ...filtri, stato: e.target.value as FiltriGiocatori['stato'] })}
        >
          <option value="attivi">Solo attivi</option>
          <option value="inattivi">Solo inattivi</option>
          <option value="tutti">Tutti</option>
        </select>
      </div>

      <div className="campo">
        <label htmlFor="filtro-sesso">Sesso</label>
        <select
          id="filtro-sesso"
          value={filtri.sesso}
          onChange={(e) => onChange({ ...filtri, sesso: e.target.value as FiltriGiocatori['sesso'] })}
        >
          <option value="tutti">Tutti</option>
          <option value="M">Uomo</option>
          <option value="F">Donna</option>
          <option value="Altro">Altro</option>
        </select>
      </div>

      <div className="campo">
        <label htmlFor="filtro-fascia">Fascia d'età</label>
        <select
          id="filtro-fascia"
          value={filtri.fasciaEta}
          onChange={(e) => onChange({ ...filtri, fasciaEta: e.target.value })}
        >
          <option value="tutte">Tutte</option>
          {FASCE_ETA_SUGGERITE.map((fascia) => (
            <option key={fascia} value={fascia}>
              {fascia}
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label htmlFor="filtro-lato">Lato preferito</label>
        <select
          id="filtro-lato"
          value={filtri.lato}
          onChange={(e) => onChange({ ...filtri, lato: e.target.value as FiltriGiocatori['lato'] })}
        >
          <option value="tutti">Tutti</option>
          <option value="sinistra">Sinistra</option>
          <option value="destra">Destra</option>
          <option value="indifferente">Indifferente</option>
        </select>
      </div>

      <div className="campo">
        <label htmlFor="filtro-livello-min">Livello minimo</label>
        <input
          id="filtro-livello-min"
          type="number"
          step={0.5}
          min={1}
          max={5}
          value={filtri.livelloMin ?? ''}
          onChange={(e) => onChange({ ...filtri, livelloMin: e.target.value === '' ? null : Number(e.target.value) })}
        />
      </div>

      <div className="campo">
        <label htmlFor="filtro-livello-max">Livello massimo</label>
        <input
          id="filtro-livello-max"
          type="number"
          step={0.5}
          min={1}
          max={5}
          value={filtri.livelloMax ?? ''}
          onChange={(e) => onChange({ ...filtri, livelloMax: e.target.value === '' ? null : Number(e.target.value) })}
        />
      </div>
    </div>
  );
}
