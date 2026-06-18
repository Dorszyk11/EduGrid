# Milestone: Hardening + domknięcie audytu (EduGrid)

Data: 2026-06-18 · Branch: `full-refactor` · Deployment: Vercel
Status: zatwierdzony (user), wykonywany po kolei A→B.

## Cel

Domknąć odłożone pozycje audytu (behavior-preserving) oraz dołożyć twardy fundament jakościowy (CI, migracje DB, E2E, aktualizacja zależności). Każdy element niezależny; wykonanie w kolejności od najtańszego/najbezpieczniejszego do najwyższego ryzyka, z siatką bezpieczeństwa (CI + migracje + E2E) przed najtrudniejszą zmianą rdzenia auth (A4).

## Zasady

- Każdy krok = osobny commit, `tsc` + `lint` (0 błędów) + `npm test` zielone.
- Test-first dla każdej zmiany zachowania (A3, A4). Reszta behavior-preserving — siatka testów zielona przed i po.
- SQL parametryzowany; walidacja Zod na granicach API; bez „upraszczania" bezpieczeństwa.
- `.env*` nietykane.

## Część A — Audyt zaległości

### A1 — `[18]` typy w trasie `siatka-szkoly`
Zamiana `any` na właściwe typy + walidacja Zod wejścia (params/body) w `src/app/api/siatka-szkoly/**`. Behavior-preserving. Akceptacja: brak `any`, tsc/lint czyste, istniejące testy zielone.

### A2 — `[3]` status raportu liczony lokalnie
Raport (`/raporty/[typ]` + ewentualna trasa) liczy status realizacji lokalnie zamiast korzystać ze wspólnego źródła prawdy. Przepiąć na `src/lib/ramowePlany.ts` (lub `przydzial`), bez zmiany wyniku. Akceptacja: ten sam output dla danych testowych, dedup logiki, gate'y zielone.

### A3 — `[12]` walidacja kompletności `zgodnoscMein` (test-first)
Trasa `dashboard/zgodnosc-mein` przy niekompletnym planie zwraca ciche `0` zamiast sygnalizować brak danych. Dodać rozróżnienie „brak/niekompletne dane" vs „realne 0" (np. pole `kompletne:boolean`/`braki:[]`). Test charakteryzujący najpierw. Akceptacja: niekompletny plan → jawny sygnał; pełny plan → bez zmian.

### A4 — `[8]` `access.update/delete` Where dla `Klasy` + `Nauczyciele` (test-first, rdzeń auth)
Obecnie `update/delete` są boolean (lub szersze niż read). Wyrównać do wzorca Where per `wlasciciel` (jak `read`), tak by użytkownik nie mógł modyfikować/kasować cudzych rekordów (defense-in-depth, spójność z izolacją multi-tenant). Najpierw test izolacji (A nie modyfikuje/nie kasuje rekordu B). Akceptacja: próba update/delete cudzego rekordu odrzucona; własny — działa; testy izolacji zielone.

## Część B — Hardening (Vercel)

### B1 — CI/CD (GitHub Actions)
Workflow `.github/workflows/ci.yml` na `pull_request` + `push` do `main`/`full-refactor`: `npm ci` → `lint` → `tsc --noEmit` → `test` → `build`. Cache npm. Vercel preview-deploys per PR konfigurowane po stronie Vercel (poza repo). Akceptacja: workflow waliduje się, kroki odpowiadają lokalnym gate'om.

### B3 — Migracje DB (zamiast `push`)
Push synchronizuje schemat w locie — na produkcji/Supabase ryzykowny (nieodwracalne zmiany). Wygenerować initial migration z obecnego schematu (`payload migrate:create`) i udokumentować `npm run migrate` w deployu. Akceptacja: migracja generuje się, build/test zielone; README zaktualizowane o krok migracji.

### A3/B2 kolejność — patrz sekwencja niżej.

### B2 — E2E (Playwright)
Smoke krytycznych ścieżek: logowanie → dashboard → przydział godzin (klik → POST) → realizacja. Minimalny, stabilny zestaw (nie pełne pokrycie). Akceptacja: testy przechodzą lokalnie przeciw `npm run dev`/build; udokumentowane uruchomienie.

### B4 — Zależności (kontrolowany bump)
Bump tylko minor-w-zakresie (`@supabase/supabase-js`, `react`/`react-dom` 19.2.7, `payload*` 3.85, `pg`, `sass`, `zod`, `postcss`, `autoprefixer`). Pełna re-weryfikacja (tsc/lint/test/build). Majory (eslint 10, tailwind 4, typescript 6, jest 30 + sparowany `jest-environment-jsdom`) — ODŁOŻONE jako osobny milestone (wymagają migracji configów). Akceptacja: gate'y zielone po bumpie.

### B5 — Monitoring (opcjonalny)
Vercel Analytics/Speed Insights (lekko) + ewentualnie Sentry dla błędów runtime. Akceptacja: jeśli wdrożone — nie psuje buildu; jeśli pominięte — zanotować decyzję.

## Sekwencja wykonania

`A1 → A2 → B1 → B3 → A3 → B2 → A4 → B4 → (B5)`

Uzasadnienie: najpierw tanie, bezpieczne quick-winy (A1, A2), potem siatka bezpieczeństwa (B1 CI, B3 migracje), następnie zmiana zachowania średniego ryzyka (A3), E2E (B2), a na końcu — już pod ochroną CI/E2E — najtrudniejsza zmiana rdzenia auth (A4) i bump zależności (B4).

## Pułapki

- A4 dotyka rdzenia auth Payload — łatwo zepsuć zapis własnych rekordów; konieczny test izolacji obu kierunków (własny OK, cudzy zablokowany).
- B3: migracje Payload/drizzle pod Supabase pooler — generować przy session-mode (5432); transaction-mode (6543) gubi zapytania parametryzowane introspekcji.
- B4: nie ruszać `.env`; `jest`/`jest-environment-jsdom` muszą mieć zgodny major (zostają na 29).
