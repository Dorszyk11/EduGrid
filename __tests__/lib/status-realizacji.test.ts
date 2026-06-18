import { statusRealizacji, PUSTA } from '@/lib/status-realizacji';

describe('statusRealizacji', () => {
  it('komplet: zrealizowane === docelowe', () => {
    expect(statusRealizacji(5, 5)).toEqual({ ton: 'ok', roznica: 0, znak: 'OK', opis: 'komplet' });
  });
  it('nadwyżka: zrealizowane > docelowe', () => {
    expect(statusRealizacji(7, 5)).toEqual({ ton: 'accent', roznica: 2, znak: '+2', opis: 'nadwyżka 2' });
  });
  it('brak 1: docelowe - zrealizowane === 1', () => {
    expect(statusRealizacji(4, 5)).toEqual({ ton: 'warn', roznica: -1, znak: '−1', opis: 'brakuje 1' });
  });
  it('brak ≥2: docelowe - zrealizowane >= 2', () => {
    expect(statusRealizacji(3, 5)).toEqual({ ton: 'danger', roznica: -2, znak: '−2', opis: 'brakuje 2' });
    expect(statusRealizacji(0, 5).znak).toBe('−5');
  });
  it('docelowe 0 → brak wymagania traktowany jako OK', () => {
    expect(statusRealizacji(0, 0)).toMatchObject({ ton: 'ok', znak: 'OK', roznica: 0 });
  });
  it('PUSTA to em-dash', () => { expect(PUSTA).toBe('—'); });
});
