/**
 * Teacher Availability — data passed to the pure assignment algorithm.
 * This replaces the old DostepnoscNauczyciela interface that had Payload dependencies.
 */

export interface TeacherAvailability {
  readonly teacherId: string;
  readonly teacherName: string;
  readonly maxWorkload: number;
  readonly currentWorkload: number;
  readonly availableWorkload: number;
  readonly hasQualifications: boolean;
  readonly qualifications?: {
    degree?: string;
    specialization?: string;
  };
  readonly utilizationPercent: number;
}
