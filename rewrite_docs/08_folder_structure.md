# 08 — Folder Structure

## 1. Target File Tree

```
src/
├── app/                                    # Next.js App Router (ROUTING ONLY)
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                        # redirect to /dashboard
│   │   │
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   │
│   │   ├── przydzial/
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   │
│   │   ├── realizacja/
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   │
│   │   ├── dyspozycja/
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   │
│   │   ├── siatka-szkoly/
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   │
│   │   ├── nauczyciele/
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── klasy/
│   │   │   ├── page.tsx
│   │   │   ├── loading.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── przedmioty/
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   │
│   │   ├── szkoly/
│   │   │   └── page.tsx
│   │   │
│   │   ├── panel-admin/
│   │   │   └── page.tsx
│   │   │
│   │   ├── mapowania/
│   │   │   └── page.tsx
│   │   │
│   │   ├── plany-mein/
│   │   │   └── page.tsx
│   │   │
│   │   ├── import/
│   │   │   └── mein-pdf/
│   │   │       └── page.tsx
│   │   │
│   │   └── raporty/
│   │       ├── page.tsx
│   │       └── [typ]/
│   │           └── page.tsx
│   │
│   ├── api/                                # Route handlers (file ops only)
│   │   ├── import/
│   │   │   └── mein-pdf/
│   │   │       └── route.ts
│   │   ├── export/
│   │   │   └── xls/
│   │   │       └── route.ts
│   │   └── seed/
│   │       └── route.ts
│   │
│   ├── globals.css
│   ├── layout.tsx                          # Root layout
│   └── not-found.tsx
│
├── features/                               # FEATURE MODULES (vertical slices)
│   │
│   ├── assignment/                         # ★ CRITICAL — Assignment logic
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── assignment-task.ts
│   │   │   │   ├── assignment-result.ts
│   │   │   │   └── elective-hour-allocation.ts
│   │   │   ├── services/
│   │   │   │   ├── assignment-service.ts       # distributeAssignments()
│   │   │   │   ├── teacher-matching-service.ts # rankAvailableTeachers()
│   │   │   │   └── hour-allocation-service.ts  # fillUnassignedHours()
│   │   │   ├── ports/
│   │   │   │   ├── assignment-task-repository.ts
│   │   │   │   ├── teacher-availability-repository.ts
│   │   │   │   ├── schedule-repository.ts
│   │   │   │   └── elective-allocation-repository.ts
│   │   │   └── index.ts                    # Public API barrel export
│   │   │
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── generate-automatic-assignment.ts
│   │   │   │   ├── save-assignments.ts
│   │   │   │   ├── allocate-elective-hours.ts
│   │   │   │   ├── assign-extension-hours.ts
│   │   │   │   └── assign-teacher-to-subject.ts
│   │   │   ├── dto/
│   │   │   │   ├── generate-assignment.dto.ts
│   │   │   │   ├── save-assignments.dto.ts
│   │   │   │   └── allocate-electives.dto.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── infrastructure/
│   │   │   ├── supabase-assignment-task-repo.ts
│   │   │   ├── supabase-teacher-availability-repo.ts
│   │   │   ├── supabase-schedule-repo.ts
│   │   │   ├── supabase-elective-allocation-repo.ts
│   │   │   └── index.ts
│   │   │
│   │   └── presentation/
│   │       ├── actions.ts                  # Server Actions
│   │       ├── components/
│   │       │   ├── mein-plan-table.tsx
│   │       │   ├── assignment-toolbar.tsx
│   │       │   ├── assignment-result-panel.tsx
│   │       │   ├── hour-cell.tsx
│   │       │   ├── extension-selector.tsx
│   │       │   └── group-division-toggle.tsx
│   │       ├── hooks/
│   │       │   ├── use-assignment-state.ts
│   │       │   └── use-elective-allocation.ts
│   │       └── index.ts
│   │
│   ├── schedule/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── schedule-entry.ts
│   │   │   ├── ports/
│   │   │   │   └── schedule-entry-repository.ts
│   │   │   └── index.ts
│   │   ├── application/
│   │   │   └── use-cases/
│   │   │       ├── get-school-grid.ts
│   │   │       ├── update-schedule-entry.ts
│   │   │       └── delete-schedule-entry.ts
│   │   ├── infrastructure/
│   │   │   └── supabase-schedule-entry-repo.ts
│   │   └── presentation/
│   │       ├── actions.ts
│   │       └── components/
│   │           ├── school-grid-table.tsx
│   │           └── schedule-entry-form.tsx
│   │
│   ├── mein-compliance/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── mein-requirement.ts
│   │   │   ├── services/
│   │   │   │   └── mein-compliance-service.ts
│   │   │   └── ports/
│   │   │       └── mein-requirement-repository.ts
│   │   ├── application/
│   │   │   └── use-cases/
│   │   │       ├── calculate-school-compliance.ts
│   │   │       └── calculate-class-compliance.ts
│   │   ├── infrastructure/
│   │   │   └── supabase-mein-requirement-repo.ts
│   │   └── presentation/
│   │       ├── actions.ts
│   │       └── components/
│   │           └── compliance-results-table.tsx
│   │
│   ├── realization/
│   │   ├── domain/
│   │   │   └── services/
│   │   │       └── realization-service.ts
│   │   ├── application/
│   │   │   └── use-cases/
│   │   │       ├── get-realization.ts
│   │   │       └── update-realization.ts
│   │   ├── infrastructure/
│   │   │   └── supabase-realization-repo.ts
│   │   └── presentation/
│   │       ├── actions.ts
│   │       └── components/
│   │           ├── realization-grid.tsx
│   │           └── realization-tiles.tsx
│   │
│   ├── teachers/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── teacher.ts
│   │   │   └── ports/
│   │   │       └── teacher-repository.ts
│   │   ├── application/
│   │   │   └── use-cases/
│   │   │       ├── list-teachers.ts
│   │   │       ├── create-teacher.ts
│   │   │       ├── update-teacher.ts
│   │   │       └── get-teacher-workload.ts
│   │   ├── infrastructure/
│   │   │   └── supabase-teacher-repo.ts
│   │   └── presentation/
│   │       ├── actions.ts
│   │       └── components/
│   │           ├── teacher-list.tsx
│   │           ├── teacher-form.tsx
│   │           └── workload-bar.tsx
│   │
│   ├── classes/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── school-class.ts
│   │   │   └── ports/
│   │   │       └── class-repository.ts
│   │   ├── application/
│   │   │   └── use-cases/
│   │   │       ├── list-classes.ts
│   │   │       ├── create-class.ts
│   │   │       └── delete-class.ts
│   │   ├── infrastructure/
│   │   │   └── supabase-class-repo.ts
│   │   └── presentation/
│   │       ├── actions.ts
│   │       └── components/
│   │           ├── class-list.tsx
│   │           └── class-form.tsx
│   │
│   ├── subjects/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── subject.ts
│   │   │   └── ports/
│   │   │       └── subject-repository.ts
│   │   ├── application/
│   │   │   └── use-cases/
│   │   │       ├── list-subjects.ts
│   │   │       └── create-subject.ts
│   │   ├── infrastructure/
│   │   │   └── supabase-subject-repo.ts
│   │   └── presentation/
│   │       ├── actions.ts
│   │       └── components/
│   │           └── subject-form.tsx
│   │
│   ├── school-types/
│   │   ├── domain/
│   │   │   └── entities/
│   │   │       └── school-type.ts
│   │   ├── application/
│   │   │   └── use-cases/
│   │   │       └── list-school-types.ts
│   │   ├── infrastructure/
│   │   │   └── supabase-school-type-repo.ts
│   │   └── presentation/
│   │       └── actions.ts
│   │
│   ├── dashboard/
│   │   ├── domain/
│   │   │   └── services/
│   │   │       └── risk-indicator-service.ts
│   │   ├── application/
│   │   │   └── use-cases/
│   │   │       ├── get-dashboard-summary.ts
│   │   │       ├── calculate-risk-indicator.ts
│   │   │       └── get-dashboard-alerts.ts
│   │   ├── infrastructure/
│   │   │   └── supabase-dashboard-repo.ts
│   │   └── presentation/
│   │       ├── actions.ts
│   │       └── components/
│   │           ├── summary-cards.tsx
│   │           ├── risk-indicator-card.tsx
│   │           ├── compliance-chart.tsx
│   │           ├── workload-table.tsx
│   │           ├── alerts-list.tsx
│   │           ├── staffing-gaps-list.tsx
│   │           └── filter-cascade.tsx
│   │
│   ├── reports/
│   │   ├── application/
│   │   │   └── use-cases/
│   │   │       └── export-to-excel.ts
│   │   ├── infrastructure/
│   │   │   └── excel-generator.ts
│   │   └── presentation/
│   │       └── components/
│   │           └── report-hub.tsx
│   │
│   ├── import/
│   │   ├── application/
│   │   │   └── use-cases/
│   │   │       └── import-mein-pdf.ts
│   │   ├── infrastructure/
│   │   │   ├── pdf-extractor.ts
│   │   │   ├── pdf-table-extractor.ts
│   │   │   ├── ramowy-plan-parser.ts
│   │   │   ├── data-mapper.ts
│   │   │   └── validator.ts
│   │   └── presentation/
│   │       └── components/
│   │           └── import-mein-pdf-form.tsx
│   │
│   ├── qualifications/
│   │   ├── domain/
│   │   │   └── entities/
│   │   │       └── qualification.ts
│   │   ├── infrastructure/
│   │   │   └── supabase-qualification-repo.ts
│   │   └── presentation/
│   │       ├── actions.ts
│   │       └── components/
│   │           └── qualification-list.tsx
│   │
│   ├── professions/
│   │   ├── domain/
│   │   │   └── entities/
│   │   │       └── profession.ts
│   │   ├── infrastructure/
│   │   │   └── supabase-profession-repo.ts
│   │   └── presentation/
│   │       └── actions.ts
│   │
│   └── name-mappings/
│       ├── domain/
│       │   └── entities/
│       │       └── name-mapping.ts
│       ├── infrastructure/
│       │   └── supabase-name-mapping-repo.ts
│       └── presentation/
│           ├── actions.ts
│           └── components/
│               └── mapping-table.tsx
│
├── shared/                                 # Cross-feature shared code
│   ├── auth/
│   │   └── get-current-user.ts            # Server-side user helper
│   │
│   ├── ui/                                 # Reusable UI primitives
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── card.tsx
│   │   ├── skeleton.tsx
│   │   ├── badge.tsx
│   │   ├── dialog.tsx
│   │   ├── sidebar.tsx
│   │   ├── user-nav.tsx
│   │   └── toast.tsx
│   │
│   ├── hooks/
│   │   ├── use-debounce.ts
│   │   └── use-media-query.ts
│   │
│   ├── types/
│   │   ├── value-objects.ts               # EmploymentType, SubjectType, etc.
│   │   ├── supabase.ts                    # Auto-generated Supabase types
│   │   └── common.ts                      # Shared type utilities
│   │
│   └── utils/
│       ├── format.ts                      # Number/date formatting
│       └── cn.ts                          # Tailwind class merge utility
│
├── lib/                                    # Infrastructure bootstrapping
│   ├── supabase/
│   │   ├── server.ts                      # createSupabaseServer()
│   │   ├── client.ts                      # createSupabaseBrowser()
│   │   └── middleware.ts                  # updateSession()
│   │
│   ├── validation/
│   │   └── action-helpers.ts              # validateAndExecute()
│   │
│   └── errors/
│       ├── domain-errors.ts              # Error base classes
│       └── http-mapper.ts                # Error → HTTP status mapping
│
├── data/
│   └── ramowe-plany.json                  # Static MEiN reference plans
│
└── middleware.ts                            # Next.js middleware (auth session refresh)
```

---

## 2. Import Rules

### Dependency Direction (enforced by ESLint)

```
✅ ALLOWED:
  app/         → features/*/presentation/
  app/         → shared/
  app/         → lib/

  features/*/presentation/    → features/*/application/
  features/*/presentation/    → features/*/domain/
  features/*/presentation/    → shared/
  features/*/presentation/    → lib/

  features/*/application/     → features/*/domain/
  features/*/application/     → shared/types/
  features/*/application/     → lib/errors/

  features/*/infrastructure/  → features/*/domain/ports/
  features/*/infrastructure/  → shared/types/
  features/*/infrastructure/  → lib/supabase/

  features/*/domain/          → shared/types/   (value objects only)

  shared/                     → lib/

❌ FORBIDDEN:
  features/*/domain/          → lib/supabase/   (domain must be pure!)
  features/*/domain/          → features/*/infrastructure/
  features/*/domain/          → features/*/application/
  features/*/domain/          → features/*/presentation/
  features/A/                 → features/B/     (no cross-feature imports!)
  lib/                        → features/
  lib/                        → app/
```

### Cross-Feature Communication

When feature A needs data from feature B, there are two allowed patterns:

1. **Shared types**: Both features depend on a shared type in `shared/types/`.
2. **Use-case composition**: A higher-level use case (in `app/` or a coordinating feature) composes use cases from both features.

```typescript
// EXAMPLE: Dashboard composes data from multiple features
// app/(dashboard)/dashboard/page.tsx

import { getDashboardSummary } from '@/features/dashboard/application/use-cases/get-dashboard-summary';
// The use case internally calls repos that query schedule_entries, teachers, etc.
// It does NOT import from features/teachers/ directly.
```

---

## 3. tsconfig.json Paths

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "incremental": true,
    "noEmit": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"],
      "@/features/*": ["./src/features/*"],
      "@/shared/*": ["./src/shared/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/data/*": ["./src/data/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

---

## 4. Feature Module Checklist

Every feature module MUST have:

- [ ] `domain/entities/` — At least one entity or value type
- [ ] `domain/ports/` — Repository interface(s) if the feature touches the DB
- [ ] `domain/services/` — Domain service(s) if the feature has business logic
- [ ] `application/use-cases/` — At least one use case
- [ ] `infrastructure/` — Supabase repository implementation(s)
- [ ] `presentation/actions.ts` — Server Actions (if the feature has UI)
- [ ] `presentation/components/` — React components (if the feature has UI)
- [ ] `index.ts` barrel exports at each layer — public API of the module
