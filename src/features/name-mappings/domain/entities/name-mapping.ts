/**
 * NameMapping entity — pure domain.
 */

export interface NameMapping {
  readonly id: string;
  readonly meinName: string;
  readonly schoolName: string;
  readonly type: "przedmiot" | "typ_szkoly";
  readonly isActive: boolean;
}
