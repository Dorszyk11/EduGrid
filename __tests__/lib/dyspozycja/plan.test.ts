import {
  subjectKey,
  isPrzedmiotLaczny,
  isPrzedmiotRozszerzony,
  pominWyswietlanie,
  matchSchoolType,
  cycleFilterZNazwy,
  sumGrupy,
  aktualnyRokWCykle,
  getGradesFromPlan,
  isSubjectRow,
  obliczPrzedmiotyDlaRoku,
  type PlanItem,
  type PrzydzialData,
} from '@/lib/dyspozycja/plan';

const PUSTY_PRZYDZIAL: PrzydzialData = {
  przydzial: {},
  dyrektor: {},
  doradztwo: {},
  rozszerzenia: [],
  rozszerzeniaPrzydzial: {},
};

const PLAN: PlanItem = {
  plan_id: 'planA',
  school_type: 'Technikum',
  cycle: 'Klasy I–V',
  table_structure: { grades: ['I'] },
  subjects: [
    { subject: 'Matematyka', hours_by_grade: { I: 4 } },
    { subject: 'Biologia w zakresie rozszerzonym', hours_by_grade: { I: 2 } },
  ],
};

describe('subjectKey', () => {
  it('łączy plan_id i nazwę', () => {
    expect(subjectKey('p1', ' Matematyka ')).toBe('p1_Matematyka');
  });
  it('domyślny prefiks gdy brak plan_id', () => {
    expect(subjectKey(undefined, 'Fizyka')).toBe('plan_Fizyka');
  });
});

describe('predykaty przedmiotów', () => {
  it('isPrzedmiotLaczny tylko dla doradztwa', () => {
    expect(isPrzedmiotLaczny('Zajęcia z zakresu doradztwa zawodowego')).toBe(true);
    expect(isPrzedmiotLaczny('Matematyka')).toBe(false);
  });
  it('isPrzedmiotRozszerzony wykrywa rozszerzenia', () => {
    expect(isPrzedmiotRozszerzony('Matematyka w zakresie rozszerzonym')).toBe(true);
    expect(isPrzedmiotRozszerzony('Matematyka')).toBe(false);
  });
  it('pominWyswietlanie ukrywa doradztwo i rozszerzenia', () => {
    expect(pominWyswietlanie('Zajęcia z zakresu doradztwa zawodowego')).toBe(true);
    expect(pominWyswietlanie('Biologia w zakresie rozszerzonym')).toBe(true);
    expect(pominWyswietlanie('Biologia')).toBe(false);
  });
});

describe('matchSchoolType', () => {
  it('dopasowuje dokładnie', () => {
    expect(matchSchoolType('Technikum', 'Technikum')).toBe(true);
  });
  it('dopasowuje prefiks zakończony przecinkiem', () => {
    expect(matchSchoolType('Technikum, Klasy I–V', 'Technikum')).toBe(true);
  });
  it('nie dopasowuje częściowego słowa bez przecinka', () => {
    expect(matchSchoolType('Technikum Specjalne', 'Technikum')).toBe(false);
  });
  it('puste → false', () => {
    expect(matchSchoolType('', 'Technikum')).toBe(false);
  });
});

describe('cycleFilterZNazwy', () => {
  it('rozpoznaje zakresy klas', () => {
    expect(cycleFilterZNazwy('Szkoła podstawowa, Klasy I–III')).toBe('Klasy I–III');
    expect(cycleFilterZNazwy('Klasy IV–VIII')).toBe('Klasy IV–VIII');
    expect(cycleFilterZNazwy('Technikum I–V')).toBe('Klasy I–V');
  });
  it('brak dopasowania → undefined', () => {
    expect(cycleFilterZNazwy('Liceum')).toBeUndefined();
  });
});

describe('sumGrupy', () => {
  it('sumuje obie grupy', () => {
    expect(sumGrupy({ 1: 2, 2: 3 })).toBe(5);
  });
  it('brakujące traktuje jak 0', () => {
    expect(sumGrupy({ 1: 2 })).toBe(2);
    expect(sumGrupy(undefined)).toBe(0);
  });
});

describe('getGradesFromPlan', () => {
  it('preferuje table_structure.grades', () => {
    expect(
      getGradesFromPlan({ school_type: 'X', cycle: 'Y', subjects: [], table_structure: { grades: ['I', 'II'] }, grades: ['Z'] }),
    ).toEqual(['I', 'II']);
  });
  it('fallback na grades', () => {
    expect(getGradesFromPlan({ school_type: 'X', cycle: 'Y', subjects: [], grades: ['I'] })).toEqual(['I']);
  });
});

describe('isSubjectRow', () => {
  it('rozpoznaje wiersz z nazwą przedmiotu', () => {
    expect(isSubjectRow({ subject: 'Matematyka' })).toBe(true);
    expect(isSubjectRow({ director_discretion_hours: {} })).toBe(false);
  });
});

describe('aktualnyRokWCykle', () => {
  const grades = ['I', 'II', 'III', 'IV'];
  it('rok początku, wrzesień → klasa I', () => {
    expect(aktualnyRokWCykle('2024/2028', grades, new Date('2024-09-15'))).toBe('I');
  });
  it('drugi rok, październik → klasa II', () => {
    expect(aktualnyRokWCykle('2024/2028', grades, new Date('2025-10-01'))).toBe('II');
  });
  it('przed wrześniem pierwszego roku → klasa I (clamp dolny)', () => {
    expect(aktualnyRokWCykle('2024/2028', grades, new Date('2024-03-01'))).toBe('I');
  });
  it('daleko w przyszłości → ostatnia klasa (clamp górny)', () => {
    expect(aktualnyRokWCykle('2024/2028', grades, new Date('2040-09-01'))).toBe('IV');
  });
  it('niepoprawny format roku → pierwsza klasa', () => {
    expect(aktualnyRokWCykle('brak', grades, new Date('2025-01-01'))).toBe('I');
  });
  it('pusta lista klas → pusty string', () => {
    expect(aktualnyRokWCykle('2024/2028', [], new Date('2025-01-01'))).toBe('');
  });
});

describe('obliczPrzedmiotyDlaRoku', () => {
  it('liczy base + przydział + dyrektor i odejmuje przypisane; ukrywa rozszerzony', () => {
    const pd: PrzydzialData = {
      ...PUSTY_PRZYDZIAL,
      przydzial: { planA_Matematyka: { I: 2 } },
      dyrektor: { planA_Matematyka: { I: 1 } },
    };
    const rows = obliczPrzedmiotyDlaRoku(PLAN, 'I', pd, [{ id: 'm', nazwa: 'Matematyka' }], { m: { I: 3 } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ nazwa: 'Matematyka', godziny: 7, doPrzydzielenia: 4 });
  });

  it('podział na grupy podwaja bazę i sumuje obie grupy', () => {
    const pd: PrzydzialData = {
      ...PUSTY_PRZYDZIAL,
      podzialNaGrupy: { planA_Matematyka: { I: true } },
      przydzialGrupy: { planA_Matematyka: { I: { 1: 1, 2: 1 } } },
    };
    const rows = obliczPrzedmiotyDlaRoku(PLAN, 'I', pd, [], null);
    expect(rows[0].godziny).toBe(10); // base 4 ×2 + grupy 2
    expect(rows[0].doPrzydzielenia).toBe(10);
  });

  it('brak przydziału → tylko baza z planu', () => {
    const rows = obliczPrzedmiotyDlaRoku(PLAN, 'I', null, [], null);
    expect(rows[0].godziny).toBe(4);
  });
});
