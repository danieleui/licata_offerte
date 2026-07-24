import { describe, expect, it } from 'vitest';
import { azioniConsentite, partitaModificabile, postiLiberi } from '../../src/lib/domain/matchState';

describe('postiLiberi', () => {
  it('restituisce 4 quando nessuno è confermato', () => {
    expect(postiLiberi(0)).toBe(4);
  });

  it('non va mai sotto zero', () => {
    expect(postiLiberi(5)).toBe(0);
  });
});

describe('partitaModificabile', () => {
  it('è false per annullata e conclusa', () => {
    expect(partitaModificabile('annullata')).toBe(false);
    expect(partitaModificabile('conclusa')).toBe(false);
  });

  it('è true per gli altri stati', () => {
    expect(partitaModificabile('aperta_campo_da_prenotare')).toBe(true);
    expect(partitaModificabile('confermata')).toBe(true);
  });
});

describe('azioniConsentite', () => {
  it('un invitato può confermare o declinare, non rinunciare', () => {
    const azioni = azioniConsentite('aperta_campo_da_prenotare', 'invitato');
    expect(azioni.puoConfermare).toBe(true);
    expect(azioni.puoDeclinare).toBe(true);
    expect(azioni.puoRinunciare).toBe(false);
  });

  it('un confermato può solo rinunciare, non declinare', () => {
    const azioni = azioniConsentite('confermata', 'confermato');
    expect(azioni.puoConfermare).toBe(false);
    expect(azioni.puoDeclinare).toBe(false);
    expect(azioni.puoRinunciare).toBe(true);
  });

  it('chi è in lista d\'attesa può rinunciare', () => {
    const azioni = azioniConsentite('completa_campo_da_prenotare', 'lista_attesa');
    expect(azioni.puoRinunciare).toBe(true);
    expect(azioni.puoConfermare).toBe(false);
  });

  it('dopo annullamento nessuna azione di adesione è consentita, ma si può scrivere', () => {
    const azioni = azioniConsentite('annullata', 'confermato');
    expect(azioni.puoConfermare).toBe(false);
    expect(azioni.puoDeclinare).toBe(false);
    expect(azioni.puoRinunciare).toBe(false);
    expect(azioni.puoScrivere).toBe(true);
  });

  it('chi ha declinato può cambiare idea e confermare', () => {
    const azioni = azioniConsentite('aperta_campo_da_prenotare', 'declinato');
    expect(azioni.puoConfermare).toBe(true);
  });
});
