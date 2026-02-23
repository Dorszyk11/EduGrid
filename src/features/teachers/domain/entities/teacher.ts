/**
 * Teacher entity — pure domain.
 */

import { type EmploymentType, EMPLOYMENT_TO_MAX_HOURS } from "@/shared/types";

export interface Teacher {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly employmentType: EmploymentType;
  readonly maxWeeklyHours: number;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export function teacherFullName(teacher: Teacher): string {
  return `${teacher.firstName} ${teacher.lastName}`;
}

export function maxHoursForEmployment(employmentType: EmploymentType): number {
  return EMPLOYMENT_TO_MAX_HOURS[employmentType];
}
