import { obliczPlanRzeczywisty, type PlanItem, type PrzydzialData } from '@/lib/ramowePlany';

const PUSTY: PrzydzialData = {
  przydzial: {},
  dyrektor: {},
  doradztwo: {},
  rozszerzenia: [],
  rozszerzeniaPrzydzial: {},
};

const PLAN: PlanItem = {
  plan_id: 'p',
  school_type: 'Technikum',
  cycle: 'Klasy I–V',
  table_structure: { grades: ['I', 'II'] },
  subjects: [
    { subject: 'Matematyka', hours_by_grade: { I: 4, II: 3 } },
    { subject: 'Biologia w zakresie rozszerzonym', hours_by_grade: { I: 2 } },
  ],
};

describe('obliczPlanRzeczywisty', () => {
  it('sumuje bazę + przydział + dyrektor per rok i ukrywa rozszerzony', () => {
    const dane: PrzydzialData = {
      ...PUSTY,
      przydzial: { p_Matematyka: { I: 1 } },
      dyrektor: { p_Matematyka: { II: 2 } },
    };
    const rows = obliczPlanRzeczywisty(PLAN, ['I', 'II'], dane);
    expect(rows).toHaveLength(1);
    expect(rows[0].nazwa).toBe('Matematyka');
    expect(rows[0].godzinyByGrade).toEqual({ I: 5, II: 5 });
  });

  it('bez przydziału → same godziny bazowe', () => {
    const rows = obliczPlanRzeczywisty(PLAN, ['I', 'II'], PUSTY);
    expect(rows[0].godzinyByGrade).toEqual({ I: 4, II: 3 });
  });
});
