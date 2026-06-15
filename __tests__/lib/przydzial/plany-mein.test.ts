import {
  isDirectorRow,
  getGrades,
  matchSchoolType,
  isPrzedmiotLaczny,
  isPrzedmiotRozszerzony,
  subjectKey,
  getLimityRozszerzenNaRok,
} from '@/lib/przydzial/plany-mein';
import type { PlanMein } from '@/lib/przydzial/typy';

describe('isDirectorRow', () => {
  it('rozpoznaje wiersz puli dyrektorskiej', () => {
    expect(isDirectorRow({ director_discretion_hours: { total_hours: 6 } })).toBe(true);
  });
  it('zwykły przedmiot to nie wiersz dyrektorski', () => {
    expect(isDirectorRow({ subject: 'Matematyka' })).toBe(false);
  });
});

describe('matchSchoolType', () => {
  it('dopasowuje identyczne nazwy (case-insensitive)', () => {
    expect(matchSchoolType('Technikum', 'technikum')).toBe(true);
  });
  it('dopasowuje prefiks zakończony przecinkiem', () => {
    expect(matchSchoolType('Technikum, 5-letnie', 'Technikum')).toBe(true);
  });
  it('nie dopasowuje innego typu', () => {
    expect(matchSchoolType('Liceum', 'Technikum')).toBe(false);
  });
  it('puste wartości nie pasują', () => {
    expect(matchSchoolType('', 'Technikum')).toBe(false);
  });
});

describe('predykaty przedmiotów', () => {
  it('isPrzedmiotLaczny: doradztwo zawodowe', () => {
    expect(isPrzedmiotLaczny('Zajęcia z zakresu doradztwa zawodowego')).toBe(true);
    expect(isPrzedmiotLaczny('Matematyka')).toBe(false);
  });
  it('isPrzedmiotRozszerzony: wykrywa zakres rozszerzony', () => {
    expect(isPrzedmiotRozszerzony('Przedmioty w zakresie rozszerzonym')).toBe(true);
    expect(isPrzedmiotRozszerzony('Język polski')).toBe(false);
  });
});

describe('subjectKey', () => {
  it('buduje stabilny klucz z plan_id i nazwy', () => {
    expect(subjectKey('lo', 'Matematyka')).toBe('lo_Matematyka');
  });
  it('używa fallbacku plan, gdy brak plan_id', () => {
    expect(subjectKey(undefined, 'Fizyka')).toBe('plan_Fizyka');
  });
});

describe('getGrades / getLimityRozszerzenNaRok', () => {
  const plan: PlanMein = {
    plan_id: 'lo',
    school_type: 'Liceum',
    cycle: 'I',
    table_structure: { grades: ['1', '2', '3', '4'] },
    subjects: [
      { subject: 'Matematyka', hours_by_grade: { '1': 4 } },
      { subject: 'Przedmioty w zakresie rozszerzonym', hours_by_grade: { '1': 0, '2': 2, '3': 4, '4': 6 } },
      { director_discretion_hours: { total_hours: 6 } },
    ],
  };

  it('getGrades czyta z table_structure', () => {
    expect(getGrades(plan)).toEqual(['1', '2', '3', '4']);
  });

  it('zwraca limity rozszerzeń z wiersza rozszerzonego', () => {
    expect(getLimityRozszerzenNaRok([plan])).toEqual({ '1': 0, '2': 2, '3': 4, '4': 6 });
  });

  it('zwraca pustą mapę, gdy brak wiersza rozszerzonego', () => {
    const bezRozsz: PlanMein = { ...plan, subjects: [{ subject: 'Matematyka', hours_by_grade: { '1': 4 } }] };
    expect(getLimityRozszerzenNaRok([bezRozsz])).toEqual({});
  });
});
