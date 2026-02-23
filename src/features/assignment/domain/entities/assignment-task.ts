/**
 * Assignment Task — input to the distribution algorithm.
 * Pure domain entity, no framework dependencies.
 */

export interface AssignmentTask {
  readonly id: string;
  readonly subjectId: string;
  readonly subjectName: string;
  readonly classId: string;
  readonly className: string;
  readonly classNumber: number | undefined;
  readonly weeklyHours: number;
  readonly annualHours: number;
  readonly priority: number;
  readonly requiresQualifications: boolean;
  readonly preferredTeachers: string[];
  readonly excludedTeachers: string[];
}
