# REFRACTOR_PLAN — EduGrid

> Dokument Kroku 0 (rozpoznanie). Bez zmian w kodzie. Stan na: 2026-06-14.
> Stack: Next.js 16.2.1 / React 19 / TS (strict) / Payload CMS 3.78 / PostgreSQL (Supabase pooler).

## 1. Metoda

Dwufazowo. **Faza 1 = kod i funkcjonalność** (ten plan). **Faza 2 = redesign** — dopiero po akceptacji Fazy 1.
Praca w małych branchach: jeden moduł / jeden spójny problem = jeden branch + commit(y). Po każdym module: build + lint + test zielone, krótki dowód weryfikacji.

## 2. Baseline (zmierzony)

| Komenda | Wynik |
|---|---|
| `npm run build` | ✓ exit 0, kompilacja ~12.5s, TypeScript OK, 47 tras |
| `npm run lint` | 10 warningów, 0 błędów — **wszystkie to `react-hooks/exhaustive-deps`**; próg `--max-warnings 50` maskuje narastanie |
| `npm test` | 1 suite / 4 testy (tylko `register`, na mocku), 0.6s; Jest „force exiting" = otwarte uchwyty (pool DB) |

**Wniosek:** „zielony build" jest mylący. Aplikacja kompiluje się, ale rdzeń logiki ma 0 testów, a izolacja danych jest nieegzekwowana.

### Sygnały AI slop (zmierzone)
- **`any`: 97 wystąpień w 33 plikach** (najgorsze: `api/siatka-szkoly/route.ts` 11, `api/export/xls` 10, `Top5Listy` 8, `RozkladGodzin`/`automatycznyRozdzialGodzin` po 6).
- **Puste `catch`: 6** (5× `PlanMeinTabela.tsx`: 288/363/411/461/474, 1× `klasy/[id]/page.tsx:55`).
- **`console.*`: 105 w 49 plikach** (m.in. `seed` 19, `meinPdfProcessor` 11, `pdfExtractor` 6).
- **Pliki >500 linii (CLAUDE.md: limit 500):** `PlanMeinTabela.tsx` **1651**, `panel-admin/page.tsx` 677, `dyspozycja/page.tsx` 649, `hooks/useGroupSplit.ts` 646, `automatycznyRozdzialGodzin.ts` 604, `przypisywanieNauczycieli.ts` 568, `zapotrzebowanie-kadrowe/page.tsx` 535, `realizacja/page.tsx` 525.
- **Zod**: dependency obecny, ale używany tylko w 2 plikach (`lib/validation/index.ts`, `utils/import/validator.ts`) — **nieobecny na granicach API**.
- **Brak wygenerowanego `payload-types.ts`** — `payload.config` wskazuje plik wyjściowy, ale `generate:types` nigdy nie uruchomiono. Brak typów wierszy z Payload = systemowe źródło `any`. `src/types/payload.ts` to tylko `Payload = Awaited<ReturnType<typeof getPayload>>`.
- Martwy kod: `Klasy.numer_klasy` „(nieużywane)", `condition: () => true` (Klasy.ts:117), aliasy `@/features` i `@/shared` w `tsconfig` bez istniejących katalogów.
- Tooling: `eslint-config-next@^14` przy `next@16`, `eslint@^8` (EOL).

## 3. Mapa modułów (ocena stanu)

| Moduł | Pliki (gł.) | Stan |
|---|---|---|
| **Izolacja multi-tenant** | wszystkie kolekcje + trasy danych | 🔴 **Zepsuta** — patrz P0-1 |
| Auth / sesje | `api/auth/*`, `utils/auth.ts`, `components/auth/AuthContext` | 🟠 Działa, ale krucha duplikacja Payload (P0-3); cookie flags OK |
| Kolekcje / Payload | `collections/*` | 🟠 `access` przeważnie `() => true`; `any` w `validate`; brak właściciela poza `Klasy`; slug `rozkład-godzin` z „ł" |
| API routes (kontrakt) | `api/*` (31 plików) | 🟠 brak Zod, walidacja ad-hoc, `any`, wyciek `error.message`, duplikacja koercji ID |
| **Rdzeń: przydział godzin** | `automatycznyRozdzialGodzin` (604), `godzinyPlanIPrzydzial` (329), `realizacjaZPrzydzialu` (320), `przypisywanieNauczycieli` (568), `hooks/useGroupSplit` (646) | 🔴 0 testów, logika rozproszona, `any`, wołana redundantnie (N+1 + rekompute). **Najwyższy priorytet po bezpieczeństwie** |
| PlanMeinTabela (UI serca) | `components/dashboard/PlanMeinTabela.tsx` (1651) | 🔴 moloch, logika biznesowa w komponencie, 5× pusty `catch`, `useEffect` z brakującymi zależnościami |
| Dashboard | `api/dashboard/*` (6 tras) + `components/dashboard/*` | 🟠 brak izolacji, N+1, rekompute ciężkich funkcji |
| Zapotrzebowanie kadrowe | `zapotrzebowanie-kadrowe/page` (535), `api/dashboard/braki-kadrowe` | 🟠 logika w UI, brak izolacji |
| Siatka szkoły | `api/siatka-szkoly/*`, `siatka-szkoly/page` | 🟠 route 410 linii / 11× `any`, brak izolacji |
| Nauczyciele | `api/nauczyciele/*`, `nauczyciele/page` (413) | 🔴 całkowicie otwarte, brak właściciela |
| Dyspozycja | `api/dyspozycja/przydziel` (318), `dyspozycja/page` (649) | 🟠 duża strona, surowe zapytania kolumn |
| Realizacja | `realizacja/page` (525), `utils/realizacjaZPrzydzialu` | 🟠 logika w UI |
| Import MEiN PDF | `api/import/mein-pdf`, `utils/import/*` | 🟠 powierzchnia ataku (upload), dużo `console`, `any`; jedyne realne użycie Zod |
| Eksport XLS | `api/export/xls` (203) | 🟠 10× `any`, brak izolacji |
| Mapowania | `api/mapowania`, `mapowania/page` | 🟠 `any`, brak izolacji |
| Panel-admin | `panel-admin/page` (677) | 🟠 moloch kliencki |
| Raporty | `raporty/[typ]/page` (440), `raporty/page` | 🟠 logika w UI |
| Seed | `api/seed/*`, `scripts/seed-*` | 🟡 dev-only (`NODE_ENV` guard, 403 na prod); rozważyć jawną flagę `SEED_ENABLED`; `typy-szkol-test` = martwy mock |

## 4. Lista problemów wg ryzyka

### P0 — Bezpieczeństwo (najpierw)
1. **Izolacja multi-tenant nieegzekwowana (krytyczne wyciek/edycja między kontami).**
   - Wszystkie trasy używają `getPayload({config})` + `payload.find(...)` bez `req`/`user` → **Local API domyślnie omija `access` kolekcji** (`overrideAccess: true`). Reguły `access` są martwe na ścieżce UI.
   - `Nauczyciele` `access: read/create/update/delete => true` + brak pola właściciela; `api/nauczyciele/route.ts:8` GET bez auth → konto A widzi nauczycieli konta B.
   - `Klasy.access.read => true`; `api/klasy/route.ts:29-54` pobiera wszystkie klasy, izolacja tylko kosmetyczna (`can_manage`), bez filtra `where: { wlasciciel }`.
   - `api/dashboard/podsumowanie/route.ts` (i pozostałe dashboardowe) — bez auth, agregują dane wszystkich kont.
   - `getCurrentUserId` użyty tylko w `api/klasy/*`.
2. **Mutujące endpointy bez auth (włączone do P0-1):** trasy zapisu/usuwania nie sprawdzają użytkownika — `przydzial/zapisz`, `nauczyciele` POST, `dyspozycja/przydziel`, `siatka-szkoly/dodaj-godzine`, `klasy` DELETE itd. → każdy może modyfikować dane dowolnego konta. *Korekta po weryfikacji:* `seed/*` są chronione `NODE_ENV==='production'` (403 na prod) — **nie** są otwarte; `typy-szkol-test` to martwy statyczny mock (usunąć, P2).
3. **Kruchość auth:** `api/auth/login/route.ts:67-129` równoległa ścieżka `loginViaDb` (własny `pg.Pool` + introspekcja `information_schema` + ręczne pbkdf2) replikująca wnętrze Payload; przełączanie `:5432`→`:6543` (login) sprzeczne z komentarzem w `payload.config.ts`; `secret: process.env.PAYLOAD_SECRET || ''` (pusty sekret przy braku env zamiast twardego błędu).

### P1 — Poprawność / kontrakt
4. **Brak walidacji wejścia (Zod)** na granicach API — walidacja ad-hoc, niespójna, częściowa.
5. **Obsługa błędów:** wyciek `error.message` do klienta (np. `api/klasy/route.ts:60`), puste `catch` (silent fail), brak spójnej strategii statusów/logowania.
6. **`any`** podkopuje typy (97×) — m.in. `whereConditions: any`, `.map((x: any))`, koercja ID powielana między trasami.
7. **Rdzeń godzin nieotestowany i rozproszony**: `automatycznyRozdzialGodzin` rekompute w `podsumowanie/alerty/braki-kadrowe`, N+1 (`podsumowanie:42-59` pętla po nauczycielach × `find`). Wymaga wydzielenia do deterministycznej, testowanej warstwy.

### P2 — Struktura / utrzymanie
8. **Moloch-komponenty + logika biznesowa w kliencie** (`PlanMeinTabela` 1651 i in.). Rozbić, logikę wyciągnąć do `lib`.
9. **Martwy kod i szum** (`numer_klasy`, `condition:()=>true`, aliasy tsconfig, 105× `console`).
10. **Tooling**: `eslint-config-next@14` vs `next@16`, `eslint@8` (EOL), `--max-warnings 50` maskuje, otwarte uchwyty w Jest.

## 5. Kolejność prac — Faza 1 (od najwyższego ryzyka)

> Każdy punkt: osobny branch, build/lint/test zielone, dowód weryfikacji. Przy każdym dotknięciu bezpieczeństwa — `anthropic-cybersecurity-skills`.

1. **Fundament testów + bezpieczne defaulty** — naprawić Jest (otwarte uchwyty), obniżyć `--max-warnings`, twardy błąd przy braku `PAYLOAD_SECRET`/`DATABASE_URI`. Zod jako wspólna warstwa walidacji (`lib/validation`).
2. **Sprzątanie / defense-in-depth (szybkie)** — usunąć martwy `typy-szkol-test`; (opcjonalnie) jawna flaga `SEED_ENABLED` zamiast samego `NODE_ENV`. Właściwe zabezpieczenie mutacji danych jest w P0-1 (auth + izolacja na każdym endpoincie).
3. **P0-1 Izolacja multi-tenant** — *po decyzji z §7*. Model właściciela na kolekcjach operacyjnych + egzekwowanie w **każdej** trasie danych (filtr po koncie albo `overrideAccess:false` + `user`). Testy izolacji A↔B. **Najtrudniejszy, najważniejszy.**
4. **P0-3 Auth** — ujednolicić ścieżkę logowania (usunąć/wydzielić `loginViaDb` lub uczynić ją jawnym, otestowanym fallbackiem), spójna strategia połączenia DB, przegląd JWT/cookie wg security skilli.
5. **Rdzeń godzin (P1-7)** — wydzielić logikę (dyrektor / do wyboru / rozszerzenia / podział na grupy / generowanie / „Zrealizowane") do czystej, deterministycznej warstwy `lib` + **testy jednostkowe** na realnych przypadkach (przekroczenie puli dyrektora, rozszerzenia bez limitu na rocznik, grupy). Usunąć rekompute/N+1.
6. **Kontrakt API (P1-4/5/6)** — Zod in/out na trasach, spójne błędy, eliminacja `any` w dotykanych trasach.
7. **PlanMeinTabela + molochy (P2-8)** — rozbić, logikę do `lib`, stany loading/empty/error, naprawić `useEffect`/puste `catch`.
8. **Sprzątanie (P2-9/10)** — martwy kod, `console`, tooling.

## 6. Definicja ukończenia Fazy 1

Build + lint + testy zielone; **zero `any` w dotkniętych obszarach**; każdy endpoint danych ma walidację (Zod), autoryzację i izolację per-konto; logika przydziału godzin wydzielona i otestowana; destrukcyjne endpointy zabezpieczone; wszystkie pozycje P0/P1 odhaczone. → **Raport zamknięcia + STOP do akceptacji.**

## 7. Decyzje do potwierdzenia (przed P0-1)

### 7.1 Keystone: czym jest „konto"? — ✅ DECYZJA (2026-06-14): **A) konto = użytkownik**
Izolacja po `wlasciciel = userId`. Najbliżej obecnego kodu (`Klasy.wlasciciel`), najmniejsze ryzyko; role `admin`/`dyrektor`/`sekretariat` zostają na przyszłość; model rozszerzalny później do organizacji bez przepisywania izolacji.
Odrzucone: B) konto = szkoła/organizacja współdzielona (nowa encja `organizacja` + izolacja po `organizacjaId`) — większa zmiana w bazie i auth, niepotrzebna teraz.

### 7.2 Zależne od 7.1: zakres kolekcji
- Pewne **per-konto** (operacyjne): `klasy`, `nauczyciele`, `rozkład-godzin`, `przydzial-godzin-wybor`.
- Pewne **globalne** (rekomendacja): `siatki-godzin-mein` (ramowe plany MEiN wspólne dla wszystkich).
- **Do decyzji:** `typy-szkol`, `przedmioty`, `kwalifikacje`, `zawody`, `mapowania-nazw` — słownik globalny czy konfiguracja per-konto? (pytam po rozstrzygnięciu 7.1)

## 8. Ryzyka i założenia
- **Toolchain Payload (`generate:types`, `migrate`) niedziałający** pod Payload 3.78 + Next 16 (bin ładuje config natywnym `import()` z pominięciem loadera tsx → importy bez rozszerzeń padają; interop `@next/env`). **Decyzja: odłożone.** Skutki dla Fazy 1: typy/walidacja granic przez **Zod (`z.infer`)**; schema przez auto-push (dev) + **ręczny SQL w `/scripts`** (prod, jak istniejące `add-*.sql`). Alignment wersji (Next 15 lub upgrade Payload) = osobne zadanie.
- Migracja danych przy dodaniu właściciela do istniejących kolekcji (istniejące rekordy bez `wlasciciel`) — wymaga strategii (przypisać do konta / oznaczyć legacy).
- `loginViaDb` istnieje z powodu cold-startu `getPayload` na Supabase poolerze — zmiana auth musi zachować działanie w produkcji.
- Brak testów = regresje niewidoczne; dlatego testy idą przed/obok zmian rdzenia.
