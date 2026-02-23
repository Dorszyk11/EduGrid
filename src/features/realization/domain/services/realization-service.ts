/**
 * Realization Service — PURE domain function.
 *
 * Ported from: src/utils/realizacjaZPrzydzialu.ts → obliczRealizacjaZPrzydzialu()
 *
 * Calculates realization % of MEiN requirements based on allocated hours.
 * ZERO framework/DB/localStorage imports. Takes pre-loaded data.
 *
 * PARITY: Math.round(x * 10) / 10 rounding, same percentage formula.
 */

type HoursByGrade = Record<string, number>;
type SubjectHourMap = Record<string, HoursByGrade>;

export interface PlanSubjectRow {
  readonly subject: string;
  readonly hoursByGrade?: HoursByGrade;
  readonly totalHours?: number;
  readonly hoursToChoose?: number;
}

export interface PlanDirectorRow {
  readonly directorDiscretionHours: { totalHours: number };
}

export interface ReferencePlan {
  readonly planId: string | undefined;
  readonly schoolType: string;
  readonly cycle: string;
  readonly grades: string[];
  readonly subjects: ReadonlyArray<PlanSubjectRow | PlanDirectorRow>;
}

export interface RealizationData {
  readonly realizationPercent: number;
  readonly shortageHours: number;
  readonly surplusHours: number;
}

export interface RealizationInput {
  readonly plans: readonly ReferencePlan[];
  readonly electiveHours: SubjectHourMap;
  readonly counselingHours: SubjectHourMap;
  readonly directorHours: SubjectHourMap;
  readonly extensionHours: SubjectHourMap;
}

// ─── Internal helpers ───────────────────────────────────────────────────────

function isDirectorRow(
  r: PlanSubjectRow | PlanDirectorRow,
): r is PlanDirectorRow {
  return "directorDiscretionHours" in r;
}

const CYCLE_SUBJECTS = ["Zajęcia z zakresu doradztwa zawodowego"];
function isCycleSubject(name: string): boolean {
  return CYCLE_SUBJECTS.some((n) => (name || "").trim() === n);
}

function isExtensionRow(name: string): boolean {
  return /w\s+zakresie\s+rozszerzonym|przedmioty\s+.*\s+rozszerz/i.test(
    (name || "").trim(),
  );
}

function getExtensionPoolHours(schoolType: string): number {
  const st = (schoolType || "").trim().toLowerCase();
  if (st === "technikum" || st.includes("liceum")) {
    return 8;
  }
  return 0;
}

function subjectKey(planId: string | undefined, subjectName: string): string {
  return `${planId ?? "plan"}_${(subjectName || "").trim()}`;
}

function sumByPrefix(map: SubjectHourMap, planId: string | undefined): number {
  const prefix = (planId ?? "plan") + "_";
  let sum = 0;
  for (const [key, byGrade] of Object.entries(map)) {
    if (!key.startsWith(prefix)) {
      continue;
    }
    for (const v of Object.values(byGrade)) {
      sum += v;
    }
  }
  return sum;
}

/**
 * Calculate realization of MEiN requirements from allocated hours.
 *
 * PARITY: identical logic to old obliczRealizacjaZPrzydzialu().
 */
export function calculateRealization(input: RealizationInput): RealizationData {
  let sumShortages = 0;
  let sumSurpluses = 0;
  let requiredToDistribute = 0;
  let realizedToDistribute = 0;

  for (const plan of input.plans) {
    const grades = plan.grades;

    // Director hours
    const directorRow = plan.subjects.find(isDirectorRow);
    if (directorRow) {
      const totalDirector = directorRow.directorDiscretionHours.totalHours ?? 0;
      if (totalDirector > 0) {
        const realized = sumByPrefix(input.directorHours, plan.planId);
        requiredToDistribute += totalDirector;
        realizedToDistribute += realized;
        sumShortages += Math.max(0, totalDirector - realized);
        sumSurpluses += Math.max(0, realized - totalDirector);
      }
    }

    for (const entry of plan.subjects) {
      if (isDirectorRow(entry)) {
        continue;
      }
      const row = entry as PlanSubjectRow;
      const subject = row.subject ?? "";

      // Extension row
      if (isExtensionRow(subject)) {
        const pool =
          row.totalHours != null
            ? Number(row.totalHours)
            : getExtensionPoolHours(plan.schoolType ?? "");
        if (pool > 0) {
          const realized = sumByPrefix(input.extensionHours, plan.planId);
          requiredToDistribute += pool;
          realizedToDistribute += realized;
          sumShortages += Math.max(0, pool - realized);
          sumSurpluses += Math.max(0, realized - pool);
        }
        continue;
      }

      // Cycle-total subjects (e.g., career counseling)
      if (isCycleSubject(subject)) {
        const req = Number(row.totalHours) || 0;
        const key = subjectKey(plan.planId, subject);
        const byGrade = input.counselingHours[key] ?? {};
        const realized = Object.values(byGrade).reduce((a, b) => a + b, 0);
        requiredToDistribute += req;
        realizedToDistribute += realized;
        sumShortages += Math.max(0, req - realized);
        sumSurpluses += Math.max(0, realized - req);
        continue;
      }

      // Elective hours (hours_to_choose)
      const hoursToChoose = row.hoursToChoose;
      if (hoursToChoose != null && hoursToChoose > 0) {
        const key = subjectKey(plan.planId, subject);
        const byGrade = input.electiveHours[key] ?? {};
        const realized = Object.values(byGrade).reduce((a, b) => a + b, 0);
        requiredToDistribute += hoursToChoose;
        realizedToDistribute += realized;
        sumShortages += Math.max(0, hoursToChoose - realized);
        sumSurpluses += Math.max(0, realized - hoursToChoose);
        continue;
      }

      // Fixed hours per grade — these are always fully realized by definition
      // (no shortage calculation for fixed-hour subjects)
      for (const _g of grades) {
        // PARITY: old code had Math.max(0, req - req) which is always 0
        // So fixed-hour subjects contribute 0 to shortages/surpluses.
      }
    }
  }

  // PARITY: Math.round(x * 10) / 10 rounding
  const shortageHours = Math.round(sumShortages * 10) / 10;
  const surplusHours = Math.round(sumSurpluses * 10) / 10;

  const realizationPercent =
    requiredToDistribute > 0
      ? Math.min(100, (realizedToDistribute / requiredToDistribute) * 100)
      : 100;

  return {
    realizationPercent,
    shortageHours,
    surplusHours,
  };
}
