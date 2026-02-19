# 10 — Testing Strategy

## 1. Test Pyramid

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E╲         ~10 tests
                 ╱(Playwright)╲   Critical user flows
                ╱──────────────╲
               ╱  Integration   ╲   ~40 tests
              ╱  (Supabase +    ╲   Use cases + repos
             ╱   Server Actions) ╲
            ╱────────────────────╲
           ╱      Unit Tests      ╲   ~200+ tests
          ╱  (Domain services,     ╲  Pure functions,
         ╱   Value objects,         ╲ Golden tests
        ╱   Parity tests)           ╲
       ╱──────────────────────────────╲
```

| Layer | Count | Speed | What |
|---|---|---|---|
| **Unit** | 200+ | < 1s each | Domain services, value objects, parity tests, utilities |
| **Integration** | ~40 | 1-5s each | Use cases with real Supabase, Server Actions, repo implementations |
| **E2E** | ~10 | 10-30s each | Critical user flows via Playwright |

---

## 2. Unit Tests

### 2.1 Framework: Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'src/features/**/domain/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/features/**/domain/**/*.ts'],
      thresholds: {
        branches: 90,
        functions: 95,
        lines: 95,
        statements: 95,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

### 2.2 Domain Service Tests

```typescript
// tests/unit/assignment/distribute-assignments.test.ts

import { describe, it, expect } from 'vitest';
import { distributeAssignments } from '@/features/assignment/domain/services/assignment-service';

describe('distributeAssignments', () => {
  const defaultParams = {
    schoolYear: '2024/2025',
    requireQualifications: false,
    maxOverload: 0,
    preferContinuity: true,
    minimumWorkload: 0,
  };

  it('returns empty result for zero tasks', () => {
    const result = distributeAssignments([], [], new Set(), new Map(), defaultParams);

    expect(result.assignments).toHaveLength(0);
    expect(result.staffingGaps).toHaveLength(0);
    expect(result.metrics.totalTasks).toBe(0);
  });

  it('assigns single task to single teacher', () => {
    const tasks = [createTask({ id: '1', weeklyHours: 2 })];
    const teachers = [createTeacher({ teacherId: 't1', maxWeeklyHours: 18 })];

    const result = distributeAssignments(
      tasks, teachers, new Set(), new Map(), defaultParams
    );

    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0].teacherId).toBe('t1');
    expect(result.assignments[0].weeklyHours).toBe(2);
  });

  it('reports staffing gap when no teachers available', () => {
    const tasks = [createTask({ id: '1', weeklyHours: 2 })];

    const result = distributeAssignments(
      tasks, [], new Set(), new Map(), defaultParams
    );

    expect(result.assignments).toHaveLength(0);
    expect(result.staffingGaps).toHaveLength(1);
    expect(result.staffingGaps[0].reason).toBe('Brak aktywnych nauczycieli');
  });

  it('balances workload across teachers', () => {
    const tasks = [
      createTask({ id: '1', weeklyHours: 4 }),
      createTask({ id: '2', weeklyHours: 4 }),
      createTask({ id: '3', weeklyHours: 4 }),
    ];
    const teachers = [
      createTeacher({ teacherId: 't1', maxWeeklyHours: 18 }),
      createTeacher({ teacherId: 't2', maxWeeklyHours: 18 }),
      createTeacher({ teacherId: 't3', maxWeeklyHours: 18 }),
    ];

    const result = distributeAssignments(
      tasks, teachers, new Set(), new Map(), defaultParams
    );

    expect(result.assignments).toHaveLength(3);
    const teacherIds = result.assignments.map((a) => a.teacherId);
    expect(new Set(teacherIds).size).toBe(3);
  });

  it('skips locked entries', () => {
    const tasks = [
      createTask({ id: 's1-c1', subjectId: 's1', classId: 'c1', weeklyHours: 2 }),
    ];
    const teachers = [createTeacher({ teacherId: 't1' })];
    const locked = new Set(['s1-c1']);

    const result = distributeAssignments(
      tasks, teachers, locked, new Map(), defaultParams
    );

    expect(result.assignments).toHaveLength(0);
    expect(result.staffingGaps).toHaveLength(0);
  });

  it('prefers teacher with continuity when preferContinuity is true', () => {
    // Teacher t1 already teaches this subject (has existing assignment)
    // Teacher t2 has lower workload
    // With continuity preference, t1 should be chosen
    const tasks = [
      createTask({ id: 'task1', subjectId: 's1', weeklyHours: 2 }),
      createTask({ id: 'task2', subjectId: 's1', weeklyHours: 2 }),
    ];
    const teachers = [
      createTeacher({ teacherId: 't1', maxWeeklyHours: 18 }),
      createTeacher({ teacherId: 't2', maxWeeklyHours: 18 }),
    ];

    const result = distributeAssignments(
      tasks, teachers, new Set(), new Map(), defaultParams
    );

    // First task goes to t1 (lower index, equal workload)
    // Second task: t1 has continuity bonus for same subject
    expect(result.assignments[0].teacherId).toBe('t1');
    expect(result.assignments[1].teacherId).toBe('t1');
  });
});
```

### 2.3 Value Object Tests

```typescript
// tests/unit/shared/value-objects.test.ts

import { describe, it, expect } from 'vitest';
import { parseSchoolYear, EMPLOYMENT_TO_MAX_HOURS } from '@/shared/types/value-objects';

describe('parseSchoolYear', () => {
  it('accepts valid format "2024/2025"', () => {
    const result = parseSchoolYear('2024/2025');
    expect(result).toEqual({ value: '2024/2025' });
  });

  it('rejects "2024-2025"', () => {
    expect(parseSchoolYear('2024-2025')).toBeNull();
  });

  it('rejects empty string', () => {
    expect(parseSchoolYear('')).toBeNull();
  });
});

describe('EMPLOYMENT_TO_MAX_HOURS', () => {
  it('pelny = 18', () => {
    expect(EMPLOYMENT_TO_MAX_HOURS.pelny).toBe(18);
  });

  it('pol = 9', () => {
    expect(EMPLOYMENT_TO_MAX_HOURS.pol).toBe(9);
  });

  it('czwarty = 4.5', () => {
    expect(EMPLOYMENT_TO_MAX_HOURS.czwarty).toBe(4.5);
  });

  it('osiemnasty = 1', () => {
    expect(EMPLOYMENT_TO_MAX_HOURS.osiemnasty).toBe(1);
  });
});
```

### 2.4 Hour Allocation Tests

```typescript
// tests/unit/assignment/fill-unassigned-hours.test.ts

import { describe, it, expect } from 'vitest';
import { fillUnassignedHours } from '@/features/assignment/domain/services/hour-allocation-service';

describe('fillUnassignedHours', () => {
  it('returns copy of current when grades empty', () => {
    const result = fillUnassignedHours({ I: 2 }, 5, []);
    expect(result).toEqual({ I: 2 });
  });

  it('returns copy when totalRequired <= 0', () => {
    const result = fillUnassignedHours({ I: 2 }, 0, ['I', 'II']);
    expect(result).toEqual({ I: 2 });
  });

  it('distributes evenly across grades', () => {
    const result = fillUnassignedHours({}, 4, ['I', 'II', 'III', 'IV']);
    expect(result).toEqual({ I: 1, II: 1, III: 1, IV: 1 });
  });

  it('distributes 5 across 4 grades as [2,1,1,1]', () => {
    const result = fillUnassignedHours({}, 5, ['I', 'II', 'III', 'IV']);
    const values = Object.values(result).sort();
    expect(values).toEqual([1, 1, 1, 2]);
  });

  it('preserves existing assignments and fills remainder', () => {
    const result = fillUnassignedHours({ I: 3 }, 5, ['I', 'II', 'III']);
    expect(result.I).toBe(3);
    expect(result.II! + result.III!).toBe(2);
  });

  it('does not add if already >= totalRequired', () => {
    const result = fillUnassignedHours({ I: 3, II: 3 }, 5, ['I', 'II']);
    expect(result).toEqual({ I: 3, II: 3 });
  });
});
```

### 2.5 Golden / Parity Tests

See `09_assignment_equivalence_plan.md` for details. These tests use fixtures extracted from the old system.

```
tests/
├── fixtures/
│   ├── golden-fixtures.json          # Full production-like fixture
│   ├── golden-f1-empty.json          # Edge case: empty school
│   ├── golden-f2-single.json         # Single teacher/class/subject
│   └── ...
├── parity/
│   ├── assignment-parity.test.ts     # distributeAssignments parity
│   ├── compliance-parity.test.ts     # calculateCompliance parity
│   ├── realization-parity.test.ts    # calculateRealization parity
│   ├── risk-parity.test.ts           # calculateRiskIndicator parity
│   └── hour-allocation-parity.test.ts
└── properties/
    └── assignment-properties.test.ts # Property-based tests
```

---

## 3. Integration Tests

### 3.1 Setup: Supabase Test Project

Use a dedicated Supabase test project (or local Supabase via Docker) for integration tests.

```typescript
// tests/integration/setup.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.TEST_SUPABASE_URL!,
  process.env.TEST_SUPABASE_SERVICE_KEY!
);

export async function resetTestDatabase() {
  // Truncate all tables in reverse dependency order
  await supabase.rpc('truncate_all_test_tables');
}

export async function seedTestData() {
  // Insert minimal test data
  await supabase.from('school_types').insert([
    { name: 'Liceum ogólnokształcące', cycle_years: 4, mein_code: 'LO' },
  ]);
  // ... more seeding
}

export { supabase };
```

### 3.2 Repository Integration Tests

```typescript
// tests/integration/repos/supabase-teacher-repo.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { resetTestDatabase, seedTestData, supabase } from '../setup';
import { SupabaseTeacherRepository } from '@/features/teachers/infrastructure/supabase-teacher-repo';

describe('SupabaseTeacherRepository', () => {
  const repo = new SupabaseTeacherRepository(supabase);

  beforeEach(async () => {
    await resetTestDatabase();
    await seedTestData();
  });

  it('findAllActive returns only active teachers', async () => {
    const teachers = await repo.findAllActive();
    expect(teachers.every((t) => t.isActive)).toBe(true);
  });

  it('create inserts a teacher and returns id', async () => {
    const id = await repo.create({
      firstName: 'Test',
      lastName: 'Teacher',
      employmentType: 'pelny',
      maxWeeklyHours: 18,
    });
    expect(id).toBeDefined();
  });
});
```

### 3.3 Use Case Integration Tests

```typescript
// tests/integration/use-cases/generate-assignment.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { resetTestDatabase, supabase } from '../setup';
import { generateAutomaticAssignment } from '@/features/assignment/application/use-cases/generate-automatic-assignment';

describe('GenerateAutomaticAssignment (integration)', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    // Seed: 3 teachers, 2 classes, 5 subjects, MEiN requirements
    await seedAssignmentTestData(supabase);
  });

  it('generates assignments for all subjects with available teachers', async () => {
    const result = await generateAutomaticAssignment(
      {
        schoolYear: '2024/2025',
        requireQualifications: false,
        maxOverload: 0,
        preferContinuity: true,
        minimumWorkload: 0,
      },
      createRepositories(supabase)
    );

    expect(result.assignments.length).toBeGreaterThan(0);
    expect(result.metrics.successfulAssignments).toBeGreaterThan(0);
  });
});
```

---

## 4. E2E Tests (Playwright)

### 4.1 Setup

```typescript
// playwright.config.ts

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    storageState: 'tests/e2e/.auth/user.json',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
      dependencies: ['setup'],
    },
  ],
});
```

### 4.2 Auth Setup

```typescript
// tests/e2e/auth.setup.ts

import { test as setup, expect } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@edugrid.pl');
  await page.fill('[name="password"]', 'TestPassword123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
  await page.context().storageState({ path: 'tests/e2e/.auth/user.json' });
});
```

### 4.3 Critical Flow Tests

```typescript
// tests/e2e/assignment-flow.test.ts

import { test, expect } from '@playwright/test';

test.describe('Assignment flow', () => {
  test('director can generate and view elective hour assignment', async ({ page }) => {
    await page.goto('/przydzial');

    // Select school type and year
    await page.selectOption('[data-testid="school-type-select"]', { index: 1 });
    await page.selectOption('[data-testid="school-year-select"]', { index: 0 });
    await page.selectOption('[data-testid="class-select"]', { index: 0 });

    // Wait for table to load
    await expect(page.locator('[data-testid="mein-plan-table"]')).toBeVisible();

    // Click generate
    await page.click('[data-testid="generate-assignment-btn"]');

    // Wait for success message
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible({
      timeout: 10_000,
    });

    // Verify cells have values
    const cells = page.locator('[data-testid="hour-cell"]');
    const count = await cells.count();
    expect(count).toBeGreaterThan(0);
  });
});

// tests/e2e/teacher-management.test.ts

test.describe('Teacher management', () => {
  test('admin can create a teacher', async ({ page }) => {
    await page.goto('/panel-admin');

    await page.fill('[name="firstName"]', 'Nowy');
    await page.fill('[name="lastName"]', 'Nauczyciel');
    await page.selectOption('[name="employmentType"]', 'pelny');

    await page.click('[data-testid="add-teacher-btn"]');

    await expect(page.locator('text=Nowy Nauczyciel')).toBeVisible();
  });
});

// tests/e2e/dashboard.test.ts

test.describe('Dashboard', () => {
  test('dashboard loads with summary cards', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.locator('[data-testid="summary-cards"]')).toBeVisible();
    await expect(page.locator('[data-testid="risk-indicator"]')).toBeVisible();
  });
});
```

---

## 5. CI Pipeline

```yaml
# .github/workflows/ci.yml

name: CI
on: [push, pull_request]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:parity

  integration-tests:
    runs-on: ubuntu-latest
    env:
      TEST_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
      TEST_SUPABASE_SERVICE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    env:
      TEST_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
      TEST_SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npm run test:e2e

  build:
    runs-on: ubuntu-latest
    needs: [lint-and-typecheck]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
```

### npm scripts

```json
{
  "scripts": {
    "test:unit": "vitest run --config vitest.config.ts",
    "test:parity": "vitest run tests/parity/",
    "test:integration": "vitest run tests/integration/",
    "test:e2e": "playwright test",
    "test:all": "npm run test:unit && npm run test:parity && npm run test:integration && npm run test:e2e",
    "test:watch": "vitest --config vitest.config.ts",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix"
  }
}
```
