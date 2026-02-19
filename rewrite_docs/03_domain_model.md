# 03 — Domain Model

## 1. Strategic Design Overview

The domain is organized around the central concept of **hour assignment** — distributing teaching hours across teachers, subjects, and classes while respecting MEiN requirements, teacher qualifications, and workload limits.

```
┌───────────────────────────────────────────────────────────────────┐
│                    SCHOOL PLANNING DOMAIN                         │
│                                                                   │
│  ┌────────────┐    ┌────────────┐    ┌────────────────────────┐  │
│  │ SchoolType │◄───│ SchoolClass│───►│ ElectiveHourAllocation │  │
│  └─────┬──────┘    └─────┬──────┘    └────────────────────────┘  │
│        │                 │                                        │
│        ▼                 ▼                                        │
│  ┌────────────┐    ┌────────────┐    ┌────────────────────────┐  │
│  │ MeinReq    │    │ Schedule   │◄───│ AssignmentResult       │  │
│  │ (SiatkaGodz│    │ Entry      │    │ (output of algorithm)  │  │
│  │ in)        │    └─────┬──────┘    └────────────────────────┘  │
│  └────────────┘          │                                        │
│                          ▼                                        │
│  ┌────────────┐    ┌────────────┐    ┌────────────────────────┐  │
│  │ Subject    │◄───│ Teacher    │───►│ Qualification          │  │
│  └────────────┘    └────────────┘    └────────────────────────┘  │
│                                                                   │
│  ┌────────────┐    ┌────────────┐    ┌────────────────────────┐  │
│  │ Profession │    │ NameMapping│    │ ReferencePlan (static) │  │
│  └────────────┘    └────────────┘    └────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

---

## 2. Entities

### 2.1 Teacher (Nauczyciel)

```typescript
// features/teachers/domain/entities/teacher.ts

export interface TeacherId {
  readonly value: string;
}

export interface Teacher {
  readonly id: TeacherId;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly employmentType: EmploymentType;
  readonly maxWeeklyHours: number;
  readonly specializations: SubjectId[];
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export function teacherFullName(teacher: Teacher): string {
  return `${teacher.firstName} ${teacher.lastName}`;
}

export function teacherCanTeach(
  teacher: Teacher,
  subjectId: SubjectId,
  qualifications: Qualification[]
): boolean {
  return qualifications.some(
    (q) =>
      q.teacherId.value === teacher.id.value &&
      q.subjectId.value === subjectId.value &&
      q.isActive
  );
}
```

### 2.2 SchoolClass (Klasa)

```typescript
// features/classes/domain/entities/school-class.ts

export interface SchoolClassId {
  readonly value: string;
}

export interface SchoolClass {
  readonly id: SchoolClassId;
  readonly name: string;
  readonly schoolTypeId: SchoolTypeId;
  readonly schoolYear: SchoolYear;
  readonly classNumber: number | null;
  readonly profile: string | null;
  readonly profession: string | null;
  readonly isActive: boolean;
  readonly ownerId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export function extractClassNumber(schoolClass: SchoolClass): number | null {
  if (schoolClass.classNumber !== null) {
    return schoolClass.classNumber;
  }
  const match = schoolClass.name.match(/^(\d+)/);
  if (match) {
    return Number(match[1]);
  }
  return null;
}
```

### 2.3 Subject (Przedmiot)

```typescript
// features/subjects/domain/entities/subject.ts

export interface SubjectId {
  readonly value: string;
}

export interface Subject {
  readonly id: SubjectId;
  readonly name: string;
  readonly meinCode: string | null;
  readonly type: SubjectType;
  readonly level: SubjectLevel;
  readonly organizationalUnit: string | null;
  readonly isActive: boolean;
}
```

### 2.4 ScheduleEntry (Rozkład godzin)

```typescript
// features/schedule/domain/entities/schedule-entry.ts

export interface ScheduleEntryId {
  readonly value: string;
}

export interface ScheduleEntry {
  readonly id: ScheduleEntryId;
  readonly subjectId: SubjectId;
  readonly classId: SchoolClassId;
  readonly teacherId: TeacherId;
  readonly schoolYear: SchoolYear;
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

export function validateSemesterHours(entry: ScheduleEntry): string | null {
  const expected = entry.semester1Hours + entry.semester2Hours;
  if (entry.annualHours !== expected) {
    return `Annual hours (${entry.annualHours}) must equal sum of semesters (${expected})`;
  }
  return null;
}
```

### 2.5 MeinRequirement (Siatka godzin MEiN)

```typescript
// features/mein-compliance/domain/entities/mein-requirement.ts

export interface MeinRequirementId {
  readonly value: string;
}

export interface MeinRequirement {
  readonly id: MeinRequirementId;
  readonly subjectId: SubjectId;
  readonly schoolTypeId: SchoolTypeId;
  readonly classNumber: number | null;
  readonly cycleHours: number;
  readonly weeklyHoursMin: number | null;
  readonly weeklyHoursMax: number | null;
  readonly isMandatory: boolean;
  readonly validFrom: string;
  readonly validTo: string | null;
  readonly notes: string | null;
}
```

### 2.6 ElectiveHourAllocation (Przydział godzin wybór)

```typescript
// features/assignment/domain/entities/elective-hour-allocation.ts

export interface ElectiveHourAllocationId {
  readonly value: string;
}

export type HoursByGrade = Record<string, number>;
export type SubjectHourMap = Record<string, HoursByGrade>;

export interface ElectiveHourAllocation {
  readonly id: ElectiveHourAllocationId;
  readonly classId: SchoolClassId;
  readonly electiveHours: SubjectHourMap;
  readonly counselingHours: SubjectHourMap;
  readonly directorHours: SubjectHourMap;
  readonly extensions: string[];
  readonly extensionHoursPool: HoursByGrade;
  readonly extensionHoursPerSubject: SubjectHourMap;
  readonly realization: SubjectHourMap;
  readonly groupDivision: Record<string, Record<string, boolean>>;
  readonly groupHours: Record<string, Record<string, { g1: number; g2: number }>>;
}
```

### 2.7 Qualification (Kwalifikacja)

```typescript
// features/qualifications/domain/entities/qualification.ts

export interface QualificationId {
  readonly value: string;
}

export interface Qualification {
  readonly id: QualificationId;
  readonly teacherId: TeacherId;
  readonly subjectId: SubjectId;
  readonly degree: string | null;
  readonly specialization: string | null;
  readonly obtainedAt: string | null;
  readonly documentRef: string | null;
  readonly isActive: boolean;
}
```

### 2.8 SchoolType (Typ szkoły)

```typescript
// features/school-types/domain/entities/school-type.ts

export interface SchoolTypeId {
  readonly value: string;
}

export interface SchoolType {
  readonly id: SchoolTypeId;
  readonly name: string;
  readonly cycleYears: number;
  readonly meinCode: string;
}
```

---

## 3. Value Objects

```typescript
// shared/types/value-objects.ts

export type EmploymentType = 'pelny' | 'pol' | 'czwarty' | 'osiemnasty';

export type SubjectType =
  | 'ogolnoksztalcace'
  | 'zawodowe_teoretyczne'
  | 'zawodowe_praktyczne';

export type SubjectLevel = 'podstawowy' | 'rozszerzony' | 'brak';

export type UserRole = 'admin' | 'dyrektor' | 'sekretariat';

export type ComplianceStatus = 'OK' | 'BRAK' | 'NADWYZKA' | 'BRAK_DANYCH';

export type RiskCategory = 'niski' | 'sredni' | 'wysoki' | 'krytyczny';

export interface SchoolYear {
  readonly value: string; // "YYYY/YYYY" format
}

export function parseSchoolYear(raw: string): SchoolYear | null {
  const pattern = /^\d{4}\/\d{4}$/;
  if (!pattern.test(raw)) {
    return null;
  }
  return { value: raw };
}

export const EMPLOYMENT_TO_MAX_HOURS: Record<EmploymentType, number> = {
  pelny: 18,
  pol: 9,
  czwarty: 4.5,
  osiemnasty: 1,
};
```

---

## 4. Domain Services

### 4.1 AssignmentService (★ CRITICAL — must preserve exact behavior)

This is the pure domain service that implements the greedy assignment algorithm. It takes pre-loaded data and returns deterministic results.

```typescript
// features/assignment/domain/services/assignment-service.ts

export interface AssignmentTask {
  readonly id: string;
  readonly subjectId: string;
  readonly subjectName: string;
  readonly classId: string;
  readonly className: string;
  readonly classNumber: number | null;
  readonly weeklyHours: number;
  readonly annualHours: number;
  readonly priority: number;
  readonly requiresQualifications: boolean;
  readonly preferredTeachers: string[];
  readonly excludedTeachers: string[];
}

export interface Assignment {
  readonly taskId: string;
  readonly subjectId: string;
  readonly subjectName: string;
  readonly classId: string;
  readonly className: string;
  readonly teacherId: string;
  readonly teacherName: string;
  readonly weeklyHours: number;
  readonly annualHours: number;
  readonly reason: string;
  readonly priority: number;
}

export interface StaffingGap {
  readonly taskId: string;
  readonly subjectId: string;
  readonly subjectName: string;
  readonly classId: string;
  readonly className: string;
  readonly weeklyHours: number;
  readonly reason: string;
  readonly availableTeacherCount: number;
  readonly suggestedSolutions: string[];
}

export interface WorkloadStats {
  readonly teacherId: string;
  readonly teacherName: string;
  readonly maxWeeklyHours: number;
  readonly hoursBefore: number;
  readonly hoursAfter: number;
  readonly difference: number;
  readonly utilizationPercent: number;
  readonly assignmentCount: number;
}

export interface AssignmentResult {
  readonly assignments: Assignment[];
  readonly staffingGaps: StaffingGap[];
  readonly workloadStats: WorkloadStats[];
  readonly metrics: {
    readonly totalTasks: number;
    readonly successfulAssignments: number;
    readonly failedAssignments: number;
    readonly averageWorkload: number;
    readonly standardDeviation: number;
    readonly balanceCoefficient: number;
  };
  readonly warnings: string[];
}

export interface TeacherAvailability {
  readonly teacherId: string;
  readonly teacherName: string;
  readonly maxWeeklyHours: number;
  readonly currentWeeklyHours: number;
  readonly availableHours: number;
  readonly hasQualifications: boolean;
}

export interface AssignmentParams {
  readonly schoolYear: string;
  readonly requireQualifications: boolean;
  readonly maxOverload: number;
  readonly preferContinuity: boolean;
  readonly minimumWorkload: number;
}

/**
 * Pure function: distributes assignment tasks to teachers.
 *
 * CRITICAL: This function must produce IDENTICAL outputs to the old
 * `automatycznyRozdzialGodzin` for the same inputs. See doc 09 for
 * the parity test plan.
 *
 * Algorithm (greedy with workload balancing):
 * 1. Tasks are pre-sorted by class number (ascending), then tasks
 *    without a class number go last.
 * 2. For each task:
 *    a. Skip if a locked schedule entry exists for this subject+class.
 *    b. Find available teachers (qualification check optional).
 *    c. Filter by workload capacity (with max overload tolerance).
 *    d. If no teacher fits capacity, use all available (allow overload).
 *    e. Sort candidates: continuity preference first, then by workload
 *       utilization percentage (ascending = least loaded first).
 *    f. Pick the first candidate.
 * 3. Track running workloads and assignment maps.
 * 4. Compute statistics: mean workload, std deviation, balance coefficient.
 */
export function distributeAssignments(
  tasks: readonly AssignmentTask[],
  teachers: readonly TeacherAvailability[],
  lockedEntries: ReadonlySet<string>,
  initialWorkloads: ReadonlyMap<string, number>,
  params: AssignmentParams
): AssignmentResult {
  // Implementation preserving exact old algorithm behavior.
  // See 09_assignment_equivalence_plan.md for the full specification.
  throw new Error('Implementation required — see equivalence plan');
}
```

### 4.2 TeacherMatchingService

```typescript
// features/assignment/domain/services/teacher-matching-service.ts

/**
 * Pure function: finds and ranks available teachers for a subject.
 *
 * Sorting rules (must match old behavior exactly):
 * 1. Preferred teachers first (if any).
 * 2. Then by available hours descending (more capacity = better).
 */
export function rankAvailableTeachers(
  teachers: readonly TeacherAvailability[],
  preferredIds: readonly string[],
  excludedIds: readonly string[]
): TeacherAvailability[] {
  const eligible = teachers.filter((t) => {
    if (excludedIds.includes(t.teacherId)) {
      return false;
    }
    return true;
  });

  const sorted = [...eligible].sort((a, b) => {
    const aPref = preferredIds.includes(a.teacherId) ? 1 : 0;
    const bPref = preferredIds.includes(b.teacherId) ? 1 : 0;

    if (aPref !== bPref) {
      return bPref - aPref;
    }

    return b.availableHours - a.availableHours;
  });

  return sorted;
}
```

### 4.3 HourAllocationService

```typescript
// features/assignment/domain/services/hour-allocation-service.ts

/**
 * Pure function: fills unassigned elective hours across grades optimally.
 *
 * Algorithm (must match old `uzupełnijNierozdysponowane` exactly):
 * - Keep already-assigned hours unchanged.
 * - Distribute remaining hours one-by-one to the grade with fewest hours.
 */
export function fillUnassignedHours(
  current: Readonly<Record<string, number>>,
  totalRequired: number,
  grades: readonly string[]
): Record<string, number> {
  if (grades.length === 0 || totalRequired <= 0) {
    return { ...current };
  }

  const result: Record<string, number> = {};
  let assigned = 0;

  for (const g of grades) {
    const v = current[g] ?? 0;
    result[g] = v;
    assigned += v;
  }

  let remaining = totalRequired - assigned;
  if (remaining <= 0) {
    return result;
  }

  for (let i = 0; i < remaining; i++) {
    let minGrade = grades[0];
    for (const gr of grades) {
      if ((result[gr] ?? 0) < (result[minGrade] ?? 0)) {
        minGrade = gr;
      }
    }
    result[minGrade] = (result[minGrade] ?? 0) + 1;
  }

  return result;
}
```

### 4.4 MeinComplianceService

```typescript
// features/mein-compliance/domain/services/mein-compliance-service.ts

export interface ComplianceResult {
  readonly subjectId: string;
  readonly subjectName: string;
  readonly schoolTypeId: string;
  readonly schoolTypeName: string;
  readonly classId: string | null;
  readonly className: string | null;
  readonly classNumber: number | null;
  readonly required: {
    readonly cycleHours: number;
    readonly weeklyHoursMin: number | null;
    readonly weeklyHoursMax: number | null;
    readonly isMandatory: boolean;
    readonly classNumber: number | null;
  };
  readonly realized: {
    readonly annualHours: number;
    readonly cycleHours: number;
    readonly averageWeeklyHours: number;
  };
  readonly difference: {
    readonly hours: number;
    readonly realizationPercent: number;
  };
  readonly status: ComplianceStatus;
  readonly alerts: string[];
}

/**
 * Pure function: calculates MEiN compliance for given requirements and schedules.
 */
export function calculateCompliance(
  requirements: readonly MeinRequirement[],
  scheduleEntries: readonly ScheduleEntry[],
  classes: readonly SchoolClass[],
  subjects: readonly Subject[],
  schoolTypes: readonly SchoolType[]
): ComplianceResult[] {
  // Must produce identical results to old `obliczZgodnoscMein`.
  throw new Error('Implementation required');
}
```

### 4.5 RiskIndicatorService

```typescript
// features/dashboard/domain/services/risk-indicator-service.ts

export interface RiskFactor {
  readonly name: string;
  readonly impact: number; // 0-100
  readonly description: string;
}

export interface RiskIndicator {
  readonly value: number; // 0-100
  readonly category: RiskCategory;
  readonly factors: RiskFactor[];
  readonly recommendations: string[];
}

/**
 * Pure function: computes risk indicator from compliance results,
 * staffing gaps, and workload data.
 *
 * Category thresholds (must match old behavior):
 *   0-24  → niski
 *   25-49 → sredni
 *   50-74 → wysoki
 *   75-100 → krytyczny
 */
export function calculateRiskIndicator(
  complianceResults: readonly ComplianceResult[],
  staffingGaps: readonly StaffingGap[],
  teacherWorkloads: readonly WorkloadStats[],
  classesWithoutAssignments: number,
  totalClasses: number
): RiskIndicator {
  // Must produce identical results to old `obliczWskaznikRyzyka`.
  throw new Error('Implementation required');
}
```

### 4.6 RealizationService

```typescript
// features/realization/domain/services/realization-service.ts

export interface RealizationData {
  readonly realizationPercent: number;
  readonly hoursShortage: number;
  readonly hoursSurplus: number;
}

/**
 * Pure function: calculates realization percentage from MEiN plan
 * and assigned hours.
 *
 * Rounding rule: Math.round(x * 10) / 10 (must match old behavior).
 */
export function calculateRealization(
  schoolTypeName: string,
  electiveHours: Readonly<Record<string, Record<string, number>>>,
  counselingHours: Readonly<Record<string, Record<string, number>>>,
  directorHours: Readonly<Record<string, Record<string, number>>>,
  extensionHours: Readonly<Record<string, Record<string, number>>>,
  referencePlans: readonly ReferencePlan[]
): RealizationData {
  // Must produce identical results to old `obliczRealizacjaZPrzydzialu`.
  throw new Error('Implementation required');
}
```

---

## 5. Aggregates

| Aggregate Root | Members | Invariants |
|---|---|---|
| `SchoolClass` | Has `ElectiveHourAllocation` (1:1) | Year range valid; classNumber derived from name if not set |
| `Teacher` | Has many `Qualification` | Unique teacher+subject per qualification; maxWeeklyHours derived from employmentType |
| `ScheduleEntry` | Standalone | annualHours === semester1 + semester2; weeklyHours between 0 and 10 |
| `MeinRequirement` | Standalone | weeklyHoursMin <= weeklyHoursMax; validFrom <= validTo |
| `SchoolType` | Referenced by many entities | cycleYears > 0; meinCode unique |

---

## 6. Invariants & Edge Cases

| # | Invariant | Enforcement |
|---|---|---|
| I1 | `annualHours === semester1Hours + semester2Hours` | Domain validation + DB check constraint |
| I2 | `weeklyHours ∈ [0, 10]` | Domain validation + DB check constraint |
| I3 | Teacher `maxWeeklyHours` must match employment type mapping | Domain hook on create/update |
| I4 | Qualification uniqueness: one teacher+subject pair | DB unique constraint |
| I5 | School year format: `YYYY/YYYY` | Zod schema + domain validation |
| I6 | Locked schedule entries are skipped by the assignment algorithm | Domain service logic |
| I7 | Director discretion hours are excluded from automatic assignment | Domain service: skip subjects matching `/godziny\s+do\s+dyspozycji\s+dyrektora/i` |
| I8 | Tasks sorted by class number ascending; tasks without classNumber go last | Domain service sorting |
| I9 | When multiple teachers have equal utilization %, the one encountered first in the sorted array wins (stable sort) | Critical tie-breaker — must match old behavior |
| I10 | Elective hour fill: distribute one-by-one to grade with fewest hours (greedy leveling) | Domain service: `fillUnassignedHours` |
| I11 | Realization rounding: `Math.round(x * 10) / 10` | Domain service |
| I12 | Risk category thresholds: 0-24 niski, 25-49 sredni, 50-74 wysoki, 75-100 krytyczny | Domain service |
| I13 | Risk value formula: `min(100, (sumImpacts / (numFactors * 100)) * 100)` | Domain service |

---

## 7. Repository Interfaces

```typescript
// features/assignment/domain/ports/assignment-repository.ts

export interface AssignmentTaskRepository {
  findTasksForAssignment(
    schoolYear: string,
    schoolTypeId: string | null
  ): Promise<AssignmentTask[]>;
}

export interface TeacherAvailabilityRepository {
  findAllActiveWithWorkload(
    schoolYear: string
  ): Promise<{ teachers: TeacherAvailability[]; workloads: Map<string, number> }>;
}

export interface ScheduleRepository {
  findLockedEntryKeys(schoolYear: string): Promise<Set<string>>;

  saveAssignments(
    assignments: Assignment[],
    schoolYear: string
  ): Promise<{ created: string[]; errors: Array<{ assignment: Assignment; error: string }> }>;

  findExistingEntry(
    subjectId: string,
    classId: string,
    teacherId: string,
    schoolYear: string
  ): Promise<ScheduleEntry | null>;
}

export interface ElectiveAllocationRepository {
  findByClassId(classId: string): Promise<ElectiveHourAllocation | null>;

  save(allocation: ElectiveHourAllocation): Promise<void>;
}
```

---

## 8. Domain Events (optional, for future extensibility)

```typescript
// shared/types/domain-events.ts

export type DomainEvent =
  | { type: 'ASSIGNMENT_GENERATED'; payload: { schoolYear: string; assignmentCount: number } }
  | { type: 'STAFFING_GAP_DETECTED'; payload: { subjectName: string; className: string } }
  | { type: 'TEACHER_OVERLOADED'; payload: { teacherId: string; currentHours: number; maxHours: number } }
  | { type: 'SCHEDULE_ENTRY_LOCKED'; payload: { entryId: string; reason: string } };
```

Domain events are not required for the initial rewrite but provide a clean extension point for notifications, audit logging, and real-time updates.
