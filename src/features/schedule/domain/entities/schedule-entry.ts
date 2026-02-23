/**
 * ScheduleEntry entity — pure domain.
 */

import { type SubjectType, type SubjectLevel } from "@/shared/types";

export interface ScheduleEntry {
  readonly id: string;
  readonly subjectId: string;
  readonly classId: string;
  readonly teacherId: string;
  readonly schoolYear: string;
  readonly yearInCycle: string | null;
  readonly annualHours: number;
  readonly weeklyHours: number;
  readonly semester1Hours: number;
  readonly semester2Hours: number;
  readonly subjectType: SubjectType | null;
  readonly level: SubjectLevel | null;
  readonly notes: string | null;
  readonly surplusJustification: string | null;
  readonly internalNotes: string | null;
  readonly isLocked: boolean;
  readonly lockReason: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Validate that annual hours = semester1 + semester2.
 * PARITY: semester validation from old system.
 */
export function validateSemesterHours(entry: ScheduleEntry): string | null {
  const expected = entry.semester1Hours + entry.semester2Hours;
  if (entry.annualHours !== expected) {
    return `Godziny roczne (${entry.annualHours}) muszą być równe sumie semestrów (${expected})`;
  }
  return null;
}
