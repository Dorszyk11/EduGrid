/**
 * Subject entity — pure domain.
 */

import { type SubjectType, type SubjectLevel } from "@/shared/types";

export interface Subject {
  readonly id: string;
  readonly name: string;
  readonly meinCode: string | null;
  readonly type: SubjectType;
  readonly level: SubjectLevel;
  readonly organizationalUnit: string | null;
  readonly isActive: boolean;
}
