# 01 — Architecture Overview

## 1. Architecture Style: Clean Architecture + Vertical Slices

The rewrite adopts **Clean Architecture** layering combined with **Feature Module (Vertical Slice)** organization. Each feature is a self-contained module that owns all four layers. Shared cross-cutting concerns live in `@/shared` and `@/lib`.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                          │
│   Next.js App Router: Pages, Layouts, Server Components,           │
│   Client Components, Loading/Error Boundaries                      │
├─────────────────────────────────────────────────────────────────────┤
│                        APPLICATION LAYER                           │
│   Use Cases (Commands & Queries), DTOs, Typed Errors,              │
│   Server Actions / Route Handlers                                  │
├─────────────────────────────────────────────────────────────────────┤
│                        DOMAIN LAYER (PURE)                         │
│   Entities, Value Objects, Domain Services,                        │
│   Repository Interfaces, Domain Events                             │
│   *** NO framework imports. NO Supabase imports. ***               │
├─────────────────────────────────────────────────────────────────────┤
│                        INFRASTRUCTURE LAYER                        │
│   Supabase Client, Repository Implementations,                     │
│   Auth Adapters, PDF Parsers, Excel Exporters                      │
└─────────────────────────────────────────────────────────────────────┘
         │                                         │
         ▼                                         ▼
┌─────────────────┐                    ┌───────────────────────┐
│   Supabase       │                    │   External Services    │
│   (Auth, DB,     │                    │   (PDF libs, xlsx)     │
│    RLS, Storage) │                    │                        │
└─────────────────┘                    └───────────────────────┘
```

### Dependency Rule

Dependencies point **inward only**:

```
Presentation ──► Application ──► Domain ◄── Infrastructure
                                   ▲
                                   │
                          (implements interfaces
                           defined in Domain)
```

- **Domain** depends on NOTHING external.
- **Application** depends on Domain only (uses repository interfaces).
- **Infrastructure** depends on Domain (implements interfaces) + external libs.
- **Presentation** depends on Application (calls use cases) + Domain (reads types).

---

## 2. Module Boundaries

```
src/
├── app/                          # Next.js App Router (routing only)
│   ├── (auth)/                   # Auth route group
│   ├── (dashboard)/              # Protected route group
│   └── api/                      # API route handlers (thin)
│
├── features/                     # Feature modules (vertical slices)
│   ├── assignment/               # Przydział — THE critical module
│   │   ├── domain/               # Pure: entities, services, interfaces
│   │   ├── application/          # Use cases, DTOs, errors
│   │   ├── infrastructure/       # Supabase repos, adapters
│   │   └── presentation/         # Components, hooks
│   │
│   ├── teachers/                 # Nauczyciele
│   ├── classes/                  # Klasy
│   ├── subjects/                 # Przedmioty
│   ├── school-types/             # Typy szkół
│   ├── schedule/                 # Rozkład godzin
│   ├── mein-compliance/          # Zgodność MEiN
│   ├── realization/              # Realizacja
│   ├── dashboard/                # Dashboard / analytics
│   ├── reports/                  # Raporty + export
│   ├── import/                   # PDF import
│   ├── qualifications/           # Kwalifikacje
│   ├── professions/              # Zawody
│   └── name-mappings/            # Mapowania nazw
│
├── shared/                       # Cross-feature shared code
│   ├── auth/                     # Auth context, guards, middleware
│   ├── ui/                       # Reusable UI components (buttons, tables, etc.)
│   ├── hooks/                    # Shared React hooks
│   ├── types/                    # Shared TypeScript types
│   └── utils/                    # Pure utility functions
│
└── lib/                          # Infrastructure bootstrapping
    ├── supabase/                 # Supabase client factories (server/client/middleware)
    ├── validation/               # Zod schema utilities
    └── errors/                   # Base error classes + HTTP mapping
```

---

## 3. Data Flow: UI → Use Case → Repository → Supabase

### Example: Generate Automatic Teacher Assignment

```
┌──────────────┐     Server Action      ┌──────────────────┐
│  Przydzial   │ ──────────────────────► │ GenerateAssignment│
│  Page (RSC)  │     (form submit)       │ UseCase           │
│  presentation│                         │ application/      │
└──────────────┘                         └────────┬─────────┘
                                                  │
                                    calls domain service
                                                  │
                                         ┌────────▼─────────┐
                                         │ AssignmentService │
                                         │ domain/services/  │
                                         │ (PURE function)   │
                                         └────────┬─────────┘
                                                  │
                              reads via repository interfaces
                                                  │
                    ┌─────────────────────────────┼───────────────────┐
                    │                             │                   │
           ┌────────▼────────┐  ┌────────────────▼──┐  ┌────────────▼──────┐
           │ ClassRepository │  │ TeacherRepository  │  │ ScheduleRepository│
           │ (interface)     │  │ (interface)        │  │ (interface)       │
           └────────┬────────┘  └────────┬───────────┘  └────────┬─────────┘
                    │                    │                        │
           ┌────────▼────────┐  ┌────────▼───────────┐  ┌────────▼─────────┐
           │ SupabaseClass   │  │ SupabaseTeacher    │  │ SupabaseSchedule │
           │ Repository      │  │ Repository         │  │ Repository       │
           │ infrastructure/ │  │ infrastructure/    │  │ infrastructure/  │
           └────────┬────────┘  └────────┬───────────┘  └────────┬─────────┘
                    │                    │                        │
                    └────────────────────┼────────────────────────┘
                                         │
                                ┌────────▼─────────┐
                                │  Supabase Client  │
                                │  (SSR-safe)       │
                                │  lib/supabase/    │
                                └────────┬─────────┘
                                         │
                                ┌────────▼─────────┐
                                │  PostgreSQL       │
                                │  (Supabase DB)    │
                                │  + RLS policies   │
                                └──────────────────┘
```

### Step-by-Step Flow

1. **User clicks "Generuj przydział"** on the `/przydzial` page.
2. **Server Action** `generateAssignment` is invoked (thin — validates input, calls use case).
3. **`GenerateAssignmentUseCase`** orchestrates:
   - Fetches classes, teachers, MEiN requirements via repository interfaces.
   - Passes data to `AssignmentService.distribute()` (pure domain function).
   - Receives `AssignmentResult` (assignments + staffing gaps + metrics).
4. **`AssignmentService.distribute()`** is a **pure function**: no DB calls, no side effects, fully deterministic.
5. **Use case saves results** via `ScheduleRepository.saveAssignments()`.
6. **Repository implementation** (`SupabaseScheduleRepository`) uses Supabase client to upsert rows.
7. **Result is returned** to the Server Action, which returns it to the client.

---

## 4. Why This Fixes the Problems

### Problem 1: N+1 Queries (UI Freezes)

**Old**: The assignment algorithm loops through every teacher, and for each one calls `payload.find()` to check workload — resulting in O(T) sequential DB round-trips where T = number of teachers.

**New**: Repository implementations batch-fetch all data upfront. `TeacherRepository.findAllActiveWithWorkload(schoolYear)` runs a single query with JOINs. The pure domain function receives pre-loaded data and iterates in-memory.

### Problem 2: Spaghetti Code

**Old**: Business logic scattered across:
- Payload collection hooks (`beforeChange`, `afterChange`)
- API route handlers (inline logic)
- Utility functions (some pure, some with Payload dependency)
- React components (localStorage reads)

**New**: Strict layer separation:
- **Domain**: Pure business rules. Zero dependencies.
- **Application**: Orchestration only. Calls domain + repos.
- **Infrastructure**: Data access only. No business logic.
- **Presentation**: Rendering only. Calls use cases.

### Problem 3: No Supabase Features

**Old**: Supabase used only as a PostgreSQL host. No SDK, no RLS, no Auth.

**New**: 
- **Supabase Auth** replaces Payload auth (JWT, row-level security).
- **RLS policies** enforce access control at the database level.
- **Supabase JS client** (SSR-safe) for all data access.
- **Realtime** channels for live dashboard updates (optional).

### Problem 4: Payload CMS Overhead

**Old**: Payload CMS adds cold-start latency, ORM overhead, and unused admin panel weight.

**New**: Payload CMS removed entirely. Direct Supabase SDK + Zod validation. Lighter, faster, purpose-built.

### Problem 5: No Tests

**Old**: 1 test file. Zero coverage on critical assignment logic.

**New**: 
- Domain layer: 100% unit test coverage (pure functions are trivially testable).
- Application layer: Integration tests with Supabase test project.
- E2E: Playwright tests for critical user flows.
- Golden tests: Assignment parity verification (see doc 09).

### Problem 6: Type Safety Gaps

**Old**: Heavy use of `any` in Payload queries, hooks, and conditions.

**New**: `strict: true`, no `any`. Supabase generates types from schema. Zod schemas validate all inputs. Exhaustive switch/case for enums.

---

## 5. Technology Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15+ (latest stable, App Router) | Existing choice, good for SSR + RSC |
| React | React 19+ | Server Components, `use()` hook, Actions |
| Database | PostgreSQL on Supabase | Existing infra, keep data in place |
| ORM / Data access | Supabase JS SDK (`@supabase/ssr`) | SSR-safe, RLS-aware, typed from schema |
| Auth | Supabase Auth | Built-in, RLS integration, JWT |
| Styling | Tailwind CSS 4+ | Existing choice, performant |
| Validation | Zod 4+ | Runtime validation + type inference |
| State (server) | React Server Components + Server Actions | Minimize client JS |
| State (client) | TanStack Query v5 (only where needed) | Cache invalidation for mutations |
| Testing | Vitest (unit), Playwright (e2e) | Fast, modern, good DX |
| Linting | ESLint flat config + Prettier | Consistent code style |
| PDF parsing | pdf-parse + pdfjs-dist (keep existing) | Working pipeline, no need to change |
| Excel export | xlsx (keep existing) | Working, no need to change |

---

## 6. Cross-Cutting Concerns

### Authentication & Authorization

```
Request ──► Next.js Middleware ──► Supabase Auth (verify JWT)
                │                           │
                │                    ┌──────▼──────┐
                │                    │  User Role   │
                │                    │  (from JWT)  │
                │                    └──────┬──────┘
                │                           │
                ▼                           ▼
        Route accessible?          RLS policy check
        (middleware guard)         (every DB query)
```

- **Middleware**: Refreshes Supabase session, redirects unauthenticated users.
- **UI Guards**: Server Components check role before rendering.
- **RLS**: Database enforces row-level access based on `auth.uid()` and role.

### Error Handling

```
Domain Error (typed) ──► Application catches ──► Maps to HTTP status
                                                        │
                                                ┌───────▼────────┐
                                                │ Consistent JSON │
                                                │ { error, code } │
                                                └────────────────┘
```

- Domain throws typed errors (e.g., `TeacherOverloadedError`, `NoQualifiedTeacherError`).
- Application layer catches and maps to error DTOs.
- Server Actions / Route Handlers return consistent `{ error: string, code: string }` shape.

### Logging & Monitoring

- Structured logging via `pino` (server-side).
- Client-side error boundary logging to Supabase Edge Function or external service.
- Performance metrics: Web Vitals reported from `reportWebVitals`.
