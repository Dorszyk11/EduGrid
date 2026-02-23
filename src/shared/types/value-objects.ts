/**
 * Shared value objects used across all feature modules.
 * These are pure TypeScript types — no framework imports.
 */

// ─── Employment ─────────────────────────────────────────────────────────────

export type EmploymentType = "pelny" | "pol" | "czwarty" | "osiemnasty";

export const EMPLOYMENT_TO_MAX_HOURS: Readonly<Record<EmploymentType, number>> =
  {
    pelny: 18,
    pol: 9,
    czwarty: 4.5,
    osiemnasty: 1,
  } as const;

// ─── Subject ─────────────────────────────────────────────────────────────────

export type SubjectType =
  | "ogolnoksztalcace"
  | "zawodowe_teoretyczne"
  | "zawodowe_praktyczne";

export type SubjectLevel = "podstawowy" | "rozszerzony" | "brak";

// ─── User / Auth ─────────────────────────────────────────────────────────────

export type UserRole = "admin" | "dyrektor" | "sekretariat";

// ─── Compliance & Risk ───────────────────────────────────────────────────────

export type ComplianceStatus = "OK" | "BRAK" | "NADWYZKA" | "BRAK_DANYCH";

export type RiskCategory = "niski" | "sredni" | "wysoki" | "krytyczny";

// ─── School Year ─────────────────────────────────────────────────────────────

export interface SchoolYear {
  readonly value: string; // "YYYY/YYYY" format
}

export function parseSchoolYear(raw: string): SchoolYear | null {
  const pattern = /^\d{4}\/\d{4}$/;
  if (!pattern.test(raw)) {
    return null;
  }
  return { value: raw };
}

export function isValidSchoolYear(raw: string): boolean {
  return /^\d{4}\/\d{4}$/.test(raw);
}

// ─── Branded ID types ────────────────────────────────────────────────────────

export interface TeacherId {
  readonly value: string;
}

export interface SchoolClassId {
  readonly value: string;
}

export interface SubjectId {
  readonly value: string;
}

export interface SchoolTypeId {
  readonly value: string;
}

export interface ScheduleEntryId {
  readonly value: string;
}

export interface QualificationId {
  readonly value: string;
}

export interface MeinRequirementId {
  readonly value: string;
}

export interface ElectiveHourAllocationId {
  readonly value: string;
}

export interface ProfessionId {
  readonly value: string;
}

export interface NameMappingId {
  readonly value: string;
}
