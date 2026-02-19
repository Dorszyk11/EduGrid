# 02 — Feature Map

## Feature Modules Overview

Each feature module is a vertical slice that owns its domain logic, use cases, infrastructure adapters, and UI components. Cross-feature dependencies go through well-defined shared interfaces.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FEATURE MODULES                            │
│                                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────┐ │
│  │ assignment   │ │ schedule    │ │ mein-       │ │ realization  │ │
│  │ ★ CRITICAL  │ │             │ │ compliance  │ │              │ │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬───────┘ │
│         │               │               │               │         │
│  ┌──────┴──────┐ ┌──────┴──────┐ ┌──────┴──────┐ ┌──────┴───────┐ │
│  │ teachers    │ │ classes     │ │ subjects    │ │ school-types │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────────┘ │
│                                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────┐ │
│  │ dashboard   │ │ reports     │ │ import      │ │ qualific-    │ │
│  │             │ │ + export    │ │ (PDF)       │ │ ations       │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────────┘ │
│                                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                  │
│  │ professions │ │ name-       │ │ auth        │                  │
│  │ (zawody)    │ │ mappings    │ │ (shared)    │                  │
│  └─────────────┘ └─────────────┘ └─────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. `assignment` — Przydział godzin (★ CRITICAL)

**Responsibility**: Automatic and manual assignment of teaching hours to teachers for classes/subjects. This is the core business logic of the entire application.

| Aspect | Details |
|---|---|
| **Pages/Routes** | `/przydzial` — main assignment page with MEiN plan table |
| **Sub-features** | Hours-to-choose allocation, director hours, extensions, group division |
| **Domain Services** | `AssignmentService` (automatic distribution), `HourAllocationService` (fill unassigned hours) |
| **Use Cases** | `GenerateAutomaticAssignment`, `SaveAssignments`, `AllocateElectiveHours`, `AssignExtensionHours`, `DivideIntoGroups` |
| **Data Touched** | `rozkład_godzin`, `przydzial_godzin_wybor`, `nauczyciele`, `klasy`, `przedmioty`, `siatki_godzin_mein`, `kwalifikacje` |
| **APIs** | `POST /api/assignment/generate`, `POST /api/assignment/save`, `POST /api/assignment/allocate-electives`, `POST /api/assignment/assign-extensions` |
| **Contains Assignment Logic** | **YES** — `AssignmentService.distribute()`, `HourAllocationService.fillUnassigned()` |
| **Policies** | Authenticated + role `dyrektor` or `admin` |
| **Tests** | Golden tests (parity), property-based tests, unit tests for every sorting/tie-breaking rule |

### Key Assignment Logic Locations (from old code)

| Old File | New Location | Pure? |
|---|---|---|
| `utils/automatycznyRozdzialGodzin.ts` | `features/assignment/domain/services/assignment-service.ts` | YES |
| `utils/przypisywanieNauczycieli.ts` | `features/assignment/domain/services/teacher-matching-service.ts` | YES |
| `api/przydzial/generuj/route.ts` | `features/assignment/application/use-cases/allocate-elective-hours.ts` | Application layer |
| `api/przydzial/zapisz/route.ts` | `features/assignment/application/use-cases/save-assignments.ts` | Application layer |
| `api/przydzial/przydziel-godziny-rozszerzen/route.ts` | `features/assignment/application/use-cases/assign-extension-hours.ts` | Application layer |
| `api/przydzial-godzin-wybor/route.ts` | `features/assignment/infrastructure/supabase-elective-repo.ts` | Infrastructure |
| `api/dyspozycja/przydziel/route.ts` | `features/assignment/application/use-cases/assign-teacher-to-subject.ts` | Application layer |

---

## 2. `schedule` — Rozkład godzin

**Responsibility**: CRUD for hour schedules (the `rozkład_godzin` table). Viewing and editing individual subject-class-teacher-hour records.

| Aspect | Details |
|---|---|
| **Pages/Routes** | `/siatka-szkoly` — school-wide grid (subjects × classes), `/dyspozycja` — teacher assignment/disposition |
| **Domain** | `Schedule` entity, semester validation invariants |
| **Use Cases** | `GetSchoolGrid`, `UpdateScheduleEntry`, `LockScheduleEntry`, `RemoveScheduleEntry` |
| **Data Touched** | `rozkład_godzin`, `klasy`, `przedmioty`, `nauczyciele` |
| **APIs** | `GET /api/schedule/grid`, `PUT /api/schedule/:id`, `DELETE /api/schedule/:id` |
| **Policies** | Authenticated; `dyrektor`/`admin` for mutations |
| **Tests** | Unit (semester sum validation), integration (CRUD) |

---

## 3. `mein-compliance` — Zgodność MEiN

**Responsibility**: Calculating and displaying compliance between school's planned hours and MEiN ministry requirements.

| Aspect | Details |
|---|---|
| **Pages/Routes** | Part of `/dashboard`, `/raporty/zgodnosc-mein` |
| **Domain Services** | `MeinComplianceService` (pure calculation) |
| **Use Cases** | `CalculateCompliance`, `CalculateComplianceForSchool`, `CalculateComplianceForClass` |
| **Data Touched** | `siatki_godzin_mein`, `rozkład_godzin`, `klasy`, `przedmioty`, `typy_szkol` |
| **APIs** | `GET /api/compliance/school/:schoolTypeId`, `GET /api/compliance/class/:classId` |
| **Contains Assignment Logic** | Partially — compliance checks are inputs to the risk indicator |
| **Policies** | Authenticated; read-only for all roles |
| **Tests** | Unit (compliance calculation parity), snapshot tests |

---

## 4. `realization` — Realizacja

**Responsibility**: Tracking planned vs. actually delivered teaching hours. Interactive grid for marking realization.

| Aspect | Details |
|---|---|
| **Pages/Routes** | `/realizacja` |
| **Domain Services** | `RealizationCalculator` (pure — percentage, shortages, surpluses) |
| **Use Cases** | `GetRealizationData`, `UpdateRealization`, `CalculateRealizationStats` |
| **Data Touched** | `przydzial_godzin_wybor` (realizacja JSON field), `ramowe-plany.json` |
| **APIs** | `GET /api/realization/:classId`, `PUT /api/realization/:classId` |
| **Contains Assignment Logic** | YES — `obliczRealizacjaZPrzydzialu` must produce identical outputs |
| **Policies** | Authenticated; `dyrektor`/`admin` for mutations |
| **Tests** | Golden tests (parity with old `realizacjaZPrzydzialu.ts`) |

---

## 5. `teachers` — Nauczyciele

**Responsibility**: Teacher management — CRUD, workload tracking, specializations.

| Aspect | Details |
|---|---|
| **Pages/Routes** | `/nauczyciele`, `/nauczyciele/:id` |
| **Domain** | `Teacher` entity, `EmploymentType` value object, workload invariants |
| **Use Cases** | `ListTeachers`, `GetTeacher`, `CreateTeacher`, `UpdateTeacher`, `GetTeacherWorkload` |
| **Data Touched** | `nauczyciele`, `rozkład_godzin`, `kwalifikacje`, `przedmioty` |
| **APIs** | `GET /api/teachers`, `GET /api/teachers/:id`, `POST /api/teachers`, `PUT /api/teachers/:id`, `GET /api/teachers/:id/workload` |
| **Policies** | Authenticated; `admin` for create/delete; `dyrektor`/`admin` for update |
| **Tests** | Unit (etat → max_obciazenie mapping), integration (CRUD) |

---

## 6. `classes` — Klasy

**Responsibility**: Class management — CRUD, association with school type and academic year.

| Aspect | Details |
|---|---|
| **Pages/Routes** | `/klasy`, `/klasy/:id` |
| **Domain** | `SchoolClass` entity, year range validation |
| **Use Cases** | `ListClasses`, `GetClass`, `CreateClass`, `UpdateClass`, `DeleteClass` |
| **Data Touched** | `klasy`, `typy_szkol` |
| **APIs** | `GET /api/classes`, `GET /api/classes/:id`, `POST /api/classes`, `PUT /api/classes/:id`, `DELETE /api/classes/:id` |
| **Policies** | Authenticated; owner-only update/delete (matching old `wlasciciel` logic) |
| **Tests** | Unit (year range validation), integration (CRUD + ownership) |

---

## 7. `subjects` — Przedmioty

**Responsibility**: Subject management — CRUD, type classification (general/vocational), level (basic/extended).

| Aspect | Details |
|---|---|
| **Pages/Routes** | `/przedmioty/:id` (detail), managed via admin panel |
| **Domain** | `Subject` entity, `SubjectType` and `SubjectLevel` value objects |
| **Use Cases** | `ListSubjects`, `GetSubject`, `CreateSubject`, `UpdateSubject` |
| **Data Touched** | `przedmioty` |
| **APIs** | `GET /api/subjects`, `GET /api/subjects/:id`, `POST /api/subjects`, `PUT /api/subjects/:id` |
| **Policies** | Authenticated; `admin` for mutations |
| **Tests** | Integration (CRUD) |

---

## 8. `school-types` — Typy szkół

**Responsibility**: School type management (Liceum, Technikum, Branżowa, Szkoła Podstawowa).

| Aspect | Details |
|---|---|
| **Pages/Routes** | `/szkoly`, managed via `/panel-admin` |
| **Domain** | `SchoolType` entity |
| **Use Cases** | `ListSchoolTypes`, `CreateSchoolType`, `UpdateSchoolType`, `DeleteSchoolType` |
| **Data Touched** | `typy_szkol` |
| **APIs** | `GET /api/school-types`, `POST /api/school-types`, `PUT /api/school-types/:id`, `DELETE /api/school-types/:id` |
| **Policies** | Authenticated; `admin` for mutations |
| **Tests** | Integration (CRUD) |

---

## 9. `dashboard` — Dashboard / Analytics

**Responsibility**: Director's dashboard — summary cards, compliance charts, risk indicators, alerts, workload tables.

| Aspect | Details |
|---|---|
| **Pages/Routes** | `/dashboard` |
| **Domain Services** | `RiskIndicatorService` (pure calculation) |
| **Use Cases** | `GetDashboardSummary`, `GetComplianceChart`, `GetWorkloadTable`, `GetAlerts`, `GetStaffingShortages`, `CalculateRiskIndicator` |
| **Data Touched** | Aggregates from: `rozkład_godzin`, `nauczyciele`, `klasy`, `siatki_godzin_mein`, `przydzial_godzin_wybor` |
| **APIs** | `GET /api/dashboard/summary`, `GET /api/dashboard/risk`, `GET /api/dashboard/alerts`, `GET /api/dashboard/compliance-chart`, `GET /api/dashboard/workload`, `GET /api/dashboard/staffing-gaps` |
| **Contains Assignment Logic** | Indirectly — risk indicator calls compliance + assignment analysis |
| **Policies** | Authenticated; read-only for `dyrektor`/`admin` |
| **Tests** | Unit (risk indicator parity), integration (dashboard data aggregation) |

---

## 10. `reports` — Raporty + Export

**Responsibility**: Generate reports (MEiN compliance, teacher workloads, staffing shortages, organizational sheet) and export to Excel.

| Aspect | Details |
|---|---|
| **Pages/Routes** | `/raporty`, `/raporty/:typ` |
| **Use Cases** | `GenerateComplianceReport`, `GenerateWorkloadReport`, `GenerateStaffingReport`, `ExportToExcel` |
| **Data Touched** | Aggregates from multiple tables |
| **APIs** | `GET /api/reports/:type`, `GET /api/export/xls` |
| **Policies** | Authenticated; `dyrektor`/`admin` |
| **Tests** | Integration (report content), snapshot (Excel output format) |

---

## 11. `import` — PDF Import

**Responsibility**: Import MEiN reference plans from PDF documents. OCR + table extraction + data mapping.

| Aspect | Details |
|---|---|
| **Pages/Routes** | `/import/mein-pdf` |
| **Use Cases** | `ImportMeinPdf`, `ParsePdfTables`, `MapImportedData`, `ValidateImportedData` |
| **Data Touched** | `siatki_godzin_mein`, `przedmioty`, `typy_szkol` |
| **APIs** | `POST /api/import/mein-pdf` (multipart upload) |
| **Policies** | Authenticated; `admin` only |
| **Tests** | Unit (PDF parsing with fixture PDFs), integration (end-to-end import) |

---

## 12. `qualifications` — Kwalifikacje

**Responsibility**: Teacher qualification management — mapping teachers to subjects they're qualified to teach.

| Aspect | Details |
|---|---|
| **Pages/Routes** | Part of `/nauczyciele/:id` detail page |
| **Domain** | `Qualification` entity (unique: teacher + subject) |
| **Use Cases** | `ListQualifications`, `AddQualification`, `RemoveQualification` |
| **Data Touched** | `kwalifikacje`, `nauczyciele`, `przedmioty` |
| **APIs** | `GET /api/qualifications?teacherId=...`, `POST /api/qualifications`, `DELETE /api/qualifications/:id` |
| **Policies** | Authenticated; `admin`/`dyrektor` for mutations |
| **Tests** | Integration (uniqueness constraint) |

---

## 13. `professions` — Zawody

**Responsibility**: Vocational profession management (for Technikum/Branżowa school types).

| Aspect | Details |
|---|---|
| **Pages/Routes** | Part of `/panel-admin` |
| **Domain** | `Profession` entity |
| **Use Cases** | `ListProfessions`, `CreateProfession`, `UpdateProfession` |
| **Data Touched** | `zawody` |
| **APIs** | `GET /api/professions`, `POST /api/professions`, `PUT /api/professions/:id` |
| **Policies** | Authenticated; `admin` for mutations |
| **Tests** | Integration (CRUD) |

---

## 14. `name-mappings` — Mapowania nazw

**Responsibility**: Mapping between MEiN official names and school-internal names for subjects and school types.

| Aspect | Details |
|---|---|
| **Pages/Routes** | `/mapowania` |
| **Domain** | `NameMapping` entity |
| **Use Cases** | `ListMappings`, `CreateMapping`, `UpdateMapping`, `FindSubjectByMapping` |
| **Data Touched** | `mapowania_nazw`, `przedmioty`, `typy_szkol` |
| **APIs** | `GET /api/name-mappings`, `POST /api/name-mappings`, `PUT /api/name-mappings/:id` |
| **Policies** | Authenticated; `admin`/`dyrektor` for mutations |
| **Tests** | Unit (name matching logic), integration (CRUD) |

---

## 15. `auth` (shared module)

**Responsibility**: Authentication and authorization — login, register, logout, session management, role-based access.

| Aspect | Details |
|---|---|
| **Pages/Routes** | `/` (login/register), middleware for all protected routes |
| **Implementation** | Supabase Auth (email/password), JWT in cookies, middleware session refresh |
| **Data Touched** | Supabase `auth.users`, custom `profiles` table (role, name) |
| **APIs** | Handled by Supabase Auth SDK (no custom API routes for auth) |
| **Policies** | Public for login/register; middleware for all other routes |
| **Tests** | Integration (login/register flow), e2e (session persistence) |

---

## Feature Dependency Graph

```
auth (shared) ◄───────── ALL features depend on auth
     │
     ▼
school-types ◄──── classes ◄──── schedule ◄──── assignment (★)
     │                │              │               │
     ▼                ▼              ▼               ▼
subjects ◄────── qualifications   teachers    mein-compliance
     │                                              │
     ▼                                              ▼
name-mappings                                   dashboard
     │                                              │
     ▼                                              ▼
  import                                        reports
     │
     ▼
professions
```

**Rule**: Features may depend on shared types from other features but must NOT directly import internal modules. Cross-feature communication goes through shared interfaces or use-case composition at the application layer.
