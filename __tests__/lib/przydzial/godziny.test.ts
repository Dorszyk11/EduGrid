import {
  sumaGodzin,
  uzupelnijNierozdysponowane,
  rozdzielRozszerzenia,
  sumaGodzinDyrektorskichDlaPlanu,
  czyPrzekraczaPuleDyrektora,
} from '@/lib/przydzial/godziny';
import type { HoursByGrade, PrzydzialGrupyByGrade } from '@/lib/przydzial/typy';

describe('sumaGodzin', () => {
  it('sumuje godziny po rocznikach', () => {
    expect(sumaGodzin({ '1': 2, '2': 3 })).toBe(5);
  });
  it('traktuje undefined/puste jako 0', () => {
    expect(sumaGodzin(undefined)).toBe(0);
    expect(sumaGodzin({})).toBe(0);
  });
});

describe('uzupelnijNierozdysponowane', () => {
  it('zostawia już przydzielone i dokłada brakujące do najmniej obciążonych', () => {
    // wymagane 4, przydzielone {1:2}; brakuje 2 → trafiają do 2 i 3 (najmniej obciążone)
    const wynik = uzupelnijNierozdysponowane({ '1': 2 }, 4, ['1', '2', '3']);
    expect(sumaGodzin(wynik)).toBe(4);
    expect(wynik['1']).toBe(2);
    expect(wynik['2']).toBe(1);
    expect(wynik['3']).toBe(1);
  });

  it('nie zmienia mapy, gdy już rozdysponowano całość', () => {
    const wynik = uzupelnijNierozdysponowane({ '1': 2, '2': 2 }, 4, ['1', '2']);
    expect(wynik).toEqual({ '1': 2, '2': 2 });
  });

  it('nie odejmuje, gdy przydzielono więcej niż wymagane', () => {
    const wynik = uzupelnijNierozdysponowane({ '1': 5 }, 3, ['1', '2']);
    expect(wynik['1']).toBe(5);
    expect(sumaGodzin(wynik)).toBe(5);
  });

  it('zwraca kopię przy braku roczników lub zerowym wymaganiu (bez mutacji wejścia)', () => {
    const wejscie = { '1': 1 };
    expect(uzupelnijNierozdysponowane(wejscie, 0, ['1'])).toEqual({ '1': 1 });
    expect(uzupelnijNierozdysponowane(wejscie, 5, [])).toEqual({ '1': 1 });
  });

  it('nie mutuje wejścia', () => {
    const wejscie: HoursByGrade = { '1': 1 };
    uzupelnijNierozdysponowane(wejscie, 4, ['1', '2']);
    expect(wejscie).toEqual({ '1': 1 });
  });

  it('rozkłada równo na pustym starcie', () => {
    const wynik = uzupelnijNierozdysponowane({}, 4, ['1', '2', '3', '4']);
    expect(wynik).toEqual({ '1': 1, '2': 1, '3': 1, '4': 1 });
  });
});

describe('rozdzielRozszerzenia', () => {
  it('rozdziela pulę round-robin między przedmioty rozszerzone', () => {
    // limit 3 godziny w roczniku "1", 2 przedmioty → A:2, B:1
    const wynik = rozdzielRozszerzenia({}, ['A', 'B'], { '1': 3 }, ['1']);
    expect(wynik['A']['1']).toBe(2);
    expect(wynik['B']['1']).toBe(1);
  });

  it('rozszerzenia bez limitu na rocznik — nic nie dokłada (pomija rocznik)', () => {
    // limity puste / brak dla rocznika "2" → tylko "1" rozdzielone
    const wynik = rozdzielRozszerzenia({}, ['A', 'B'], { '1': 2 }, ['1', '2']);
    expect(wynik['A']['1']).toBe(1);
    expect(wynik['B']['1']).toBe(1);
    expect(wynik['A']['2']).toBeUndefined();
    expect(wynik['B']?.['2']).toBeUndefined();
  });

  it('zwraca kopię bez zmian, gdy brak przedmiotów rozszerzonych', () => {
    const current = { A: { '1': 1 } };
    const wynik = rozdzielRozszerzenia(current, [], { '1': 5 }, ['1']);
    expect(wynik).toEqual({ A: { '1': 1 } });
  });

  it('nie mutuje wejścia (current ani jego pod-obiektów)', () => {
    const current = { A: { '1': 1 } };
    rozdzielRozszerzenia(current, ['A'], { '1': 2 }, ['1']);
    expect(current).toEqual({ A: { '1': 1 } });
  });

  it('dolicza do istniejącego przydziału', () => {
    const current = { A: { '1': 1 } };
    const wynik = rozdzielRozszerzenia(current, ['A'], { '1': 2 }, ['1']);
    expect(wynik['A']['1']).toBe(3);
  });
});

describe('sumaGodzinDyrektorskichDlaPlanu', () => {
  const planId = 'lo';
  it('sumuje zwykłe godziny dyrektorskie tylko dla danego planu', () => {
    const dyrektor: Record<string, HoursByGrade> = {
      'lo_Matematyka': { '1': 2 },
      'lo_Fizyka': { '2': 1 },
      'tech_Chemia': { '1': 5 }, // inny plan – pomijany
    };
    expect(sumaGodzinDyrektorskichDlaPlanu(dyrektor, {}, planId)).toBe(3);
  });

  it('dla grup liczy większą z grup 1/2 (uczą się równolegle)', () => {
    const grupy: Record<string, PrzydzialGrupyByGrade> = {
      'lo_Informatyka': { '1': { 1: 2, 2: 3 } }, // max(2,3)=3
    };
    expect(sumaGodzinDyrektorskichDlaPlanu({}, grupy, planId)).toBe(3);
  });

  it('łączy zwykłe i grupowe godziny', () => {
    const dyrektor: Record<string, HoursByGrade> = { 'lo_Matematyka': { '1': 2 } };
    const grupy: Record<string, PrzydzialGrupyByGrade> = { 'lo_WF': { '1': { 1: 1, 2: 1 } } };
    expect(sumaGodzinDyrektorskichDlaPlanu(dyrektor, grupy, planId)).toBe(3);
  });
});

describe('czyPrzekraczaPuleDyrektora', () => {
  it('wykrywa przekroczenie puli', () => {
    expect(czyPrzekraczaPuleDyrektora(3, 3, 1)).toBe(true);
  });
  it('mieści się w puli', () => {
    expect(czyPrzekraczaPuleDyrektora(2, 3, 1)).toBe(false);
  });
  it('domyślnie dodaje 1 godzinę', () => {
    expect(czyPrzekraczaPuleDyrektora(3, 3)).toBe(true);
    expect(czyPrzekraczaPuleDyrektora(2, 3)).toBe(false);
  });
});
