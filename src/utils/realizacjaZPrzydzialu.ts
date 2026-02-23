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

/** Dopasowanie nazwy typu (np. "Technikum, Klasy I–V") do school_type z planu ("Technikum"). */
function matchSchoolType(nazwaTypu: string, schoolType: string): boolean {
  const a = (nazwaTypu || '').trim().toLowerCase();
  const b = (schoolType || '').trim().toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.startsWith(b) && (a.length === b.length || a.charAt(b.length) === ',')) return true;
  return false;
}

function cycleFilterZNazwy(nazwaTypu: string): string | undefined {
  const n = (nazwaTypu || '').toLowerCase();
  if (n.includes('i–iii') || n.includes('i-iii') || n.includes('1–3') || n.includes('1-3')) return 'Klasy I–III';
  if (n.includes('iv–viii') || n.includes('iv-viii') || n.includes('4–8') || n.includes('4-8')) return 'Klasy IV–VIII';
  if (n.includes('i–v') || n.includes('i-v') || n.includes('1–5') || n.includes('1-5')) return 'Klasy I–V';
  if (n.includes('i–iv') || n.includes('i-iv') || n.includes('1–4') || n.includes('1-4')) return 'Klasy I–IV';
  if (n.includes('vii–viii') || n.includes('vii-viii') || n.includes('7–8') || n.includes('7-8')) return 'Klasy VII–VIII';
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

/** Wiersz „Przedmioty o zakresie rozszerzonym” w planie – pula godzin rozszerzeń. */
function isRozszerzonyRow(subjectName: string): boolean {
  return /w\s+zakresie\s+rozszerzonym|przedmioty\s+.*\s+rozszerz/i.test((subjectName || '').trim());
}

/** Pula godzin rozszerzeń w cyklu (np. liceum/technikum 8). */
function getGodzinyRozszerzenia(schoolType: string): number {
  const st = (schoolType || '').trim().toLowerCase();
  if (st === 'technikum') return 8;
  if (st.includes('liceum')) return 8;
  return 0;
}

function sumRozszerzeniaPrzydzial(rozszerzeniaPrzydzial: Record<string, Record<string, number>>, planId: string | undefined): number {
  const prefix = (planId ?? 'plan') + '_';
  let sum = 0;
  for (const [key, byGrade] of Object.entries(rozszerzeniaPrzydzial)) {
    if (!key.startsWith(prefix)) continue;
    for (const v of Object.values(byGrade)) sum += v;
  }
  return sum;
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

/** Opcjonalne dane z API (przydział dla klasy) – gdy podane, używane zamiast localStorage („dla szkoły”). */
export interface DanePrzydzialuZApi {
  przydzial?: Record<string, Record<string, number>>;
  doradztwo?: Record<string, Record<string, number>>;
  dyrektor?: Record<string, Record<string, number>>;
  rozszerzeniaPrzydzial?: Record<string, Record<string, number>>;
}

/**
 * Liczy realizację wymagań MEiN na podstawie planu i przypisanych godzin.
 * Gdy podane daneZApi – liczy dla szkoły (z API: godziny do wyboru, doradztwo, dyrektor, rozszerzenia).
 * Bez daneZApi – czyta z localStorage (przydzial, doradztwo, dyrektor; rozszerzenia nie wliczane).
 */
export function obliczRealizacjaZPrzydzialu(
  nazwaTypuSzkoly: string,
  klasaId: string,
  daneZApi?: DanePrzydzialuZApi
): DaneRealizacji {
  const cycleFilter = cycleFilterZNazwy(nazwaTypuSzkoly);
  const plans = allPlans.filter(
    (p) =>
      matchSchoolType(nazwaTypuSzkoly, p.school_type) &&
      (!cycleFilter || p.cycle === cycleFilter)
  );

  const przydzial = daneZApi?.przydzial ?? readPrzydzial(klasaId);
  const doradztwo = daneZApi?.doradztwo ?? readDoradztwo(klasaId);
  const dyrektor = daneZApi?.dyrektor ?? readDyrektor(klasaId);
  const rozszerzeniaPrzydzial = daneZApi?.rozszerzeniaPrzydzial ?? {};

  /** Suma braków i nadwyżek po pozycjach – żeby np. braki z rozszerzeń i nadwyżki ze zwykłych pokazać obie. */
  let sumBraki = 0;
  let sumNadwyzki = 0;
  /** Do procentu realizacji: tylko godziny do rozdysponowania (do wyboru, dyrektorskie, doradztwo, rozszerzenia). */
  let requiredDoRozdysponowania = 0;
  let realizedDoRozdysponowania = 0;

  for (const plan of plans) {
    const grades = getGrades(plan);
    const directorRow = plan.subjects.find(isDirectorRow);
    const totalDirectorHours = directorRow?.director_discretion_hours?.total_hours ?? 0;
    if (totalDirectorHours > 0) {
      const real = assignedDirectorForPlan(dyrektor, plan.plan_id);
      requiredDoRozdysponowania += totalDirectorHours;
      realizedDoRozdysponowania += real;
      sumBraki += Math.max(0, totalDirectorHours - real);
      sumNadwyzki += Math.max(0, real - totalDirectorHours);
    }
    for (const entry of plan.subjects) {
      if (isDirectorRow(entry)) continue;
      const row = entry as SubjectRow;
      const subject = row.subject ?? '';

      if (isRozszerzonyRow(subject)) {
        const pool = row.total_hours != null ? Number(row.total_hours) : getGodzinyRozszerzenia(plan.school_type ?? '');
        if (pool > 0) {
          const real = sumRozszerzeniaPrzydzial(rozszerzeniaPrzydzial, plan.plan_id);
          requiredDoRozdysponowania += pool;
          realizedDoRozdysponowania += real;
          sumBraki += Math.max(0, pool - real);
          sumNadwyzki += Math.max(0, real - pool);
        }
        continue;
      }

      if (isPrzedmiotLaczny(subject)) {
        const req = Number(row.total_hours) || 0;
        const key = subjectKey(plan.plan_id, subject);
        const byGrade = doradztwo[key] ?? {};
        const realized = Object.values(byGrade).reduce((a, b) => a + b, 0);
        requiredDoRozdysponowania += req;
        realizedDoRozdysponowania += realized;
        sumBraki += Math.max(0, req - realized);
        sumNadwyzki += Math.max(0, realized - req);
        continue;
      }

      const hoursToChoose = row.hours_to_choose;
      if (hoursToChoose != null && hoursToChoose > 0) {
        const key = subjectKey(plan.plan_id, subject);
        const byGrade = przydzial[key] ?? {};
        const realized = Object.values(byGrade).reduce((a, b) => a + b, 0);
        requiredDoRozdysponowania += hoursToChoose;
        realizedDoRozdysponowania += realized;
        sumBraki += Math.max(0, hoursToChoose - realized);
        sumNadwyzki += Math.max(0, realized - hoursToChoose);
        continue;
      }

      for (const g of grades) {
        const req = Number(row.hours_by_grade?.[g]) || 0;
        sumBraki += Math.max(0, req - req);
        sumNadwyzki += Math.max(0, req - req);
      }
    }
  }

  const brakiGodzin = sumBraki;
  const nadwyzkiGodzin = sumNadwyzki;
  /** Procent realizacji = tylko od godzin do rozdysponowania (np. 15/20 = 75%, nie 95/100). */
  const procentRealizacji =
    requiredDoRozdysponowania > 0
      ? Math.min(100, (realizedDoRozdysponowania / requiredDoRozdysponowania) * 100)
      : 100;

  return {
    procentRealizacji,
    brakiGodzin: Math.round(brakiGodzin * 10) / 10,
    nadwyzkiGodzin: Math.round(nadwyzkiGodzin * 10) / 10,
  };
}
