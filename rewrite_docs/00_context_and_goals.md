# 00 — Context & Goals

## 1. Project Overview

**EduGrid** is a school-management application used by Polish schools to plan teaching hours, assign teachers to subjects/classes, and verify compliance with MEiN (Ministry of Education and Science) curriculum requirements. It is used primarily by school directors (`dyrektor`), administrative staff (`sekretariat`), and system administrators (`admin`).

### Current Stack (Legacy)

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS |
| Backend / ORM | Payload CMS 3.73 (headless CMS acting as API + ORM) |
| Database | PostgreSQL on Supabase (via Payload `@payloadcms/db-postgres`) |
| Auth | Payload CMS built-in auth (JWT cookies), direct PG fallback |
| PDF Import | pdf-parse, pdfjs-dist, tesseract.js |
| Export | xlsx |
| Validation | Zod (partially), Payload field-level validators |

### Why Rewrite?

1. **Performance**: UI freezes caused by N+1 Payload queries (e.g., looping over every teacher to check workload), large un-paginated fetches, and `localStorage` used as a data store for critical assignment data.
2. **Spaghetti architecture**: Business logic mixed into API route handlers, Payload collection hooks, and React components. No separation of concerns.
3. **No Supabase SDK usage**: Despite hosting on Supabase, the app never uses the Supabase JS client. No RLS, no Realtime, no Edge Functions. Auth is entirely through Payload CMS.
4. **Payload CMS overhead**: Payload adds latency (cold-start, ORM overhead, auto-generated admin panel never used by end-users). It was a poor fit for this domain-specific app.
5. **Testability**: Only one test file exists (`register.test.ts`). Assignment logic has zero test coverage.
6. **Type safety gaps**: Heavy use of `any` in Payload query conditions and hooks.

---

## 2. Rewrite Goals

| # | Goal | Priority |
|---|---|---|
| G1 | **Behavior parity** — identical outcomes for all user flows, especially assignment allocation logic | CRITICAL |
| G2 | **Clean Architecture** — Domain / Application / Infrastructure / Presentation layers with strict dependency rules | HIGH |
| G3 | **Feature Modules (vertical slices)** — each feature owns its routes, components, hooks, use cases | HIGH |
| G4 | **Supabase-native backend** — use Supabase SDK (Auth, RLS, Postgres functions, Storage, Realtime where needed) | HIGH |
| G5 | **Performance** — eliminate UI freezes, remove over-fetching, batch queries, pagination, streaming SSR | HIGH |
| G6 | **TypeScript strict mode** — no `any`, strict null checks, exhaustive switches | HIGH |
| G7 | **Testable** — domain logic has 100% unit test coverage; integration + e2e tests for critical flows | HIGH |
| G8 | **Maintainable** — 120-char line length, absolute imports, explicit `if/else` for business logic | MEDIUM |

---

## 3. Non-Goals

| # | Non-Goal | Reason |
|---|---|---|
| NG1 | Mobile app | Out of scope; responsive web is sufficient |
| NG2 | Multi-tenancy (multiple schools in one instance) | Current app is single-school; preserve this model |
| NG3 | Payload CMS admin panel | Not used by end-users; replaced by custom UI |
| NG4 | GraphQL API | REST + Server Actions are sufficient |
| NG5 | Internationalization (i18n) | App is Polish-only |
| NG6 | Change assignment algorithm behavior | Algorithm must produce identical outputs for identical inputs |

---

## 4. Hard Constraints

1. **TypeScript strict mode ON** — `"strict": true`, no `any`.
2. **120-character line length**.
3. **Absolute imports only** — via `tsconfig.json` `paths` (`@/features/*`, `@/shared/*`, `@/lib/*`).
4. **No inline ternaries for business logic** — use explicit `if/else` blocks.
5. **Separation of concerns** — Domain (pure TS, no framework imports), Application (use cases), Infrastructure (Supabase adapters), Presentation (Next.js UI).
6. **Feature modules own their routes, components, hooks, and use cases** — shared only via `@/shared/*`.
7. **Supabase remains the backend** — Auth, Postgres, RLS, Storage, Edge Functions if needed.
8. **Assignment logic must be a pure domain module** — no DB imports, deterministic, exhaustively tested.
9. **Existing Supabase PostgreSQL database** — schema migration is allowed but must be planned and reversible.

---

## 5. Explicit Parity Requirements

These behaviors MUST remain identical between old and new systems:

| Area | What Must Match |
|---|---|
| **Automatic hour distribution** (`automatycznyRozdzialGodzin`) | Given the same teachers, classes, subjects, MEiN requirements, and parameters — the output assignments, staffing gaps, and workload statistics must be byte-for-byte identical |
| **Teacher assignment** (`przypisywanieNauczycieli`) | Sorting order (by workload percentage, then continuity preference), tie-breaking, qualification checks |
| **Hour allocation generation** (`przydzial/generuj`) | The `uzupełnijNierozdysponowane` function that fills unassigned hours optimally across grades |
| **MEiN compliance** (`zgodnoscMein`) | Percentage calculation, shortage/surplus detection, alert text |
| **Realization calculation** (`realizacjaZPrzydzialu`) | Percentage, shortages, surpluses — including the rounding (`Math.round(x * 10) / 10`) |
| **Risk indicator** (`wskaznikRyzyka`) | Factor weights, category thresholds (0-25-50-75-100), recommendations |
| **Hour sum verification** (`weryfikacjaSum`) | Tolerance of 0.1h, error messages |
| **Auth flows** | Login, register, logout, session management, role checks |
| **Data CRUD** | All create/read/update/delete for: classes, teachers, subjects, school types, qualifications, schedules, professions, name mappings |
| **PDF import** | MEiN PDF parsing and data extraction pipeline |
| **Excel export** | Same output format and content |
| **Semester validation** | `godziny_roczne === semestr_1 + semestr_2` |
| **Workload auto-calculation** | `etat → max_obciazenie` mapping: pelny=18, pol=9, czwarty=4.5, osiemnasty=1 |

---

## 6. Glossary

| Polish Term | English Translation | Domain Meaning |
|---|---|---|
| Przydział | Assignment/Allocation | Distributing teaching hours to teachers/classes |
| Godziny do wyboru | Hours to choose | MEiN-mandated flexible hours that the school allocates |
| Godziny dyrektorskie | Director's hours | Hours at the director's discretion |
| Siatka godzin MEiN | MEiN hour grid | Ministry-defined required hours per subject per school type |
| Rozkład godzin | Hour schedule/distribution | Actual assigned hours (subject × class × teacher × year) |
| Realizacja | Realization | Tracking planned vs. actually delivered hours |
| Zgodność MEiN | MEiN compliance | Checking school's plan against ministry requirements |
| Braki kadrowe | Staffing shortages | Subjects/classes with no qualified available teacher |
| Obciążenie | Workload | Teacher's weekly teaching hours vs. maximum |
| Etat | Employment type | Full-time (18h), half (9h), quarter (4.5h), 1/18th (1h) |
| Klasa | Class | A school class (e.g., 1A, 2B) within a school year |
| Typ szkoły | School type | Liceum (LO), Technikum, Branżowa, etc. |
| Przedmiot | Subject | A teaching subject (Math, Polish, etc.) |
| Nauczyciel | Teacher | A teacher entity with qualifications and workload |
| Kwalifikacje | Qualifications | Teacher's formal qualifications for specific subjects |
| Doradztwo zawodowe | Career counseling | Specific MEiN-required counseling hours |
| Rozszerzenia | Extensions | Extended-level subjects (e.g., extended Math) |
| Podział na grupy | Group division | Splitting a class into 2 groups for certain subjects |
| Ramowy plan | Framework plan | MEiN reference curriculum plan |
| Zawód | Profession | Vocational profession (for Technikum/Branżowa) |
| Mapowanie nazw | Name mapping | Mapping between MEiN official names and school-internal names |
| Wskaźnik ryzyka | Risk indicator | Composite score (0-100) of organizational risk |
| Zablokowane | Locked | Assignment locked from automatic reassignment |

---

## 7. Assumptions & Open Questions

### Assumptions (to be confirmed with stakeholders)

| # | Assumption |
|---|---|
| A1 | The existing Supabase PostgreSQL database can have its schema migrated (Payload CMS tables replaced with clean schema). Data migration scripts will be needed. |
| A2 | The Payload CMS admin panel (`/admin`) is not used by end-users and can be removed entirely. |
| A3 | `localStorage` usage in `realizacjaZPrzydzialu.ts` is a legacy workaround; all data should be server-side in the rewrite. |
| A4 | The app serves a single school (single-tenant). Multi-school support within one instance is not required. |
| A5 | The `ramowe-plany.json` static file is the canonical source for MEiN reference plans and will be kept as a static data source (or migrated to a DB table). |
| A6 | User roles remain: `admin`, `dyrektor`, `sekretariat`. No new roles are needed. |
| A7 | The current 3-role access model is sufficient; RLS will enforce it at the database level. |

### Open Questions (must be answered before implementation)

| # | Question | Impact |
|---|---|---|
| Q1 | Are there any undocumented tie-breaker rules in the assignment algorithm beyond workload percentage and continuity preference? | Assignment parity |
| Q2 | The `optymalizujIstniejacePrzypisania` function is a TODO stub — was it ever planned to be implemented, or can it remain a no-op? | Scope |
| Q3 | Is there production data that can be used to generate golden test fixtures for assignment parity verification? | Testing strategy |
| Q4 | Should `ramowe-plany.json` be migrated to a database table to allow dynamic updates, or kept as a static file? | Schema design |
| Q5 | What is the expected data scale? (Number of teachers, classes, subjects per school) | Performance budget |
| Q6 | Is Vercel the target deployment platform, or should we support self-hosting? | Infrastructure decisions |
| Q7 | Are there any existing Supabase RLS policies or database triggers that were set up outside the codebase? | Migration safety |
| Q8 | The `numer_klasy` field — is it always set in production, or does the regex fallback from `nazwa` (e.g., "1A" → 1) get used frequently? | Data integrity |
