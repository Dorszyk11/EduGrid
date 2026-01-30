/**
 * Oblicza procent realizacji, braki i nadwyżki godzin na podstawie planu MEiN
 * oraz przypisanych godzin z localStorage (te same klucze co w PlanMeinTabela).
 */

import plansData from '@/utils/import/ramowe-plany.json';

const STORAGE_PREFIX = 'przydzial-wyboru-';
const STORAGE_DORADZTWO = 'zrealizowane-doradztwo-';
const STORAGE_DYREKTOR = 'dyrektor-godziny-';

type HoursByGrade = Record<string, number>;

type SubjectRow = {
  subject?: string;
  hours_by_grade?: HoursByGrade;
  total_hours?: number;
  hours_to_choose?: number;
};

type DirectorRow = {
  director_discretion_hours: { total_hours: number };
};

type PlanMein = {
  plan_id?: string;
  school_type: string;
  cycle: string;
  table_structure?: { grades?: string[] };
  grades?: string[];
  subjects: (SubjectRow | DirectorRow)[];
};

const data = plansData as { plans?: PlanMein[]; reference_plans?: PlanMein[] };
const allPlans: PlanMein[] = data.plans ?? data.reference_plans ?? [];

function matchSchoolType(nazwaTypu: string, schoolType: string): boolean {
  const a = (nazwaTypu || '').trim().toLowerCase();
  const b = (schoolType || '').trim().toLowerCase();
  if (!a) return false;
  if (a === b) return true;
  if (b === 'szkoła podstawowa' && a.startsWith('szkoła podstawowa')) return true;
  return false;
}

function cycleFilterZNazwy(nazwaTypu: string): string | undefined {
  const n = (nazwaTypu || '').toLowerCase();
  if (n.includes('i–iii') || n.includes('i-iii') || n.includes('1–3') || n.includes('1-3')) return 'Klasy I–III';
  if (n.includes('iv–viii') || n.includes('iv-viii') || n.includes('4–8') || n.includes('4-8')) return 'Klasy IV–VIII';
  return undefined;
}

function getGrades(plan: PlanMein): string[] {
  return plan.table_structure?.grades ?? plan.grades ?? [];
}

function subjectKey(planId: string | undefined, subjectName: string): string {
  return `${planId ?? 'plan'}_${(subjectName || '').trim()}`;
}

function isDirectorRow(r: SubjectRow | DirectorRow): r is DirectorRow {
  return 'director_discretion_hours' in r && !('subject' in r);
}

const PRZEDMIOTY_LACZNE_CYKL = ['Zajęcia z zakresu doradztwa zawodowego'];
function isPrzedmiotLaczny(subjectName: string): boolean {
  return PRZEDMIOTY_LACZNE_CYKL.some((n) => (subjectName || '').trim() === n);
}

export interface DaneRealizacji {
  procentRealizacji: number;
  brakiGodzin: number;
  nadwyzkiGodzin: number;
}

function readPrzydzial(klasaId: string): Record<string, Record<string, number>> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + klasaId);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, Record<string, number>>;
  } catch {
    return {};
  }
}

function readDoradztwo(klasaId: string): Record<string, Record<string, number>> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_DORADZTWO + klasaId);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, Record<string, number>>;
  } catch {
    return {};
  }
}

function readDyrektor(klasaId: string): Record<string, Record<string, number>> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_DYREKTOR + klasaId);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, Record<string, number>>;
  } catch {
    return {};
  }
}

function assignedDirectorForPlan(dyrektor: Record<string, Record<string, number>>, planId: string | undefined): number {
  const prefix = (planId ?? 'plan') + '_';
  let sum = 0;
  for (const [key, byGrade] of Object.entries(dyrektor)) {
    if (!key.startsWith(prefix)) continue;
    for (const v of Object.values(byGrade)) sum += v;
  }
  return sum;
}

/**
 * Liczy realizację wymagań MEiN na podstawie planu i przypisanych godzin (localStorage).
 * Używane gdy wybrana jest klasa – dane z tabeli „godziny do wyboru” i „doradztwo zawodowe”.
 */
export function obliczRealizacjaZPrzydzialu(
  nazwaTypuSzkoly: string,
  klasaId: string
): DaneRealizacji {
  const cycleFilter = cycleFilterZNazwy(nazwaTypuSzkoly);
  const plans = allPlans.filter(
    (p) =>
      matchSchoolType(nazwaTypuSzkoly, p.school_type) &&
      (!cycleFilter || p.cycle === cycleFilter)
  );

  const przydzial = readPrzydzial(klasaId);
  const doradztwo = readDoradztwo(klasaId);
  const dyrektor = readDyrektor(klasaId);

  let totalRequired = 0;
  let totalRealized = 0;

  for (const plan of plans) {
    const grades = getGrades(plan);
    const directorRow = plan.subjects.find(isDirectorRow);
    const totalDirectorHours = directorRow?.director_discretion_hours?.total_hours ?? 0;
    if (totalDirectorHours > 0) {
      totalRequired += totalDirectorHours;
      totalRealized += assignedDirectorForPlan(dyrektor, plan.plan_id);
    }
    for (const entry of plan.subjects) {
      if (isDirectorRow(entry)) continue;
      const row = entry as SubjectRow;
      const subject = row.subject ?? '';

      if (isPrzedmiotLaczny(subject)) {
        const req = Number(row.total_hours) || 0;
        const key = subjectKey(plan.plan_id, subject);
        const byGrade = doradztwo[key] ?? {};
        const realized = Object.values(byGrade).reduce((a, b) => a + b, 0);
        totalRequired += req;
        totalRealized += realized;
        continue;
      }

      const hoursToChoose = row.hours_to_choose;
      if (hoursToChoose != null && hoursToChoose > 0) {
        const key = subjectKey(plan.plan_id, subject);
        const byGrade = przydzial[key] ?? {};
        const realized = Object.values(byGrade).reduce((a, b) => a + b, 0);
        totalRequired += hoursToChoose;
        totalRealized += realized;
        continue;
      }

      for (const g of grades) {
        const req = Number(row.hours_by_grade?.[g]) || 0;
        totalRequired += req;
        totalRealized += req;
      }
    }
  }

  const brakiGodzin = Math.max(0, totalRequired - totalRealized);
  const nadwyzkiGodzin = Math.max(0, totalRealized - totalRequired);
  const procentRealizacji =
    totalRequired > 0 ? Math.min(100, (totalRealized / totalRequired) * 100) : 100;

  return {
    procentRealizacji,
    brakiGodzin: Math.round(brakiGodzin * 10) / 10,
    nadwyzkiGodzin: Math.round(nadwyzkiGodzin * 10) / 10,
  };
}
