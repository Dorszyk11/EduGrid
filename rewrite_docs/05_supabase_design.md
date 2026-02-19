# 05 — Supabase Design

## 1. Schema Proposal

The rewrite replaces Payload CMS-managed tables with a clean, purpose-built PostgreSQL schema. Payload's auto-generated tables (`_payload_*`, `_rels_*`) are dropped. All tables use `snake_case` naming.

### 1.1 Core Tables

```sql
-- ============================================================
-- AUTH: Managed by Supabase Auth
-- ============================================================
-- auth.users — built-in, no custom DDL needed.

-- Custom profile table linked to auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'sekretariat'
    CHECK (role IN ('admin', 'dyrektor', 'sekretariat')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'sekretariat')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- SCHOOL TYPES
-- ============================================================
CREATE TABLE public.school_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cycle_years INT NOT NULL CHECK (cycle_years > 0),
  mein_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- SUBJECTS
-- ============================================================
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mein_code TEXT,
  subject_type TEXT NOT NULL DEFAULT 'ogolnoksztalcace'
    CHECK (subject_type IN ('ogolnoksztalcace', 'zawodowe_teoretyczne', 'zawodowe_praktyczne')),
  level TEXT NOT NULL DEFAULT 'brak'
    CHECK (level IN ('podstawowy', 'rozszerzony', 'brak')),
  organizational_unit TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- CLASSES
-- ============================================================
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  school_type_id UUID NOT NULL REFERENCES public.school_types(id),
  school_year TEXT NOT NULL CHECK (school_year ~ '^\d{4}/\d{4}$'),
  class_number INT CHECK (class_number BETWEEN 1 AND 8),
  profile TEXT,
  profession TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_classes_school_type_year ON public.classes(school_type_id, school_year);
CREATE INDEX idx_classes_owner ON public.classes(owner_id);


-- ============================================================
-- TEACHERS
-- ============================================================
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  phone TEXT,
  employment_type TEXT NOT NULL DEFAULT 'pelny'
    CHECK (employment_type IN ('pelny', 'pol', 'czwarty', 'osiemnasty')),
  max_weekly_hours NUMERIC(4,1) NOT NULL DEFAULT 18
    CHECK (max_weekly_hours BETWEEN 0 AND 40),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Teacher specializations (many-to-many with subjects)
CREATE TABLE public.teacher_subjects (
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, subject_id)
);


-- ============================================================
-- QUALIFICATIONS
-- ============================================================
CREATE TABLE public.qualifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  degree TEXT,
  specialization TEXT,
  obtained_at DATE,
  document_ref TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, subject_id)
);

CREATE INDEX idx_qualifications_teacher ON public.qualifications(teacher_id);
CREATE INDEX idx_qualifications_subject ON public.qualifications(subject_id);


-- ============================================================
-- MEIN REQUIREMENTS (Siatki godzin MEiN)
-- ============================================================
CREATE TABLE public.mein_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  school_type_id UUID NOT NULL REFERENCES public.school_types(id),
  class_number INT,
  cycle_hours NUMERIC(6,1) NOT NULL DEFAULT 0,
  weekly_hours_min NUMERIC(4,1),
  weekly_hours_max NUMERIC(4,1),
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  valid_from DATE NOT NULL,
  valid_to DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (weekly_hours_min IS NULL OR weekly_hours_max IS NULL
         OR weekly_hours_min <= weekly_hours_max)
);

CREATE INDEX idx_mein_req_school_type ON public.mein_requirements(school_type_id);
CREATE INDEX idx_mein_req_subject ON public.mein_requirements(subject_id);
CREATE INDEX idx_mein_req_valid_from ON public.mein_requirements(valid_from);


-- ============================================================
-- SCHEDULE ENTRIES (Rozkład godzin)
-- ============================================================
CREATE TABLE public.schedule_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id),
  school_year TEXT NOT NULL CHECK (school_year ~ '^\d{4}/\d{4}$'),
  year_in_cycle TEXT,
  annual_hours NUMERIC(6,1) NOT NULL CHECK (annual_hours >= 0),
  weekly_hours NUMERIC(4,1) NOT NULL CHECK (weekly_hours BETWEEN 0 AND 10),
  semester_1_hours NUMERIC(6,1) NOT NULL DEFAULT 0 CHECK (semester_1_hours >= 0),
  semester_2_hours NUMERIC(6,1) NOT NULL DEFAULT 0 CHECK (semester_2_hours >= 0),
  subject_type TEXT CHECK (subject_type IN ('ogolnoksztalcace', 'zawodowe_teoretyczne', 'zawodowe_praktyczne')),
  level TEXT CHECK (level IN ('podstawowy', 'rozszerzony', 'brak')),
  notes TEXT,
  surplus_justification TEXT,
  internal_notes TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  lock_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (annual_hours = semester_1_hours + semester_2_hours)
);

CREATE INDEX idx_schedule_class_year ON public.schedule_entries(class_id, school_year);
CREATE INDEX idx_schedule_teacher_year ON public.schedule_entries(teacher_id, school_year);
CREATE INDEX idx_schedule_subject ON public.schedule_entries(subject_id);
CREATE UNIQUE INDEX idx_schedule_unique_assignment
  ON public.schedule_entries(subject_id, class_id, teacher_id, school_year);


-- ============================================================
-- ELECTIVE HOUR ALLOCATIONS (Przydział godzin wybór)
-- ============================================================
CREATE TABLE public.elective_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE UNIQUE,
  elective_hours JSONB NOT NULL DEFAULT '{}',
  counseling_hours JSONB NOT NULL DEFAULT '{}',
  director_hours JSONB NOT NULL DEFAULT '{}',
  extensions JSONB NOT NULL DEFAULT '[]',
  extension_hours_pool JSONB NOT NULL DEFAULT '{}',
  extension_hours_per_subject JSONB NOT NULL DEFAULT '{}',
  realization JSONB NOT NULL DEFAULT '{}',
  group_division JSONB NOT NULL DEFAULT '{}',
  group_hours JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- PROFESSIONS (Zawody)
-- ============================================================
CREATE TABLE public.professions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  profession_code TEXT NOT NULL UNIQUE,
  school_type_id UUID REFERENCES public.school_types(id),
  theoretical_hours_in_cycle NUMERIC(6,1) DEFAULT 0,
  practical_hours_in_cycle NUMERIC(6,1) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- NAME MAPPINGS (Mapowania nazw)
-- ============================================================
CREATE TABLE public.name_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mein_name TEXT NOT NULL,
  school_name TEXT NOT NULL,
  mapping_type TEXT NOT NULL CHECK (mapping_type IN ('przedmiot', 'typ_szkoly')),
  subject_id UUID REFERENCES public.subjects(id),
  school_type_id UUID REFERENCES public.school_types(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- UPDATED_AT TRIGGER (auto-update on all tables)
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'profiles', 'school_types', 'subjects', 'classes', 'teachers',
      'qualifications', 'mein_requirements', 'schedule_entries',
      'elective_allocations', 'professions', 'name_mappings'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      tbl
    );
  END LOOP;
END;
$$;
```

---

## 2. Indexing Strategy

| Table | Index | Purpose |
|---|---|---|
| `classes` | `(school_type_id, school_year)` | Filter classes by type + year (most common query) |
| `classes` | `(owner_id)` | Owner-based access control |
| `schedule_entries` | `(class_id, school_year)` | Schedule grid queries |
| `schedule_entries` | `(teacher_id, school_year)` | Teacher workload calculation |
| `schedule_entries` | `(subject_id)` | Subject-based lookups |
| `schedule_entries` | UNIQUE `(subject_id, class_id, teacher_id, school_year)` | Prevent duplicate assignments + upsert key |
| `mein_requirements` | `(school_type_id)` | Filter by school type |
| `mein_requirements` | `(subject_id)` | Filter by subject |
| `mein_requirements` | `(valid_from)` | Date-based filtering |
| `qualifications` | `(teacher_id)` | Teacher qualification lookup |
| `qualifications` | `(subject_id)` | Subject qualification lookup |

### Performance-Critical Queries (must be fast)

1. **Teacher workload** — `SELECT SUM(weekly_hours) FROM schedule_entries WHERE teacher_id = $1 AND school_year = $2`
   - Covered by `idx_schedule_teacher_year`

2. **School grid** — `SELECT * FROM schedule_entries WHERE class_id IN (...) AND school_year = $1`
   - Covered by `idx_schedule_class_year`

3. **All active teachers with workloads** (batch for assignment algorithm):
   ```sql
   SELECT t.*, COALESCE(w.total_hours, 0) AS current_weekly_hours
   FROM teachers t
   LEFT JOIN (
     SELECT teacher_id, SUM(weekly_hours) AS total_hours
     FROM schedule_entries
     WHERE school_year = $1
     GROUP BY teacher_id
   ) w ON w.teacher_id = t.id
   WHERE t.is_active = true;
   ```
   - Uses `idx_schedule_teacher_year` for the subquery

---

## 3. RLS Policy Plan

### Principles

1. **All tables have RLS enabled** — no public access without auth.
2. **Read access**: Authenticated users can read all data (single-school app, no row-level read restrictions).
3. **Write access**: Role-based. `admin` can write everything. `dyrektor` can write most things. `sekretariat` is read-only for most tables.
4. **Owner-based**: Classes respect `owner_id` for update/delete (matching old `wlasciciel` logic).

### Helper Functions

```sql
-- Get current user's role from profiles table
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Check if current user has one of the specified roles
CREATE OR REPLACE FUNCTION public.has_role(allowed_roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = ANY(allowed_roles)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### Example Policies

```sql
-- ============ PROFILES ============
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());


-- ============ SCHOOL TYPES ============
ALTER TABLE public.school_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read school types"
  ON public.school_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage school types"
  ON public.school_types FOR ALL
  TO authenticated
  USING (public.has_role(ARRAY['admin']))
  WITH CHECK (public.has_role(ARRAY['admin']));


-- ============ CLASSES ============
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read classes"
  ON public.classes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin/dyrektor can create classes"
  ON public.classes FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(ARRAY['admin', 'dyrektor']));

CREATE POLICY "Owner or admin can update classes"
  ON public.classes FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(ARRAY['admin']));

CREATE POLICY "Owner or admin can delete classes"
  ON public.classes FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR public.has_role(ARRAY['admin']));


-- ============ TEACHERS ============
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read teachers"
  ON public.teachers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin/dyrektor can manage teachers"
  ON public.teachers FOR ALL
  TO authenticated
  USING (public.has_role(ARRAY['admin', 'dyrektor']))
  WITH CHECK (public.has_role(ARRAY['admin', 'dyrektor']));


-- ============ SCHEDULE ENTRIES ============
ALTER TABLE public.schedule_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read schedule entries"
  ON public.schedule_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin/dyrektor can manage schedule entries"
  ON public.schedule_entries FOR ALL
  TO authenticated
  USING (public.has_role(ARRAY['admin', 'dyrektor']))
  WITH CHECK (public.has_role(ARRAY['admin', 'dyrektor']));


-- Same pattern for: subjects, qualifications, mein_requirements,
-- elective_allocations, professions, name_mappings
```

---

## 4. Auth Flow

```
┌────────────┐   email + password   ┌──────────────────┐
│  Login     │ ─────────────────────► │  Supabase Auth   │
│  Page      │                        │  signInWith      │
│            │ ◄───────────────────── │  Password()      │
│            │   JWT in cookie        │                  │
└────────────┘                        └────────┬─────────┘
                                               │
     ┌─────────────────────────────────────────┘
     │
     ▼
┌────────────────────┐
│  Next.js Middleware │  Reads cookie → refreshes session
│  (every request)   │  Redirects to /login if no session
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Server Component   │  createServerClient() → auth.getUser()
│  or Server Action   │  User's JWT contains role claim
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Supabase Query     │  RLS uses auth.uid() and get_user_role()
│  (with user's JWT)  │  to enforce access policies
└────────────────────┘
```

### Implementation

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    }
  );
}

// lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return response;
}
```

---

## 5. Edge Functions Usage Decision

| Use Case | Decision | Reason |
|---|---|---|
| Auth (login/register/logout) | **No Edge Function** — use Supabase Auth SDK directly | Built-in, no custom logic needed |
| PDF Import | **No Edge Function** — use Next.js API route | Needs `pdf-parse`, `tesseract.js` (heavy Node deps, not Deno-compatible) |
| Excel Export | **No Edge Function** — use Next.js API route | Needs `xlsx` library |
| Assignment Generation | **No Edge Function** — use Server Action | Pure computation, no external API calls |
| Scheduled cleanup | **Consider Edge Function** (future) | For periodic data maintenance |

**Decision**: No Edge Functions in the initial rewrite. All logic runs in Next.js Server Actions or API Routes. Edge Functions can be added later for background jobs.

---

## 6. Realtime Channels

| Use Case | Decision | Reason |
|---|---|---|
| Dashboard live updates | **Optional** — consider for V2 | Would allow real-time dashboard refresh when another user changes data |
| Assignment progress | **No** | Assignment is fast enough to not need streaming |
| Collaborative editing | **No** | Not a multi-user editing scenario |

**Decision**: No Realtime in V1. Dashboard data is fetched on page load and refreshed on navigation. Realtime can be added later if concurrent editing becomes a need.

---

## 7. Migration Plan

### Phase 1: Schema Creation (non-destructive)

1. Create all new tables in Supabase alongside existing Payload tables.
2. Create RLS policies.
3. Create helper functions.
4. Run: `supabase db push` or migration files.

### Phase 2: Data Migration

```sql
-- Example: migrate teachers from Payload to new schema
INSERT INTO public.teachers (id, first_name, last_name, email, phone,
                             employment_type, max_weekly_hours, is_active)
SELECT
  gen_random_uuid(),
  imie,
  nazwisko,
  email,
  telefon,
  etat,
  max_obciazenie,
  aktywny
FROM payload_nauczyciele;

-- Similar for all other entities...
```

3. Verify row counts match.
4. Run parity tests (old API vs new API for same queries).

### Phase 3: Switchover

1. Deploy new app pointing to new tables.
2. Verify all features work.
3. Drop old Payload tables (after grace period).

### Phase 4: Cleanup

1. Remove Payload CMS dependencies from `package.json`.
2. Remove old collection files.
3. Remove Payload config.

### Rollback Plan

- Keep old Payload tables for 30 days after switchover.
- If critical issues found, revert to old app by redeploying previous version.
- Data written to new tables during the grace period would need manual reconciliation.
