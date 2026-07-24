import { describe, expect, it } from 'vitest';
import { FILTRI_INIZIALI, filtraGiocatori } from '../../src/lib/domain/players';
import type { PlayerRow } from '../../src/lib/supabase/types';

function creaGiocatore(overrides: Partial<PlayerRow>): PlayerRow {
  return {
    id: crypto.randomUUID(),
    nome: 'Mario',
    cognome: 'Rossi',
    telefono: '333',
    sesso: 'M',
    anno_nascita: 1990,
    fascia_eta: '25-34',
    livello: 3,
    lato_preferito: 'destra',
    affidabilita: 4,
    note_private: null,
    attivo: true,
    creato_at: new Date().toISOString(),
    aggiornato_at: new Date().toISOString(),
    creato_da: null,
    ...overrides,
  };
}

describe('filtraGiocatori', () => {
  const giocatori = [
    creaGiocatore({ nome: 'Mario', cognome: 'Rossi', sesso: 'M', livello: 3, attivo: true }),
    creaGiocatore({ nome: 'Giulia', cognome: 'Verdi', sesso: 'F', livello: 4.5, attivo: true }),
    creaGiocatore({ nome: 'Luca', cognome: 'Bianchi', sesso: 'M', livello: 2, attivo: false }),
  ];

  it('di default mostra solo gli attivi', () => {
    const risultato = filtraGiocatori(giocatori, FILTRI_INIZIALI);
    expect(risultato).toHaveLength(2);
    expect(risultato.every((g) => g.attivo)).toBe(true);
  });

  it('filtra per sesso', () => {
    const risultato = filtraGiocatori(giocatori, { ...FILTRI_INIZIALI, sesso: 'F' });
    expect(risultato).toHaveLength(1);
    expect(risultato[0]?.nome).toBe('Giulia');
  });

  it('filtra per range di livello', () => {
    const risultato = filtraGiocatori(giocatori, {
      ...FILTRI_INIZIALI,
      stato: 'tutti',
      livelloMin: 2.5,
      livelloMax: 4,
    });
    expect(risultato).toHaveLength(1);
    expect(risultato[0]?.nome).toBe('Mario');
  });

  it('filtra per testo su nome e cognome', () => {
    const risultato = filtraGiocatori(giocatori, { ...FILTRI_INIZIALI, testo: 'verdi' });
    expect(risultato).toHaveLength(1);
    expect(risultato[0]?.cognome).toBe('Verdi');
  });
});
