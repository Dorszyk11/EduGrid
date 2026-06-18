import { agregujStatystykiZgodnosci, type WynikZgodnosciMein } from '@/utils/zgodnoscMein';

function wynik(status: WynikZgodnosciMein['status'], procent: number): WynikZgodnosciMein {
  return {
    przedmiotId: 'p',
    przedmiotNazwa: 'Przedmiot',
    typSzkolyId: 't',
    typSzkolyNazwa: 'Typ',
    wymaganeMein: { godziny_w_cyklu: 10, obowiazkowe: true },
    realizowane: { godziny_roczne: 0, godziny_w_cyklu: 0, godziny_tygodniowo_srednia: 0 },
    roznica: { godziny: 0, procent_realizacji: procent },
    status,
    alerty: [],
  };
}

describe('agregujStatystykiZgodnosci', () => {
  it('brak wyników (brak siatek MEiN) → niekompletne + komunikat, statystyki zerowe', () => {
    const a = agregujStatystykiZgodnosci([]);
    expect(a.kompletne).toBe(false);
    expect(a.komunikat).toMatch(/Brak siatek godzin MEiN/);
    expect(a.statystyki).toMatchObject({ lacznie: 0, zgodne: 0, zBrakami: 0, zNadwyzkami: 0, bezDanych: 0, sredniProcent: 0 });
  });

  it('są wymagania, ale część bez danych → niekompletne + zliczony bezDanych', () => {
    const a = agregujStatystykiZgodnosci([wynik('OK', 100), wynik('BRAK_DANYCH', 0)]);
    expect(a.kompletne).toBe(false);
    expect(a.statystyki.bezDanych).toBe(1);
    expect(a.komunikat).toMatch(/brakuje wymagań MEiN/i);
  });

  it('pełne dane (OK/BRAK/NADWYŻKA) → kompletne, bez komunikatu, liczby i średnia jak dawniej', () => {
    const a = agregujStatystykiZgodnosci([wynik('OK', 100), wynik('BRAK', 50), wynik('NADWYŻKA', 150)]);
    expect(a.kompletne).toBe(true);
    expect(a.komunikat).toBeUndefined();
    expect(a.statystyki).toMatchObject({ lacznie: 3, zgodne: 1, zBrakami: 1, zNadwyzkami: 1, bezDanych: 0 });
    expect(a.statystyki.sredniProcent).toBeCloseTo(100); // (100+50+150)/3
  });

  it('średni procent liczony po WSZYSTKICH wynikach (zachowanie 1:1 z dawną trasą)', () => {
    const a = agregujStatystykiZgodnosci([wynik('OK', 100), wynik('BRAK_DANYCH', 0)]);
    expect(a.statystyki.sredniProcent).toBeCloseTo(50); // (100+0)/2 — bez zmiany dawnej logiki
  });
});
