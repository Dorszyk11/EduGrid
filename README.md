# EduGrid

Aplikacja webowa do **planowania i kontroli przydziału godzin nauczania w szkołach** — zgodnie z ramowymi planami nauczania MEiN (**Dz.U. 2025 poz. 363**). Dyrektor/planista przypisuje godziny do klas i nauczycieli, a aplikacja na bieżąco liczy realizację, nadwyżki/braki, godziny do dyspozycji dyrektora, rozszerzenia i podział na grupy — z wizualizacją zgodności z planem ramowym.

Multi-tenant: każde konto widzi wyłącznie własne dane (izolacja per `wlasciciel`).

---

## Spis treści

- [Funkcje](#funkcje)
- [Stack technologiczny](#stack-technologiczny)
- [Architektura](#architektura)
- [Model domenowy (Dz.U. 2025 poz. 363)](#model-domenowy-dzu-2025-poz-363)
- [Szybki start](#szybki-start)
- [Baza danych (Supabase / PostgreSQL)](#baza-danych-supabase--postgresql)
- [Struktura projektu](#struktura-projektu)
- [Skrypty npm](#skrypty-npm)
- [Testy](#testy)
- [System designu](#system-designu)

---

## Funkcje

- **Przydział godzin do wyboru** — przypisywanie godzin per klasa/rocznik, z limitami `hours_to_choose` i obsługą godzin ponadprogramowych (potwierdzenie modalem).
- **Godziny do dyspozycji dyrektora** — pula dyrektorska per plan, rozdzielana na przedmioty z kontrolą limitu i nadgodzin.
- **Przedmioty w zakresie rozszerzonym** — wspólna pula rozszerzeń (np. liceum/technikum), przydzielana per komórka.
- **Podział na grupy (1 i 2)** — np. język obcy/informatyka liczone osobno dla dwóch grup.
- **Tabela planu MEiN** — interaktywna siatka z kolorowaniem realizacji (plan vs. faktyczne godziny), sumami w roku i wskaźnikiem % godzin dodatkowych.
- **Doradztwo zawodowe** — godziny liczone łącznie dla cyklu (nie per rocznik).
- **Dashboard** — podsumowanie, obciążenie nauczycieli, braki kadrowe, wskaźnik ryzyka, zgodność z MEiN, alerty.
- **Raporty i eksport** — raporty per typ + eksport do XLSX.
- **Import planów MEiN z PDF** — parsowanie PDF (pdf-parse / pdfjs) z OCR (tesseract.js) i mapowaniem nazw przedmiotów.
- **Zapotrzebowanie kadrowe / dyspozycja** — analiza obsady i dyspozycyjności nauczycieli wg kwalifikacji.
- **Uwierzytelnianie** — logowanie/rejestracja z JWT (jose), hasła weryfikowane stałoczasowo.

## Stack technologiczny

| Warstwa | Technologia |
|--------|-------------|
| Framework | **Next.js 16** (App Router, `next build --webpack`) |
| UI | **React 19**, TypeScript (strict), Tailwind CSS 3.4, Sass |
| CMS / ORM | **Payload CMS 3** (`@payloadcms/db-postgres`, drizzle) |
| Baza | **PostgreSQL** (Supabase pooler) |
| Auth | Payload Users + JWT (`jose`), hasła stałoczasowo |
| Walidacja | **Zod** na granicach tras API |
| Import/Eksport | pdf-parse, pdfjs-dist, tesseract.js, xlsx |
| Testy | **Jest 29** + React Testing Library (jsdom) |
| Ikony | lucide-react |

## Architektura

### Kolekcje Payload (`src/collections/`)

| Kolekcja | Rola |
|----------|------|
| `Users` | konta/administracja, logowanie |
| `TypySzkol` | typy szkół (podstawowa, liceum, technikum, branżowa…) |
| `Przedmioty` | przedmioty nauczania |
| `Klasy` | klasy (z typem szkoły, rocznikiem) |
| `Nauczyciele` | nauczyciele i ich kwalifikacje |
| `SiatkiGodzinMein` | siatki godzin wg planów ramowych MEiN |
| `Kwalifikacje` | kwalifikacje przedmiotowe |
| `RozkladGodzin` | rozkład/przydział godzin |
| `Zawody` | zawody (dla techników/branżowych) |
| `MapowaniaNazw` | mapowania nazw przedmiotów (import/normalizacja) |
| `PrzydzialGodzinWybor` | przydział „godzin do wyboru”, dyrektorskich, rozszerzeń, podziału na grupy per klasa |

Wszystkie kolekcje danych są **izolowane per konto** (`wlasciciel`) — odczyt/zapis ograniczony do właściciela (wzorzec `access.read/create` oparty na Where).

### Strony (`src/app/`)

`/` (logowanie/start) · `/dashboard` · `/szkoly` · `/klasy` · `/nauczyciele` · `/przydzial` · `/realizacja` · `/dyspozycja` · `/zapotrzebowanie-kadrowe` · `/raporty` · `/plany-mein` · `/siatka-szkoly` · `/mapowania` · `/panel-admin`

### Trasy API (`src/app/api/`)

- **auth**: `login`, `logout`, `me`, `register`, `warmup`
- **dashboard**: `podsumowanie`, `obciazenie-nauczycieli`, `braki-kadrowe`, `wskaznik-ryzyka`, `zgodnosc-mein`, `alerty`
- **przydział**: `przydzial-godzin-wybor`, `przydzial/generuj`, `przydzial/zapisz`, `przydzial/przydziel-godziny-rozszerzen`
- **zasoby**: `klasy`, `nauczyciele`, `przedmioty`, `typy-szkol`, `siatka-szkoly`, `mapowania` (+ trasy `[id]`)
- **import/eksport**: `import/mein-pdf`, `export/xls`
- **dyspozycja**: `dyspozycja/przydziel`
- **seed** (dev): `seed`, `seed/ramowe-plany`, `seed/reset-and-schools`

Wejście walidowane Zodem; błędy domenowe zwracane przez wspólny `errorResponse` (bez wycieku szczegółów). Autoryzacja przez `requireUserId`.

### Logika domenowa (`src/lib/`)

- `przydzial/` — rdzeń godzin: reguły (`reguly.ts`), plany MEiN (`plany-mein.ts`), helpery tabeli (`tabelaHelpers.tsx`), typy.
- `ramowePlany.ts` — jedno źródło prawdy czystych funkcji planów (współdzielone przez dyspozycję i realizację).
- `dyspozycja/` — obliczenia dyspozycyjności.
- `auth/` — `haslo.ts` (weryfikacja stałoczasowa).
- `api/` — `guard` (`requireUserId`), `ownership`.
- `errors/`, `validation/`, `hooks/` (np. `useResource`, `useConfirm`, `useDaneKlasy`), `supabase/`.

### Komponenty (`src/components/`)

- `ui/` — prymitywy systemu designu (Card, PageHeader, Button, DataTable, StatusPill, Icon, ConfirmDialog, Toast, AsyncSection).
- `dashboard/` — m.in. `PlanMeinTabela` (orkiestrator) rozbity na `plan-mein/{TabelaPlanu, TabelaDoradztwa, ModalPonadprogramowy}` + hook `useDaneKlasy`.
- `layout/`, `admin/`, `auth/`, `dyspozycja/`, `import/`.

## Model domenowy (Dz.U. 2025 poz. 363)

Aplikacja odwzorowuje ramowe plany nauczania:

- **Godziny do wyboru** (`hours_to_choose`) — pula przydzielana przez planistę.
- **Godziny do dyspozycji dyrektora** — odrębna pula per plan.
- **Zakres rozszerzony** — wspólna pula rozszerzeń (np. technikum/liceum 8 h).
- **Doradztwo zawodowe** — liczone łącznie dla całego cyklu.
- **Specyfika technikum** — w klasie V zablokowane zwykłe „godziny do wyboru” dla geografii/biologii/chemii/fizyki (dozwolone tylko dyrektorskie/rozszerzone); w klasie I przedmiot do wyboru.

Dane planów: `src/utils/import/ramowe-plany.json`.

## Szybki start

### Wymagania

- Node.js (LTS) i npm
- Konto/projekt **Supabase** (PostgreSQL)

### Konfiguracja

1. Skopiuj `.env.example` do `.env` i uzupełnij (plik `.env` **nie** trafia do gita):

   ```env
   # Supabase: Project Settings → Database → Connection string (URI), pooler
   DATABASE_URI=postgresql://postgres.[PROJECT-REF]:[HASLO]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require

   # Sekret JWT — wygeneruj: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   PAYLOAD_SECRET=

   PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000
   ```

2. Instalacja i uruchomienie:

   ```bash
   npm install
   npm run dev          # tryb deweloperski (http://localhost:3000)
   npm run build        # build produkcyjny
   npm start            # serwer produkcyjny
   ```

3. (Opcjonalnie) zasianie danych testowych: `npm run seed`.

## Baza danych (Supabase / PostgreSQL)

- **Schemat** zarządzany przez Payload (tryb `push` — synchronizacja schematu z definicji kolekcji; brak osobnych plików migracji w repo). Skrypt `npm run migrate` dostępny dla podejścia migracyjnego.
- **Pooler**: zalecany **session mode (port 5432)** — w transaction mode (6543) PgBouncer cicho odrzuca zapytania parametryzowane używane przez introspekcję drizzle. `pool.max:2`, `connectionTimeoutMillis:10s` (zimny pooler nie blokuje wtedy ładowania aplikacji w „pending”).
- **SSL** (deploy) — gdy pojawi się `self-signed certificate in certificate chain`:
  - `DB_SSL_MODE=require`
  - `DB_SSL_SELF_SIGNED=true`
  - sterowanie wprost: `DB_SSL_REJECT_UNAUTHORIZED=false|true`
  - domyślnie (`DB_SSL_MODE=auto`) SSL dla zdalnych hostów.
- Test połączenia: `npm run test:db`.

## Struktura projektu

```
EduGrid/
├─ payload.config.ts          # konfiguracja Payload (kolekcje, adapter PG/Supabase)
├─ src/
│  ├─ app/                     # Next.js App Router (strony + /api)
│  ├─ collections/             # 11 kolekcji Payload
│  ├─ components/              # ui/, dashboard/ (plan-mein/), layout/, admin/, …
│  ├─ lib/                     # przydzial/, dyspozycja/, auth/, api/, validation/, hooks/, …
│  ├─ utils/import/            # ramowe-plany.json + parsery importu
│  └─ payload.config.ts        # re-eksport dla Next.js
├─ __tests__/                  # testy Jest + RTL
└─ scripts/                    # narzędzia (seed, clean, testy)
```

## Skrypty npm

| Skrypt | Opis |
|--------|------|
| `npm run dev` | serwer deweloperski |
| `npm run build` | build produkcyjny (`next build --webpack`) |
| `npm start` | serwer produkcyjny |
| `npm run lint` | ESLint |
| `npm test` | testy (Jest, `--runInBand`) |
| `npm run test:db` | test połączenia z bazą |
| `npm run generate:types` | generowanie typów Payload |
| `npm run seed` | dane testowe |

## Testy

Jest 29 + React Testing Library (jsdom per plik przez docblock `@jest-environment jsdom`).
Pokrycie obejmuje m.in. rdzeń godzin (`src/lib/przydzial`), reguły domenowe, helpery tabeli oraz testy charakteryzujące/regresyjne komponentów (np. `PlanMeinTabela`: tryby przydziału, doradztwo, modal ponadprogramowy, podział na grupy).

```bash
npm test
```

## System designu

Kierunek **enterprise SaaS**: granatowa paleta (`#1e293b`/`#0f172a`) + akcent (`#2563eb`), gęste dane, sygnatura „ledgerowa” (siatka + `tabular-nums`). Tokeny w `src/app/globals.css` i `tailwind.config.js`; webfonty przez `next/font` (Space Grotesk + Inter). Animacje wyłącznie `transform`/`opacity`, ≤300 ms, z poszanowaniem `prefers-reduced-motion`. Dostępność: WCAG AA (kontrast 4.5:1, fokus klawiatury, hierarchia nagłówków).
