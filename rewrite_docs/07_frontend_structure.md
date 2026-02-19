# 07 — Frontend Structure

## 1. Next.js App Router Structure

```
src/app/
├── (auth)/                           # Public route group (no auth required)
│   ├── login/
│   │   └── page.tsx                  # Login + Register page
│   └── layout.tsx                    # Auth layout (centered card)
│
├── (dashboard)/                      # Protected route group
│   ├── layout.tsx                    # Dashboard layout (sidebar + main)
│   ├── page.tsx                      # → redirect to /dashboard
│   │
│   ├── dashboard/
│   │   ├── page.tsx                  # Director dashboard (RSC)
│   │   └── loading.tsx               # Skeleton loader
│   │
│   ├── przydzial/
│   │   ├── page.tsx                  # Assignment page (RSC + client islands)
│   │   └── loading.tsx
│   │
│   ├── realizacja/
│   │   ├── page.tsx                  # Realization tracking page
│   │   └── loading.tsx
│   │
│   ├── dyspozycja/
│   │   ├── page.tsx                  # Teacher disposition page
│   │   └── loading.tsx
│   │
│   ├── siatka-szkoly/
│   │   ├── page.tsx                  # School grid page
│   │   └── loading.tsx
│   │
│   ├── nauczyciele/
│   │   ├── page.tsx                  # Teachers list page
│   │   ├── [id]/
│   │   │   └── page.tsx              # Teacher detail page
│   │   └── loading.tsx
│   │
│   ├── klasy/
│   │   ├── page.tsx                  # Classes list page
│   │   ├── [id]/
│   │   │   └── page.tsx              # Class detail page
│   │   └── loading.tsx
│   │
│   ├── przedmioty/
│   │   └── [id]/
│   │       └── page.tsx              # Subject detail page
│   │
│   ├── szkoly/
│   │   └── page.tsx                  # School types page
│   │
│   ├── panel-admin/
│   │   └── page.tsx                  # Admin panel (admin role only)
│   │
│   ├── mapowania/
│   │   └── page.tsx                  # Name mappings page
│   │
│   ├── plany-mein/
│   │   └── page.tsx                  # MEiN reference plans viewer
│   │
│   ├── import/
│   │   └── mein-pdf/
│   │       └── page.tsx              # PDF import page
│   │
│   └── raporty/
│       ├── page.tsx                  # Reports hub
│       └── [typ]/
│           └── page.tsx              # Specific report page
│
├── api/                              # Route handlers (file ops only)
│   ├── import/
│   │   └── mein-pdf/
│   │       └── route.ts             # PDF upload endpoint
│   ├── export/
│   │   └── xls/
│   │       └── route.ts             # Excel download endpoint
│   └── seed/
│       └── route.ts                 # Dev seeding (env-gated)
│
├── globals.css                       # Tailwind imports + global styles
├── layout.tsx                        # Root layout (html, body, fonts)
└── not-found.tsx                     # 404 page
```

---

## 2. Per-Feature UI Composition

### Pattern: Server Components by Default, Client Islands for Interactivity

```
┌─────────────────────────────────────────────────────────────────┐
│  page.tsx (Server Component)                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Data fetching (Server Action call or direct Supabase)   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────┐  ┌─────────────────────────────────┐ │
│  │  Static header (RSC) │  │  FilterBar (Client Component)   │ │
│  └──────────────────────┘  │  - school type dropdown         │ │
│                             │  - year range dropdown          │ │
│                             │  - class dropdown               │ │
│                             └─────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  <Suspense fallback={<TableSkeleton />}>                 │  │
│  │    DataTable (Server Component — fetches filtered data)  │  │
│  │  </Suspense>                                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  InteractiveGrid (Client Component — mutations)          │  │
│  │  - click to assign/edit hours                             │  │
│  │  - calls Server Actions on change                         │  │
│  │  - uses useTransition for optimistic UI                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Feature-Specific UI Components

#### Assignment (`features/assignment/presentation/`)

| Component | Type | Responsibility |
|---|---|---|
| `AssignmentPage` | RSC | Top-level page, fetches initial data |
| `MeinPlanTable` | Client | Interactive table with hours-to-choose, director hours, extensions, group division modes |
| `AssignmentToolbar` | Client | Mode selector, generate button, save button |
| `AssignmentResultPanel` | Client | Shows algorithm results: assignments, gaps, metrics |
| `HourCell` | Client | Clickable cell in the plan table (increment/decrement hours) |
| `ExtensionSelector` | Client | Checkbox list for selecting extension subjects |
| `GroupDivisionToggle` | Client | Toggle group 1/group 2 split per cell |

#### Dashboard (`features/dashboard/presentation/`)

| Component | Type | Responsibility |
|---|---|---|
| `DashboardPage` | RSC | Fetches summary, renders cards |
| `FilterCascade` | Client | School Type → Year → Class dropdowns |
| `SummaryCards` | RSC | Static metric tiles (realization %, counts) |
| `ComplianceChart` | Client | Bar/pie chart (MEiN compliance) |
| `RiskIndicatorCard` | RSC | Risk gauge with category color |
| `WorkloadTable` | RSC | Teacher workload table with color coding |
| `AlertsList` | RSC | List of actionable alerts |
| `StaffingGapsList` | RSC | Staffing shortage details |

#### Teachers (`features/teachers/presentation/`)

| Component | Type | Responsibility |
|---|---|---|
| `TeacherListPage` | RSC | Paginated list with search |
| `TeacherDetailPage` | RSC | Teacher info + workload + qualifications |
| `TeacherForm` | Client | Create/edit teacher form |
| `WorkloadBar` | RSC | Visual bar showing utilization % |

---

## 3. State Management Strategy

### Rule: Minimal Client State

| Data Type | Strategy | Reason |
|---|---|---|
| Entity data (teachers, classes, etc.) | Server Components + Server Actions | No client cache needed; SSR is fast |
| Filter selections (school type, year) | URL search params (`useSearchParams`) | Shareable URLs, browser back works |
| Interactive grid state (assignment table) | `useState` + `useReducer` (local) | Complex UI state during editing session |
| Mutation state (saving, loading) | `useTransition` + `useOptimistic` | React 19 built-in patterns |
| Auth state | Server-side (middleware + `getUser()`) | No client-side auth context needed |

### When to Use TanStack Query

TanStack Query is used **only** for:

1. **Polling** — Dashboard widgets that auto-refresh every N seconds.
2. **Optimistic updates** — When `useOptimistic` isn't sufficient (complex cache invalidation).
3. **Infinite scroll** — If paginated lists need seamless loading.

```typescript
// Example: Dashboard auto-refresh with TanStack Query
'use client';

import { useQuery } from '@tanstack/react-query';
import { getDashboardSummaryAction } from '@/features/dashboard/presentation/actions';

export function DashboardSummaryWidget({
  schoolTypeId,
  schoolYear,
}: {
  schoolTypeId: string;
  schoolYear: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary', schoolTypeId, schoolYear],
    queryFn: () =>
      getDashboardSummaryAction({ schoolTypeId, schoolYear }),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return <SummarySkeleton />;
  }

  if (!data?.success) {
    return <ErrorCard message={data?.error ?? 'Failed to load'} />;
  }

  return <SummaryCards data={data.data} />;
}
```

---

## 4. Loading & Error Boundaries

### Loading States

Every route segment has a `loading.tsx` that shows a skeleton:

```typescript
// app/(dashboard)/przydzial/loading.tsx

export default function AssignmentLoading() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
      <div className="grid grid-cols-3 gap-4">
        <div className="h-10 animate-pulse rounded bg-gray-200" />
        <div className="h-10 animate-pulse rounded bg-gray-200" />
        <div className="h-10 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="h-96 animate-pulse rounded bg-gray-200" />
    </div>
  );
}
```

### Error Boundaries

```typescript
// app/(dashboard)/error.tsx
'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12">
      <h2 className="text-xl font-semibold text-red-600">
        Wystąpił błąd
      </h2>
      <p className="mt-2 text-gray-600">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Spróbuj ponownie
      </button>
    </div>
  );
}
```

### Granular Suspense for Data-Heavy Pages

```typescript
// app/(dashboard)/dashboard/page.tsx

import { Suspense } from 'react';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ schoolTypeId?: string; schoolYear?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <FilterCascade
        defaultSchoolTypeId={params.schoolTypeId}
        defaultSchoolYear={params.schoolYear}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Suspense fallback={<CardSkeleton />}>
          <SummaryCards
            schoolTypeId={params.schoolTypeId!}
            schoolYear={params.schoolYear!}
          />
        </Suspense>

        <Suspense fallback={<CardSkeleton />}>
          <RiskIndicatorCard
            schoolTypeId={params.schoolTypeId!}
            schoolYear={params.schoolYear!}
          />
        </Suspense>
      </div>

      <Suspense fallback={<TableSkeleton rows={10} />}>
        <WorkloadTable
          schoolTypeId={params.schoolTypeId!}
          schoolYear={params.schoolYear!}
        />
      </Suspense>
    </div>
  );
}
```

---

## 5. Performance Tactics

### 5.1 Streaming SSR

- All pages use React Server Components which stream HTML to the client.
- Heavy sections wrapped in `<Suspense>` to show shell immediately.
- Each `<Suspense>` boundary independently resolves, so fast data renders first.

### 5.2 Pagination

- Lists (teachers, classes, subjects) use server-side pagination.
- URL search params: `?page=2&pageSize=50`.
- Total count returned for "Page X of Y" UI.

### 5.3 Memoization

- `React.memo` for expensive list item components.
- `useMemo`/`useCallback` for computed values in interactive grids.
- The assignment `MeinPlanTable` (large table) uses virtualization for 100+ rows.

### 5.4 Image / Asset Optimization

- `next/image` for any images.
- Fonts loaded with `next/font/google`.
- Tailwind CSS purges unused classes.

### 5.5 Bundle Size

- Server Components render on server (zero client JS).
- Client Components are code-split per-route by default.
- Heavy libraries (`xlsx`, `pdf-parse`, `tesseract.js`) only imported in Server Actions / Route Handlers — never in client bundles.

### 5.6 Data Fetching Optimization

| Old Pattern (Problem) | New Pattern (Fix) |
|---|---|
| `fetch('/api/endpoint', { cache: 'no-store' })` in `useEffect` | Server Component data fetch (no waterfall) |
| N+1 queries (loop over teachers, query each) | Batch query with JOIN (single round-trip) |
| `localStorage` for critical data | Server-side `elective_allocations` table |
| No pagination (fetch all 1000 records) | Paginated queries with LIMIT/OFFSET |
| Client-side filtering (fetch all, filter in JS) | Server-side WHERE clauses |

---

## 6. Layout Architecture

```typescript
// app/(dashboard)/layout.tsx

import { createSupabaseServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/shared/ui/sidebar';
import { UserNav } from '@/shared/ui/user-nav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, role')
    .eq('id', user.id)
    .single();

  return (
    <div className="flex h-screen">
      <Sidebar userRole={profile?.role ?? 'sekretariat'} />
      <main className="flex-1 overflow-auto">
        <header className="flex items-center justify-between border-b px-6 py-3">
          <div />
          <UserNav
            name={`${profile?.first_name} ${profile?.last_name}`}
            role={profile?.role ?? 'sekretariat'}
          />
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
```

---

## 7. Critical User Flow: Assignment Generation

```
User opens /przydzial
         │
         ▼
┌─────────────────────────────────────────────────┐
│  Server Component fetches:                       │
│  - School types (for dropdown)                   │
│  - Current class (from URL params)               │
│  - Existing elective allocation (if any)         │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  Client: MeinPlanTable renders                   │
│  - User selects school type, year, class         │
│  - Table shows MEiN plan with editable cells     │
└────────────────────┬────────────────────────────┘
                     │
        User clicks "Generuj przydział"
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  Server Action: allocateElectiveHoursAction()    │
│  - Validates input                               │
│  - Calls HourAllocationService.fillUnassigned()  │
│  - Saves to elective_allocations table           │
│  - Returns merged allocation data                │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│  Client: MeinPlanTable updates with new data     │
│  - Cells show assigned hours                     │
│  - User can manually adjust (click +/-)          │
│  - Changes auto-save via Server Action           │
└─────────────────────────────────────────────────┘
```
