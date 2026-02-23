/**
 * Elective Hour Allocation — hours to choose, director hours, extensions.
 * Pure domain entity.
 */

export type HoursByGrade = Record<string, number>;
export type SubjectHourMap = Record<string, HoursByGrade>;

export interface ElectiveHourAllocation {
  readonly id: string;
  readonly classId: string;
  readonly electiveHours: SubjectHourMap;
  readonly counselingHours: SubjectHourMap;
  readonly directorHours: SubjectHourMap;
  readonly extensions: string[];
  readonly extensionHoursPool: HoursByGrade;
  readonly extensionHoursPerSubject: SubjectHourMap;
  readonly realization: SubjectHourMap;
  readonly groupDivision: Record<string, Record<string, boolean>>;
  readonly groupHours: Record<
    string,
    Record<string, { g1: number; g2: number }>
  >;
}
