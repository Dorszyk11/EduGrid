/**
 * Profession entity — pure domain.
 */

export interface Profession {
  readonly id: string;
  readonly name: string;
  readonly code: string | null;
  readonly isActive: boolean;
}
