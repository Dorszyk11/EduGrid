# 04 — Use Cases (Application Layer)

## 1. Design Principles

- Each use case is a single function (or class with `execute` method) in the application layer.
- Use cases orchestrate: validate input → call domain services → call repositories → return DTO.
- Use cases **never** contain business logic — that lives in domain services.
- All inputs validated via Zod schemas that produce typed DTOs.
- All errors are typed domain errors mapped to HTTP codes at the boundary.

---

## 2. Error Model

```typescript
// lib/errors/domain-errors.ts

export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  readonly httpStatus = 404;
  constructor(entity: string, id: string) {
    super(`${entity} with id "${id}" not found`);
  }
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly httpStatus = 400;
  readonly fieldErrors: Record<string, string[]>;
  constructor(message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message);
    this.fieldErrors = fieldErrors;
  }
}

export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED';
  readonly httpStatus = 401;
  constructor(message = 'Authentication required') {
    super(message);
  }
}

export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';
  readonly httpStatus = 403;
  constructor(message = 'Insufficient permissions') {
    super(message);
  }
}

export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';
  readonly httpStatus = 409;
  constructor(message: string) {
    super(message);
  }
}

export class TeacherOverloadedError extends DomainError {
  readonly code = 'TEACHER_OVERLOADED';
  readonly httpStatus = 422;
  constructor(
    readonly teacherId: string,
    readonly currentHours: number,
    readonly maxHours: number
  ) {
    super(
      `Teacher ${teacherId} would exceed max workload: ${currentHours}/${maxHours}h`
    );
  }
}

export class NoQualifiedTeacherError extends DomainError {
  readonly code = 'NO_QUALIFIED_TEACHER';
  readonly httpStatus = 422;
  constructor(readonly subjectName: string, readonly className: string) {
    super(`No qualified teacher available for ${subjectName} in ${className}`);
  }
}
```

### HTTP Error Mapping

```typescript
// lib/errors/http-mapper.ts

import { DomainError } from './domain-errors';

export interface ErrorResponse {
  error: string;
  code: string;
  fieldErrors?: Record<string, string[]>;
}

export function mapDomainErrorToResponse(error: unknown): {
  status: number;
  body: ErrorResponse;
} {
  if (error instanceof DomainError) {
    return {
      status: error.httpStatus,
      body: {
        error: error.message,
        code: error.code,
        ...(error instanceof ValidationError
          ? { fieldErrors: error.fieldErrors }
          : {}),
      },
    };
  }

  return {
    status: 500,
    body: {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  };
}
```

---

## 3. Use Cases by Feature

### 3.1 Assignment Feature (★ CRITICAL)

#### GenerateAutomaticAssignment

```typescript
// features/assignment/application/use-cases/generate-automatic-assignment.ts

import { z } from 'zod';

export const GenerateAssignmentInput = z.object({
  schoolYear: z.string().regex(/^\d{4}\/\d{4}$/),
  schoolTypeId: z.string().optional(),
  requireQualifications: z.boolean().default(true),
  maxOverload: z.number().min(0).default(0),
  preferContinuity: z.boolean().default(true),
  minimumWorkload: z.number().min(0).default(0),
});

export type GenerateAssignmentInputDTO = z.infer<typeof GenerateAssignmentInput>;

export interface GenerateAssignmentOutputDTO {
  assignments: Array<{
    taskId: string;
    subjectName: string;
    className: string;
    teacherName: string;
    weeklyHours: number;
    annualHours: number;
    reason: string;
  }>;
  staffingGaps: Array<{
    subjectName: string;
    className: string;
    weeklyHours: number;
    reason: string;
    suggestedSolutions: string[];
  }>;
  metrics: {
    totalTasks: number;
    successfulAssignments: number;
    failedAssignments: number;
    averageWorkload: number;
    balanceCoefficient: number;
  };
  warnings: string[];
}

export async function generateAutomaticAssignment(
  input: GenerateAssignmentInputDTO,
  deps: {
    taskRepo: AssignmentTaskRepository;
    teacherRepo: TeacherAvailabilityRepository;
    scheduleRepo: ScheduleRepository;
  }
): Promise<GenerateAssignmentOutputDTO> {
  // 1. Fetch all tasks
  const tasks = await deps.taskRepo.findTasksForAssignment(
    input.schoolYear,
    input.schoolTypeId ?? null
  );

  // 2. Fetch all teachers with workloads
  const { teachers, workloads } =
    await deps.teacherRepo.findAllActiveWithWorkload(input.schoolYear);

  // 3. Fetch locked entries
  const lockedEntries = await deps.scheduleRepo.findLockedEntryKeys(
    input.schoolYear
  );

  // 4. Run pure domain function
  const result = distributeAssignments(tasks, teachers, lockedEntries, workloads, {
    schoolYear: input.schoolYear,
    requireQualifications: input.requireQualifications,
    maxOverload: input.maxOverload,
    preferContinuity: input.preferContinuity,
    minimumWorkload: input.minimumWorkload,
  });

  // 5. Map to output DTO
  return {
    assignments: result.assignments.map((a) => ({
      taskId: a.taskId,
      subjectName: a.subjectName,
      className: a.className,
      teacherName: a.teacherName,
      weeklyHours: a.weeklyHours,
      annualHours: a.annualHours,
      reason: a.reason,
    })),
    staffingGaps: result.staffingGaps.map((g) => ({
      subjectName: g.subjectName,
      className: g.className,
      weeklyHours: g.weeklyHours,
      reason: g.reason,
      suggestedSolutions: g.suggestedSolutions,
    })),
    metrics: result.metrics,
    warnings: result.warnings,
  };
}
```

#### SaveAssignments

```typescript
// features/assignment/application/use-cases/save-assignments.ts

export const SaveAssignmentsInput = z.object({
  assignments: z.array(
    z.object({
      subjectId: z.string(),
      classId: z.string(),
      teacherId: z.string(),
      weeklyHours: z.number().min(0).max(10),
      annualHours: z.number().min(0),
    })
  ),
  schoolYear: z.string().regex(/^\d{4}\/\d{4}$/),
});

export type SaveAssignmentsInputDTO = z.infer<typeof SaveAssignmentsInput>;

export interface SaveAssignmentsOutputDTO {
  created: number;
  errors: number;
  details: {
    created: string[];
    errors: Array<{ subjectId: string; classId: string; error: string }>;
  };
}
```

#### AllocateElectiveHours

```typescript
// features/assignment/application/use-cases/allocate-elective-hours.ts

export const AllocateElectiveHoursInput = z.object({
  classId: z.string(),
  schoolTypeId: z.string(),
});

export type AllocateElectiveHoursInputDTO = z.infer<typeof AllocateElectiveHoursInput>;

export interface AllocateElectiveHoursOutputDTO {
  electiveHours: Record<string, Record<string, number>>;
  counselingHours: Record<string, Record<string, number>>;
  message: string;
}
```

---

### 3.2 Schedule Feature

#### GetSchoolGrid

```typescript
export const GetSchoolGridInput = z.object({
  schoolTypeId: z.string(),
  schoolYear: z.string().regex(/^\d{4}\/\d{4}$/),
});

export interface SchoolGridOutputDTO {
  classes: Array<{ id: string; name: string }>;
  subjects: Array<{ id: string; name: string }>;
  entries: Array<{
    subjectId: string;
    classId: string;
    teacherName: string | null;
    weeklyHours: number;
    annualHours: number;
    isLocked: boolean;
  }>;
}
```

#### UpdateScheduleEntry

```typescript
export const UpdateScheduleEntryInput = z.object({
  id: z.string(),
  weeklyHours: z.number().min(0).max(10).optional(),
  annualHours: z.number().min(0).optional(),
  semester1Hours: z.number().min(0).optional(),
  semester2Hours: z.number().min(0).optional(),
  teacherId: z.string().optional(),
  notes: z.string().optional(),
  isLocked: z.boolean().optional(),
  lockReason: z.string().optional(),
});
```

---

### 3.3 MEiN Compliance Feature

#### CalculateComplianceForSchool

```typescript
export const CalculateComplianceInput = z.object({
  schoolTypeId: z.string(),
  schoolYear: z.string().regex(/^\d{4}\/\d{4}$/).optional(),
});

export interface ComplianceOutputDTO {
  results: Array<{
    subjectName: string;
    className: string | null;
    requiredCycleHours: number;
    realizedCycleHours: number;
    differenceHours: number;
    realizationPercent: number;
    status: ComplianceStatus;
    alerts: string[];
  }>;
  summary: {
    totalSubjects: number;
    compliant: number;
    shortage: number;
    surplus: number;
    noData: number;
  };
}
```

---

### 3.4 Dashboard Feature

#### GetDashboardSummary

```typescript
export const GetDashboardInput = z.object({
  schoolTypeId: z.string(),
  schoolYear: z.string().regex(/^\d{4}\/\d{4}$/),
  classId: z.string().optional(),
});

export interface DashboardSummaryDTO {
  realizationPercent: number;
  hoursShortage: number;
  hoursSurplus: number;
  teacherCount: number;
  classCount: number;
  subjectCount: number;
  riskIndicator: {
    value: number;
    category: RiskCategory;
  };
}
```

#### CalculateRiskIndicator

```typescript
export const RiskIndicatorInput = z.object({
  schoolTypeId: z.string(),
  schoolYear: z.string().regex(/^\d{4}\/\d{4}$/),
});

export interface RiskIndicatorOutputDTO {
  value: number;
  category: RiskCategory;
  factors: Array<{
    name: string;
    impact: number;
    description: string;
  }>;
  recommendations: string[];
}
```

---

### 3.5 Teachers Feature

#### ListTeachers

```typescript
export const ListTeachersInput = z.object({
  isActive: z.boolean().optional(),
  subjectId: z.string().optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(50),
});

export interface TeacherListItemDTO {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  employmentType: EmploymentType;
  maxWeeklyHours: number;
  isActive: boolean;
  specializationCount: number;
}

export interface ListTeachersOutputDTO {
  teachers: TeacherListItemDTO[];
  total: number;
  page: number;
  pageSize: number;
}
```

#### CreateTeacher

```typescript
export const CreateTeacherInput = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  employmentType: z.enum(['pelny', 'pol', 'czwarty', 'osiemnasty']),
  maxWeeklyHours: z.number().min(0).max(40).optional(),
  specializationIds: z.array(z.string()).default([]),
});
```

---

### 3.6 Classes Feature

#### CreateClass

```typescript
export const CreateClassInput = z.object({
  name: z.string().min(1).max(50),
  schoolTypeId: z.string(),
  schoolYear: z.string().regex(/^\d{4}\/\d{4}$/),
  classNumber: z.number().min(1).max(8).optional(),
  profile: z.string().optional(),
  profession: z.string().optional(),
});
```

---

### 3.7 Reports Feature

#### ExportToExcel

```typescript
export const ExportToExcelInput = z.object({
  schoolTypeId: z.string(),
  schoolYear: z.string().regex(/^\d{4}\/\d{4}$/),
  reportType: z.enum([
    'compliance',
    'workload',
    'staffing',
    'organizational-sheet',
  ]),
});

export interface ExportToExcelOutputDTO {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}
```

---

### 3.8 Import Feature

#### ImportMeinPdf

```typescript
export const ImportMeinPdfInput = z.object({
  file: z.instanceof(File),
  schoolTypeId: z.string(),
});

export interface ImportMeinPdfOutputDTO {
  importedRequirements: number;
  skippedDuplicates: number;
  errors: string[];
  warnings: string[];
}
```

---

## 4. Transaction Boundaries & Idempotency

| Use Case | Transaction Boundary | Idempotent? |
|---|---|---|
| `GenerateAutomaticAssignment` | Read-only (no DB writes) | YES — pure computation |
| `SaveAssignments` | Per-assignment upsert (idempotent via subject+class+teacher+year lookup) | YES |
| `AllocateElectiveHours` | Single document upsert (by classId) | YES |
| `UpdateScheduleEntry` | Single row update | YES |
| `CreateTeacher` | Single row insert | NO (creates new row each call) |
| `CreateClass` | Single row insert | NO |
| `ImportMeinPdf` | Batch insert with duplicate detection | PARTIALLY (skips duplicates) |
| `CalculateCompliance` | Read-only | YES |
| `CalculateRiskIndicator` | Read-only | YES |

### Idempotency Strategy

- **Upsert operations**: Check for existing record by natural key before insert. If exists, update.
- **Generation operations**: Return computed results without side effects; saving is a separate use case.
- **Import operations**: Skip records that match existing data (by subject + schoolType + validFrom composite key).
