/**
 * Qualification entity — pure domain.
 */

export interface Qualification {
  readonly id: string;
  readonly teacherId: string;
  readonly subjectId: string;
  readonly degree: string | null;
  readonly specialization: string | null;
  readonly obtainedAt: string | null;
  readonly documentRef: string | null;
  readonly isActive: boolean;
}
