/**
 * MeinRequirement entity — pure domain.
 */

export interface MeinRequirement {
  readonly id: string;
  readonly subjectId: string;
  readonly schoolTypeId: string;
  readonly classNumber: number | null;
  readonly cycleHours: number;
  readonly weeklyHoursMin: number | null;
  readonly weeklyHoursMax: number | null;
  readonly isMandatory: boolean;
  readonly validFrom: string;
  readonly validTo: string | null;
  readonly notes: string | null;
}
