# 06 — API Contracts

## 1. API Strategy

The rewrite uses **Next.js Server Actions** as the primary API layer for mutations and **Route Handlers** only where a traditional HTTP endpoint is needed (file uploads, file downloads, external integrations).

| Pattern | When to Use |
|---|---|
| **Server Action** | Form submissions, mutations, queries triggered by UI interactions |
| **Route Handler** (`app/api/...`) | File upload (multipart), file download (binary stream), webhook endpoints |

All endpoints require authentication unless explicitly marked as public.

---

## 2. Validation Approach

Every input is validated with **Zod** before reaching the use case layer.

```typescript
// lib/validation/action-helpers.ts

import { z, ZodSchema } from 'zod';

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string; fieldErrors?: Record<string, string[]> };

export async function validateAndExecute<TInput, TOutput>(
  schema: ZodSchema<TInput>,
  rawInput: unknown,
  handler: (input: TInput) => Promise<TOutput>
): Promise<ActionResult<TOutput>> {
  const parsed = schema.safeParse(rawInput);

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join('.');
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(issue.message);
    }

    return {
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      fieldErrors,
    };
  }

  try {
    const result = await handler(parsed.data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof DomainError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }
    return {
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    };
  }
}
```

---

## 3. Response Shapes

### Success Response

```typescript
interface SuccessResponse<T> {
  success: true;
  data: T;
}
```

### Error Response

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  fieldErrors?: Record<string, string[]>;
}
```

### Error Codes

| Code | HTTP Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `UNAUTHORIZED` | 401 | No valid session |
| `FORBIDDEN` | 403 | Insufficient role permissions |
| `NOT_FOUND` | 404 | Entity not found |
| `CONFLICT` | 409 | Duplicate or constraint violation |
| `TEACHER_OVERLOADED` | 422 | Teacher would exceed max workload |
| `NO_QUALIFIED_TEACHER` | 422 | No teacher with qualifications available |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## 4. Server Actions (Primary API)

### 4.1 Assignment Actions

```typescript
// features/assignment/presentation/actions.ts
'use server';

// POST-equivalent: Generate automatic assignment
export async function generateAssignmentAction(
  input: {
    schoolYear: string;
    schoolTypeId?: string;
    requireQualifications?: boolean;
    maxOverload?: number;
    preferContinuity?: boolean;
  }
): Promise<ActionResult<GenerateAssignmentOutputDTO>>

// POST-equivalent: Save assignments to database
export async function saveAssignmentsAction(
  input: {
    assignments: Array<{
      subjectId: string;
      classId: string;
      teacherId: string;
      weeklyHours: number;
      annualHours: number;
    }>;
    schoolYear: string;
  }
): Promise<ActionResult<SaveAssignmentsOutputDTO>>

// POST-equivalent: Allocate elective hours for a class
export async function allocateElectiveHoursAction(
  input: { classId: string; schoolTypeId: string }
): Promise<ActionResult<AllocateElectiveHoursOutputDTO>>

// POST-equivalent: Assign extension hours
export async function assignExtensionHoursAction(
  input: {
    classId: string;
    extensions: Record<string, Record<string, number>>;
  }
): Promise<ActionResult<{ saved: boolean }>>

// POST-equivalent: Update elective allocation
export async function updateElectiveAllocationAction(
  input: {
    classId: string;
    field: 'elective_hours' | 'counseling_hours' | 'director_hours'
      | 'extensions' | 'extension_hours_pool' | 'extension_hours_per_subject'
      | 'realization' | 'group_division' | 'group_hours';
    value: unknown;
  }
): Promise<ActionResult<{ saved: boolean }>>
```

### 4.2 Schedule Actions

```typescript
// features/schedule/presentation/actions.ts
'use server';

// GET-equivalent: Fetch school grid data
export async function getSchoolGridAction(
  input: { schoolTypeId: string; schoolYear: string }
): Promise<ActionResult<SchoolGridOutputDTO>>

// PUT-equivalent: Update a schedule entry
export async function updateScheduleEntryAction(
  input: {
    id: string;
    weeklyHours?: number;
    annualHours?: number;
    semester1Hours?: number;
    semester2Hours?: number;
    teacherId?: string;
    notes?: string;
    isLocked?: boolean;
    lockReason?: string;
  }
): Promise<ActionResult<{ updated: boolean }>>

// DELETE-equivalent: Remove a schedule entry
export async function deleteScheduleEntryAction(
  input: { id: string }
): Promise<ActionResult<{ deleted: boolean }>>

// POST-equivalent: Assign teacher to subject in class
export async function assignTeacherAction(
  input: {
    subjectId: string;
    classId: string;
    teacherId: string;
    weeklyHours: number;
    annualHours: number;
    schoolYear: string;
  }
): Promise<ActionResult<{ entryId: string }>>
```

### 4.3 Teacher Actions

```typescript
// features/teachers/presentation/actions.ts
'use server';

export async function listTeachersAction(
  input: { isActive?: boolean; subjectId?: string; page?: number; pageSize?: number }
): Promise<ActionResult<ListTeachersOutputDTO>>

export async function getTeacherAction(
  input: { id: string }
): Promise<ActionResult<TeacherDetailDTO>>

export async function createTeacherAction(
  input: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    employmentType: EmploymentType;
    maxWeeklyHours?: number;
    specializationIds?: string[];
  }
): Promise<ActionResult<{ id: string }>>

export async function updateTeacherAction(
  input: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    employmentType?: EmploymentType;
    maxWeeklyHours?: number;
    isActive?: boolean;
  }
): Promise<ActionResult<{ updated: boolean }>>

export async function getTeacherWorkloadAction(
  input: { teacherId: string; schoolYear: string }
): Promise<ActionResult<TeacherWorkloadDTO>>
```

### 4.4 Class Actions

```typescript
// features/classes/presentation/actions.ts
'use server';

export async function listClassesAction(
  input: { schoolTypeId?: string; schoolYear?: string; isActive?: boolean }
): Promise<ActionResult<ClassListDTO>>

export async function createClassAction(
  input: {
    name: string;
    schoolTypeId: string;
    schoolYear: string;
    classNumber?: number;
    profile?: string;
    profession?: string;
  }
): Promise<ActionResult<{ id: string }>>

export async function updateClassAction(
  input: { id: string; name?: string; profile?: string; isActive?: boolean }
): Promise<ActionResult<{ updated: boolean }>>

export async function deleteClassAction(
  input: { id: string }
): Promise<ActionResult<{ deleted: boolean }>>
```

### 4.5 Subject Actions

```typescript
// features/subjects/presentation/actions.ts
'use server';

export async function listSubjectsAction(
  input: { isActive?: boolean; type?: SubjectType }
): Promise<ActionResult<SubjectListDTO>>

export async function createSubjectAction(
  input: {
    name: string;
    meinCode?: string;
    subjectType: SubjectType;
    level: SubjectLevel;
  }
): Promise<ActionResult<{ id: string }>>

export async function updateSubjectAction(
  input: { id: string; name?: string; isActive?: boolean }
): Promise<ActionResult<{ updated: boolean }>>
```

### 4.6 Compliance Actions

```typescript
// features/mein-compliance/presentation/actions.ts
'use server';

export async function calculateSchoolComplianceAction(
  input: { schoolTypeId: string; schoolYear?: string }
): Promise<ActionResult<ComplianceOutputDTO>>

export async function calculateClassComplianceAction(
  input: { classId: string; schoolYear?: string }
): Promise<ActionResult<ComplianceOutputDTO>>
```

### 4.7 Dashboard Actions

```typescript
// features/dashboard/presentation/actions.ts
'use server';

export async function getDashboardSummaryAction(
  input: { schoolTypeId: string; schoolYear: string; classId?: string }
): Promise<ActionResult<DashboardSummaryDTO>>

export async function getRiskIndicatorAction(
  input: { schoolTypeId: string; schoolYear: string }
): Promise<ActionResult<RiskIndicatorOutputDTO>>

export async function getDashboardAlertsAction(
  input: { schoolTypeId: string; schoolYear: string }
): Promise<ActionResult<AlertsDTO>>

export async function getStaffingGapsAction(
  input: { schoolTypeId: string; schoolYear: string }
): Promise<ActionResult<StaffingGapsDTO>>
```

### 4.8 Realization Actions

```typescript
// features/realization/presentation/actions.ts
'use server';

export async function getRealizationAction(
  input: { classId: string; schoolTypeName: string }
): Promise<ActionResult<RealizationOutputDTO>>

export async function updateRealizationAction(
  input: { classId: string; realization: Record<string, Record<string, number>> }
): Promise<ActionResult<{ saved: boolean }>>
```

### 4.9 Name Mapping Actions

```typescript
// features/name-mappings/presentation/actions.ts
'use server';

export async function listNameMappingsAction(
  input: { type?: 'przedmiot' | 'typ_szkoly'; isActive?: boolean }
): Promise<ActionResult<NameMappingListDTO>>

export async function createNameMappingAction(
  input: {
    meinName: string;
    schoolName: string;
    mappingType: 'przedmiot' | 'typ_szkoly';
    subjectId?: string;
    schoolTypeId?: string;
  }
): Promise<ActionResult<{ id: string }>>
```

---

## 5. Route Handlers (for non-action endpoints)

### 5.1 File Upload: PDF Import

```
POST /api/import/mein-pdf
Content-Type: multipart/form-data

Body:
  file: File (PDF)
  schoolTypeId: string

Response (200):
{
  "success": true,
  "data": {
    "importedRequirements": 42,
    "skippedDuplicates": 3,
    "errors": [],
    "warnings": ["Some table cells could not be parsed"]
  }
}

Response (400):
{
  "success": false,
  "error": "Invalid PDF format",
  "code": "VALIDATION_ERROR"
}
```

### 5.2 File Download: Excel Export

```
GET /api/export/xls?schoolTypeId=...&schoolYear=...&reportType=compliance

Response (200):
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="raport-zgodnosc-2025-2026.xlsx"
[binary Excel data]

Response (400):
{
  "success": false,
  "error": "Missing required parameter: schoolTypeId",
  "code": "VALIDATION_ERROR"
}
```

### 5.3 Seed / Reset (development only)

```
POST /api/seed
Authorization: Bearer <admin-token>

Response (200):
{
  "success": true,
  "data": { "seeded": true, "counts": { "teachers": 10, "classes": 5, "subjects": 20 } }
}
```

---

## 6. Example Server Action Implementation

```typescript
// features/teachers/presentation/actions.ts
'use server';

import { z } from 'zod';
import { createSupabaseServer } from '@/lib/supabase/server';
import { validateAndExecute } from '@/lib/validation/action-helpers';
import { EMPLOYMENT_TO_MAX_HOURS } from '@/shared/types/value-objects';
import type { ActionResult } from '@/lib/validation/action-helpers';

const CreateTeacherSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email').optional(),
  phone: z.string().optional(),
  employmentType: z.enum(['pelny', 'pol', 'czwarty', 'osiemnasty']),
  maxWeeklyHours: z.number().min(0).max(40).optional(),
  specializationIds: z.array(z.string()).default([]),
});

export async function createTeacherAction(
  rawInput: unknown
): Promise<ActionResult<{ id: string }>> {
  return validateAndExecute(CreateTeacherSchema, rawInput, async (input) => {
    const supabase = await createSupabaseServer();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const maxHours = input.maxWeeklyHours
      ?? EMPLOYMENT_TO_MAX_HOURS[input.employmentType];

    const { data: teacher, error } = await supabase
      .from('teachers')
      .insert({
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email ?? null,
        phone: input.phone ?? null,
        employment_type: input.employmentType,
        max_weekly_hours: maxHours,
        is_active: true,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create teacher: ${error.message}`);
    }

    if (input.specializationIds.length > 0) {
      const links = input.specializationIds.map((subjectId) => ({
        teacher_id: teacher.id,
        subject_id: subjectId,
      }));

      const { error: linkError } = await supabase
        .from('teacher_subjects')
        .insert(links);

      if (linkError) {
        throw new Error(`Failed to link specializations: ${linkError.message}`);
      }
    }

    return { id: teacher.id };
  });
}
```

---

## 7. Example Route Handler Implementation

```typescript
// app/api/export/xls/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { exportToExcel } from '@/features/reports/application/use-cases/export-to-excel';

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const schoolTypeId = searchParams.get('schoolTypeId');
  const schoolYear = searchParams.get('schoolYear');
  const reportType = searchParams.get('reportType');

  if (!schoolTypeId || !schoolYear || !reportType) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing required parameters: schoolTypeId, schoolYear, reportType',
        code: 'VALIDATION_ERROR',
      },
      { status: 400 }
    );
  }

  const result = await exportToExcel({
    schoolTypeId,
    schoolYear,
    reportType: reportType as 'compliance' | 'workload' | 'staffing' | 'organizational-sheet',
  });

  return new NextResponse(result.buffer, {
    headers: {
      'Content-Type': result.mimeType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    },
  });
}
```
