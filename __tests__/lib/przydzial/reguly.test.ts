import {
  getGodzinyRozszerzenia,
  canPrzydzielacWKomorce,
  kolorOdProcentuGodzinDodatkowych,
} from '@/lib/przydzial/reguly';

describe('getGodzinyRozszerzenia', () => {
  it('technikum i liceum → 8', () => {
    expect(getGodzinyRozszerzenia('Technikum')).toBe(8);
    expect(getGodzinyRozszerzenia('Liceum ogólnokształcące')).toBe(8);
  });
  it('inne typy → 0', () => {
    expect(getGodzinyRozszerzenia('Szkoła podstawowa')).toBe(0);
    expect(getGodzinyRozszerzenia('')).toBe(0);
  });
});

describe('canPrzydzielacWKomorce', () => {
  it('poza technikum zawsze można', () => {
    expect(canPrzydzielacWKomorce('Liceum', 'V', 'Geografia')).toBe(true);
  });
  it('technikum, klasa inna niż V → można', () => {
    expect(canPrzydzielacWKomorce('Technikum', 'IV', 'Geografia')).toBe(true);
  });
  it('technikum V, przedmiot blokowany → nie można (zwykłe godziny)', () => {
    expect(canPrzydzielacWKomorce('Technikum', 'V', 'Geografia')).toBe(false);
    expect(canPrzydzielacWKomorce('Technikum', 'V', 'Biologia')).toBe(false);
  });
  it('technikum V, przedmiot blokowany, ale dyrektorskie/rozszerzone → można', () => {
    expect(canPrzydzielacWKomorce('Technikum', 'V', 'Geografia', true)).toBe(true);
  });
  it('technikum V, przedmiot niezablokowany → można', () => {
    expect(canPrzydzielacWKomorce('Technikum', 'V', 'Matematyka')).toBe(true);
  });
});

describe('kolorOdProcentuGodzinDodatkowych', () => {
  it('progi procentowe', () => {
    expect(kolorOdProcentuGodzinDodatkowych(25)).toContain('emerald');
    expect(kolorOdProcentuGodzinDodatkowych(35)).toContain('amber');
    expect(kolorOdProcentuGodzinDodatkowych(45)).toContain('red-100');
    expect(kolorOdProcentuGodzinDodatkowych(55)).toContain('red-200');
    expect(kolorOdProcentuGodzinDodatkowych(56)).toContain('red-400');
  });
});
