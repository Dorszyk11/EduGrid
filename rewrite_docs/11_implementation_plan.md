# 11 — Implementation Plan

## Overview

The rewrite is split into **8 phases**. Each phase ends with passing tests and a demoable slice. The team can work on multiple features in parallel within a phase, but phase boundaries are sequential (phase N must pass before phase N+1 begins).

**Estimated total duration**: 8-12 weeks (2-3 developers)

---

## Phase 0: Foundation & Scaffolding (Week 1)

**Goal**: Set up the new project structure, tooling, and infrastructure so all subsequent work has a solid base.

- [ ] Initialize Next.js 15+ project with TypeScript strict mode
- [ ] Configure `tsconfig.json` with absolute imports (`@/features/*`, `@/shared/*`, `@/lib/*`)
- [ ] Set up Tailwind CSS 4
- [ ] Set up ESLint flat config with import rules (enforce dependency direction)
- [ ] Set up Prettier (120 char line length)
- [ ] Set up Vitest for unit tests
- [ ] Set up Playwright for e2e tests
- [ ] Create `src/lib/supabase/` — server, client, middleware factories
- [ ] Create `src/lib/errors/` — domain error base classes, HTTP mapper
- [ ] Create `src/lib/validation/` — `validateAndExecute` helper
- [ ] Create `src/shared/types/` — value objects (`EmploymentType`, `SubjectType`, etc.)
- [ ] Create `src/shared/ui/` — basic UI primitives (button, input, select, card, skeleton, table)
- [ ] Create `src/middleware.ts` — auth session refresh
- [ ] Create root layout with Tailwind + fonts
- [ ] Create `src/data/ramowe-plany.json` (copy from old project)
- [ ] Set up Supabase test project for integration tests
- [ ] Create empty folder structure for all 15 feature modules

**Exit Criteria**: `npm run build` succeeds. `npm run lint` passes. `npm run typecheck` passes. Empty pages render.

---

## Phase 1: Database Schema & Auth (Week 2)

**Goal**: Create the new Supabase schema, RLS policies, and implement authentication.

- [ ] Write SQL migration: create all tables (see `05_supabase_design.md`)
- [ ] Apply migration to Supabase test project
- [ ] Write SQL: RLS policies for all tables
- [ ] Write SQL: helper functions (`get_user_role`, `has_role`, `set_updated_at` trigger)
- [ ] Write SQL: auto-create profile trigger
- [ ] Generate Supabase types: `npx supabase gen types typescript`
- [ ] Implement `src/shared/auth/get-current-user.ts`
- [ ] Implement login page (`app/(auth)/login/page.tsx`)
- [ ] Implement register functionality
- [ ] Implement logout
- [ ] Implement dashboard layout with sidebar (`app/(dashboard)/layout.tsx`)
- [ ] Implement `RedirectIfNotAuthenticated` via middleware
- [ ] Write integration tests: login, register, session refresh, role-based access

**Exit Criteria**: User can register, login, see dashboard shell, logout. RLS policies work. All auth integration tests pass.

---

## Phase 2: Core CRUD Features (Week 3-4)

**Goal**: Implement all basic CRUD operations for core entities.

### School Types (`features/school-types/`)
- [ ] Domain: `SchoolType` entity
- [ ] Infrastructure: `SupabaseSchoolTypeRepository`
- [ ] Application: `ListSchoolTypes`, `CreateSchoolType`, `UpdateSchoolType`, `DeleteSchoolType`
- [ ] Presentation: Server Actions + admin panel UI
- [ ] Tests: Integration tests for CRUD

### Subjects (`features/subjects/`)
- [ ] Domain: `Subject` entity, `SubjectType`, `SubjectLevel` value objects
- [ ] Infrastructure: `SupabaseSubjectRepository`
- [ ] Application: `ListSubjects`, `CreateSubject`, `UpdateSubject`
- [ ] Presentation: Server Actions + admin panel UI + `/przedmioty/:id` page
- [ ] Tests: Integration tests

### Classes (`features/classes/`)
- [ ] Domain: `SchoolClass` entity, `extractClassNumber()`, year range validation
- [ ] Infrastructure: `SupabaseClassRepository`
- [ ] Application: `ListClasses`, `CreateClass`, `UpdateClass`, `DeleteClass`
- [ ] Presentation: Server Actions + `/klasy` list + `/klasy/:id` detail
- [ ] Tests: Integration tests (including owner-based access)

### Teachers (`features/teachers/`)
- [ ] Domain: `Teacher` entity, `employmentType → maxWeeklyHours` mapping
- [ ] Infrastructure: `SupabaseTeacherRepository` (with specializations join)
- [ ] Application: `ListTeachers`, `CreateTeacher`, `UpdateTeacher`, `GetTeacherWorkload`
- [ ] Presentation: Server Actions + `/nauczyciele` list + `/nauczyciele/:id` detail
- [ ] Tests: Unit (etat mapping) + Integration (CRUD + workload)

### Qualifications (`features/qualifications/`)
- [ ] Domain: `Qualification` entity
- [ ] Infrastructure: `SupabaseQualificationRepository`
- [ ] Application: `ListQualifications`, `AddQualification`, `RemoveQualification`
- [ ] Presentation: Server Actions + qualification list on teacher detail page
- [ ] Tests: Integration (uniqueness constraint)

### Professions (`features/professions/`)
- [ ] Domain: `Profession` entity
- [ ] Infrastructure: `SupabaseProfessionRepository`
- [ ] Application: `ListProfessions`, `CreateProfession`
- [ ] Presentation: Server Actions
- [ ] Tests: Integration

### Name Mappings (`features/name-mappings/`)
- [ ] Domain: `NameMapping` entity
- [ ] Infrastructure: `SupabaseNameMappingRepository`
- [ ] Application: CRUD use cases
- [ ] Presentation: `/mapowania` page
- [ ] Tests: Integration

**Exit Criteria**: Admin can manage school types, subjects, classes, teachers, qualifications, professions, and name mappings. All CRUD integration tests pass. All list pages show data. Detail pages render.

---

## Phase 3: Assignment Logic — Extract & Test (Week 4-5) ★ CRITICAL

**Goal**: Extract, isolate, and exhaustively test the assignment domain logic.

- [ ] Extract golden test fixtures from old system (run script against production data)
- [ ] Copy old `automatycznyRozdzialGodzin.ts` into `tests/__legacy__/`
- [ ] Copy old `przypisywanieNauczycieli.ts` into `tests/__legacy__/`
- [ ] Copy old `realizacjaZPrzydzialu.ts` into `tests/__legacy__/`
- [ ] Copy old `zgodnoscMein.ts` into `tests/__legacy__/`
- [ ] Copy old `wskaznikRyzyka.ts` into `tests/__legacy__/`
- [ ] Copy old `weryfikacjaSum.ts` into `tests/__legacy__/`
- [ ] Implement `distributeAssignments()` as a pure function
- [ ] Implement `rankAvailableTeachers()` as a pure function
- [ ] Implement `fillUnassignedHours()` as a pure function
- [ ] Write golden tests for `distributeAssignments()` (all F1-F10 fixtures)
- [ ] Write parity tests (old vs new side-by-side comparison)
- [ ] Write property-based tests (invariants)
- [ ] Write edge case tests (all E1-E18 from equivalence plan)
- [ ] Implement `SupabaseAssignmentTaskRepository` (batch-loads tasks with JOINs)
- [ ] Implement `SupabaseTeacherAvailabilityRepository` (batch-loads teachers + workloads)
- [ ] Implement `SupabaseScheduleRepository` (locked entries, save assignments)
- [ ] Implement `SupabaseElectiveAllocationRepository`

**Exit Criteria**: ALL golden tests pass. ALL parity tests pass. ALL property-based tests pass. Assignment domain is 100% unit-tested. No Payload/Supabase imports in domain layer.

---

## Phase 4: Assignment UI & Workflows (Week 5-6)

**Goal**: Implement the assignment UI and all assignment workflows.

- [ ] Implement `GenerateAutomaticAssignment` use case
- [ ] Implement `SaveAssignments` use case
- [ ] Implement `AllocateElectiveHours` use case
- [ ] Implement `AssignExtensionHours` use case
- [ ] Implement `AssignTeacherToSubject` use case
- [ ] Implement Server Actions for all assignment use cases
- [ ] Build `MeinPlanTable` component (interactive, modes: assign, director, extensions, groups, remove)
- [ ] Build `AssignmentToolbar` component
- [ ] Build `AssignmentResultPanel` component
- [ ] Build `HourCell`, `ExtensionSelector`, `GroupDivisionToggle` components
- [ ] Implement `/przydzial` page
- [ ] Implement `/dyspozycja` page
- [ ] Integration tests: generate assignment, save, allocate electives
- [ ] E2E test: full assignment flow

**Exit Criteria**: User can generate automatic assignment, view results, save to DB. User can manually assign hours via MEiN plan table. All modes work (choose hours, director, extensions, groups). E2E test passes.

---

## Phase 5: Compliance, Realization, Schedule (Week 6-7)

**Goal**: Implement MEiN compliance, realization tracking, and school grid.

### MEiN Compliance (`features/mein-compliance/`)
- [ ] Implement `calculateCompliance()` pure function
- [ ] Parity tests for `calculateCompliance()` vs old `obliczZgodnoscMein()`
- [ ] Implement use cases: `CalculateSchoolCompliance`, `CalculateClassCompliance`
- [ ] Implement `SupabaseMeinRequirementRepository`
- [ ] Server Actions
- [ ] Compliance results table component

### Realization (`features/realization/`)
- [ ] Implement `calculateRealization()` pure function
- [ ] Parity tests vs old `obliczRealizacjaZPrzydzialu()`
- [ ] Implement use cases: `GetRealization`, `UpdateRealization`
- [ ] Build realization grid component (click to mark hours)
- [ ] Implement `/realizacja` page
- [ ] Server Actions

### Schedule (`features/schedule/`)
- [ ] Implement `GetSchoolGrid` use case
- [ ] Implement `UpdateScheduleEntry`, `DeleteScheduleEntry` use cases
- [ ] Build school grid table component (subjects × classes matrix)
- [ ] Implement `/siatka-szkoly` page
- [ ] Server Actions

### Hour Sum Verification
- [ ] Implement `verifyHourSums()` pure function
- [ ] Parity tests vs old `weryfikujSumyGodzin()`

**Exit Criteria**: Compliance page shows correct data matching old system. Realization grid works. School grid shows all entries. All parity tests pass.

---

## Phase 6: Dashboard, Reports, Import (Week 7-8)

**Goal**: Implement dashboard analytics, reports, PDF import, and Excel export.

### Dashboard (`features/dashboard/`)
- [ ] Implement `calculateRiskIndicator()` pure function
- [ ] Parity tests vs old `obliczWskaznikRyzyka()`
- [ ] Implement use cases: `GetDashboardSummary`, `CalculateRiskIndicator`, `GetAlerts`, `GetStaffingGaps`
- [ ] Build dashboard components: SummaryCards, RiskIndicatorCard, ComplianceChart, WorkloadTable, AlertsList, StaffingGapsList, FilterCascade
- [ ] Implement `/dashboard` page with Suspense boundaries

### Reports (`features/reports/`)
- [ ] Implement `ExportToExcel` use case
- [ ] Excel generator (using `xlsx` library)
- [ ] Build reports hub page
- [ ] Route handler: `GET /api/export/xls`

### Import (`features/import/`)
- [ ] Port PDF extraction pipeline (pdf-parse, pdfjs-dist, tesseract.js)
- [ ] Port data mapper and validator
- [ ] Implement `ImportMeinPdf` use case
- [ ] Build import page UI
- [ ] Route handler: `POST /api/import/mein-pdf`

**Exit Criteria**: Dashboard shows all widgets with correct data. Risk indicator matches old behavior. Excel export works. PDF import works.

---

## Phase 7: Polish & Performance (Week 8-9)

**Goal**: Performance optimization, UI polish, responsive design, final testing.

- [ ] Performance audit: run Lighthouse, check Web Vitals
- [ ] Optimize slow queries (add missing indexes, batch operations)
- [ ] Implement virtualization for large tables (MeinPlanTable with 100+ rows)
- [ ] Add loading skeletons for all pages
- [ ] Add error boundaries for all route segments
- [ ] Mobile responsive: sidebar toggle, table scrolling, compact layouts
- [ ] Keyboard navigation for interactive tables
- [ ] Toast notifications for mutations (success/error)
- [ ] Implement admin panel (`/panel-admin`) with role-based visibility
- [ ] Implement MEiN plans viewer (`/plany-mein`)
- [ ] Implement school types page (`/szkoly`)
- [ ] Full E2E test suite (all 10 critical flows)
- [ ] Cross-browser testing (Chrome, Firefox, Safari)

**Exit Criteria**: Lighthouse score > 90 on all metrics. All pages responsive. All E2E tests pass. No UI freezes under realistic data load.

---

## Phase 8: Data Migration & Cleanup (Week 9-10)

**Goal**: Migrate production data, verify parity, remove legacy code.

- [ ] Write data migration scripts (Payload tables → new schema)
- [ ] Run migration against staging Supabase project
- [ ] Run full parity test suite against migrated data
- [ ] Verify all pages show correct data post-migration
- [ ] Remove Payload CMS from `package.json`
- [ ] Remove old `src/collections/` directory
- [ ] Remove old `payload.config.ts`
- [ ] Remove old `src/utils/` (replaced by feature domain services)
- [ ] Remove old `src/app/api/` routes (replaced by Server Actions)
- [ ] Remove old component files
- [ ] Final full test run (unit + parity + integration + e2e)
- [ ] Update README with new architecture docs
- [ ] Deploy to production

**Exit Criteria**: Production deployment successful. All features work. No references to Payload CMS. All tests pass. README updated.

---

## Phase Summary

| Phase | Duration | Focus | Key Deliverable |
|---|---|---|---|
| 0 | 1 week | Scaffolding | Project structure, tooling, CI |
| 1 | 1 week | Schema + Auth | Database, RLS, login/register |
| 2 | 2 weeks | Core CRUD | All entity management pages |
| 3 | 1-2 weeks | Assignment logic ★ | Pure domain functions + golden tests |
| 4 | 1-2 weeks | Assignment UI | Interactive assignment page |
| 5 | 1-2 weeks | Compliance + Realization | Compliance checks, realization grid, school grid |
| 6 | 1-2 weeks | Dashboard + Reports + Import | Analytics, Excel, PDF import |
| 7 | 1 week | Polish + Performance | Optimization, responsiveness, final testing |
| 8 | 1 week | Migration + Cleanup | Data migration, remove legacy, deploy |
