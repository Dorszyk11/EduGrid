# 12 — Quality Gates

## 1. Automated Quality Gates (CI Pipeline)

Every PR and every push to `main` must pass ALL of these checks:

| Gate | Tool | Command | Must Pass |
|---|---|---|---|
| **Lint** | ESLint (flat config) | `npm run lint` | Zero errors, zero warnings |
| **Format** | Prettier | `npm run format:check` | All files formatted |
| **Type check** | TypeScript (`tsc --noEmit`) | `npm run typecheck` | Zero errors |
| **Unit tests** | Vitest | `npm run test:unit` | 100% pass |
| **Parity tests** | Vitest | `npm run test:parity` | 100% pass |
| **Integration tests** | Vitest | `npm run test:integration` | 100% pass |
| **E2E tests** | Playwright | `npm run test:e2e` | 100% pass |
| **Build** | Next.js | `npm run build` | Zero errors |

### CI Configuration

```yaml
# Gate order (fast-fail):
# 1. Lint + Format + Typecheck (parallel, fastest)
# 2. Unit tests + Parity tests (parallel, fast)
# 3. Integration tests (needs Supabase, medium)
# 4. Build (medium)
# 5. E2E tests (needs running app, slowest)
```

---

## 2. ESLint Configuration

```typescript
// eslint.config.mjs

import { FlatCompat } from '@eslint/eslintrc';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

const compat = new FlatCompat();

export default tseslint.config(
  ...compat.extends('next/core-web-vitals'),
  ...tseslint.configs.strictTypeChecked,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',

      'no-restricted-syntax': [
        'error',
        {
          selector: 'ConditionalExpression[test.type!="Identifier"][test.type!="MemberExpression"]',
          message: 'No inline ternaries for business logic. Use explicit if/else.',
        },
      ],

      'max-len': ['error', { code: 120, ignoreUrls: true, ignoreStrings: true }],
    },
  },
  {
    plugins: { import: importPlugin },
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            // Domain must NOT import from infrastructure
            {
              target: './src/features/*/domain/**',
              from: './src/features/*/infrastructure/**',
              message: 'Domain layer must not import from infrastructure.',
            },
            // Domain must NOT import from presentation
            {
              target: './src/features/*/domain/**',
              from: './src/features/*/presentation/**',
              message: 'Domain layer must not import from presentation.',
            },
            // Domain must NOT import from lib/supabase
            {
              target: './src/features/*/domain/**',
              from: './src/lib/supabase/**',
              message: 'Domain layer must not import Supabase.',
            },
            // No cross-feature imports
            {
              target: './src/features/assignment/**',
              from: './src/features/teachers/**',
              message: 'No cross-feature imports. Use shared types.',
            },
            // (repeat for all feature pairs)
          ],
        },
      ],
    },
  }
);
```

---

## 3. Prettier Configuration

```json
// .prettierrc
{
  "printWidth": 120,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

---

## 4. Code Coverage Thresholds

```typescript
// vitest.config.ts (coverage section)
coverage: {
  provider: 'v8',
  include: [
    'src/features/**/domain/**/*.ts',
    'src/features/**/application/**/*.ts',
  ],
  exclude: [
    '**/*.test.ts',
    '**/index.ts',
    '**/__legacy__/**',
  ],
  thresholds: {
    // Domain layer: highest coverage requirement
    'src/features/**/domain/**': {
      branches: 95,
      functions: 100,
      lines: 95,
      statements: 95,
    },
    // Application layer: high coverage
    'src/features/**/application/**': {
      branches: 80,
      functions: 90,
      lines: 85,
      statements: 85,
    },
  },
}
```

---

## 5. Performance Budgets

| Metric | Target | Measurement |
|---|---|---|
| **First Contentful Paint (FCP)** | < 1.5s | Lighthouse CI |
| **Largest Contentful Paint (LCP)** | < 2.5s | Lighthouse CI |
| **Cumulative Layout Shift (CLS)** | < 0.1 | Lighthouse CI |
| **Time to Interactive (TTI)** | < 3.0s | Lighthouse CI |
| **Total Blocking Time (TBT)** | < 200ms | Lighthouse CI |
| **Lighthouse Performance Score** | > 90 | Lighthouse CI |
| **JS Bundle Size (initial)** | < 150KB gzipped | `next build` output |
| **Assignment generation time** | < 3s for 50 classes, 30 teachers | Integration test with timer |
| **Dashboard load time** | < 2s (with warm DB) | E2E test with timer |
| **API response time (P95)** | < 500ms | Server-side logging |

### Lighthouse CI Configuration

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000/login",
        "http://localhost:3000/dashboard",
        "http://localhost:3000/przydzial"
      ],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["warn", { "minScore": 0.9 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 1500 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
      }
    }
  }
}
```

---

## 6. Logging & Monitoring

### Server-Side Logging

```typescript
// lib/logger.ts

import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

// Usage in Server Actions:
logger.info({ action: 'generateAssignment', schoolYear, schoolTypeId }, 'Assignment generation started');
logger.error({ error, action: 'saveAssignments' }, 'Failed to save assignments');
```

### Client-Side Error Reporting

```typescript
// app/global-error.tsx
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log to external service (Sentry, LogRocket, etc.)
  // For now, log to console
  console.error('Global error:', error);

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold">Wystąpił nieoczekiwany błąd</h2>
            <button
              onClick={reset}
              className="mt-4 rounded bg-blue-600 px-4 py-2 text-white"
            >
              Spróbuj ponownie
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
```

### Web Vitals Reporting

```typescript
// app/layout.tsx (or a dedicated component)

export function reportWebVitals(metric: {
  id: string;
  name: string;
  value: number;
  label: string;
}) {
  // Send to analytics endpoint
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/vitals', {
      method: 'POST',
      body: JSON.stringify(metric),
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
  }
}
```

---

## 7. PR Checklist

Every pull request must satisfy this checklist before merging:

### Code Quality
- [ ] TypeScript strict mode passes (`npm run typecheck`)
- [ ] ESLint passes with zero warnings (`npm run lint`)
- [ ] Prettier formatting applied (`npm run format:check`)
- [ ] No `any` types
- [ ] No inline ternaries for business logic
- [ ] All imports are absolute (`@/features/...`, `@/shared/...`, `@/lib/...`)
- [ ] 120 character line length respected
- [ ] Explicit `if/else` for business logic branching

### Architecture
- [ ] Domain layer has zero framework imports (no Supabase, no Next.js)
- [ ] No cross-feature imports (features only share via `@/shared/`)
- [ ] Repository interfaces in `domain/ports/`, implementations in `infrastructure/`
- [ ] Use cases in `application/use-cases/`, Server Actions in `presentation/actions.ts`
- [ ] New entities/value objects have proper TypeScript interfaces

### Testing
- [ ] New domain logic has unit tests
- [ ] New use cases have integration tests (if touching DB)
- [ ] Critical user flows have e2e test coverage
- [ ] All existing tests still pass
- [ ] Assignment-related changes pass parity tests

### Performance
- [ ] No N+1 query patterns (batch fetch in repositories)
- [ ] Heavy components use `<Suspense>` boundaries
- [ ] Client components are minimal (prefer Server Components)
- [ ] No unnecessary `useEffect` + `fetch` patterns

### Security
- [ ] Server Actions validate input with Zod
- [ ] Auth check present in all protected Server Actions
- [ ] No secrets in client-side code
- [ ] RLS policies cover new tables

### Documentation
- [ ] Complex domain logic has JSDoc comments explaining "why"
- [ ] New features are added to `02_feature_map.md` if applicable
- [ ] Breaking changes documented in PR description

---

## 8. Branch Strategy

```
main (production)
  │
  ├── develop (integration branch)
  │     │
  │     ├── feature/phase-0-scaffolding
  │     ├── feature/phase-1-auth
  │     ├── feature/phase-2-teachers-crud
  │     ├── feature/phase-2-classes-crud
  │     ├── feature/phase-3-assignment-domain  ★
  │     ├── feature/phase-4-assignment-ui
  │     └── ...
  │
  └── (release branches if needed)
```

- Feature branches off `develop`.
- PRs into `develop` require all quality gates to pass.
- `develop` → `main` on phase completion (after full test suite passes).
- Hotfixes: branch off `main`, merge back to both `main` and `develop`.

---

## 9. Definition of Done

A feature is "done" when:

1. All code is written and passes CI.
2. Unit tests cover domain logic (95%+ coverage).
3. Integration tests verify DB operations.
4. E2E tests cover the happy path.
5. Parity tests pass (for assignment-related features).
6. Code reviewed by at least one other developer.
7. No TODOs left in the code (except explicitly planned future work).
8. Performance budgets met.
9. Accessible: proper ARIA labels, keyboard navigation.
10. Responsive: works on mobile, tablet, desktop.
