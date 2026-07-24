import { describe, expect, it } from 'vitest';
import { formattaCosto, formattaLivello, formattaOra } from '../../src/lib/domain/formatters';

describe('formattaLivello', () => {
  it('usa la virgola come separatore decimale', () => {
    expect(formattaLivello(3.5)).toBe('3,5');
    expect(formattaLivello(2)).toBe('2,0');
  });
});

describe('formattaCosto', () => {
  it('mostra "da definire" quando il costo è nullo', () => {
    expect(formattaCosto(null)).toBe('da definire');
  });

  it('formatta il costo con due decimali e simbolo euro', () => {
    expect(formattaCosto(12)).toBe('12,00 €');
    expect(formattaCosto(7.5)).toBe('7,50 €');
  });
});

describe('formattaOra', () => {
  it('tronca i secondi', () => {
    expect(formattaOra('18:30:00')).toBe('18:30');
  });
});
