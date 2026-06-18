# Spec: przeprojektowanie UI/UX EduGrid

Data: 2026-06-18 · Gałąź: `full-refactor` · Status: zatwierdzony do implementacji

## 1. Cel i kontekst

Podniesienie warstwy prezentacji i UX EduGrid (narzędzie dla administracji szkolnej do
planowania przydziału godzin, zgodność z Dz.U. 2025 poz. 363) do poziomu dopracowanego,
gęstego informacyjnie, godnego zaufania produktu enterprise SaaS. **Nie** przepisujemy aplikacji
od zera — wykonujemy konsekwentniej istniejący, dobry kierunek („ledger", granat/błękit, tokeny + 9 prymitywów).

Audyt (5 agentów, wszystkie 14 ekranów + powłoka + prymitywy) wykazał: fundament jest solidny,
ale duża część ekranów **omija** design system (hardkod kolorów, własne tabele/modale/pola),
a status realizacji jest kodowany **wyłącznie kolorem** (łamie WCAG dla deuteranopii i wymóg briefu).

## 2. Decyzje zatwierdzone (z uzasadnieniem)

1. **Zakres: pełny, jeden przebieg.** System-first → wszystkie ekrany P0→P1→P2, włącznie z lukami
   produktowymi (pula godzin, agregat dashboardu, przepisanie importu) — wszystko na **istniejących
   danych/endpointach**, bez zmian logiki godzin ani kontraktów API.
2. **Kodowanie statusu siatki MEiN: różnica ze znakiem (wariant B).** Komórka pokazuje
   `zrealizowane/docelowe` + nie-kolorowy znacznik: `OK` / `+N` / `−N`. Kolor (token) jest
   wzmocnieniem, nie jedynym kanałem. Najbliższe „księgowej" tożsamości, najgęstsze, dostępne dla daltonistów.
3. **Powłoka: grupowany sidebar + pełny sticky górny pasek (AppBar).** AppBar wchłania breadcrumb +
   tytuł strony + akcje główne (zastępuje rozproszony PageHeader); akcje zawsze pod ręką przy długich siatkach.

## 3. Twarde ograniczenia (niezmienne)

- **Zero zmian** logiki domenowej (`src/lib/przydzial/*`, reguły godzin, plany ramowe, obliczenia),
  kontraktów API i danych. Dotykamy wyłącznie warstwy prezentacji + **kompozycji istniejących** danych/endpointów.
- `tsc` (strict), `npm run lint` (≤ budżet ostrzeżeń), `npm test` — zielone po każdym etapie.
- Testy charakteryzujące (`__tests__`, m.in. 12 testów PlanMeinTabela): zachowujemy testowane
  **zachowanie**; asercje aktualizujemy ostrożnie do nowej struktury markup — nie usuwamy testów „by przeszły".
- Gdzie zasady skilli `frontend-design` / `ui-ux-pro-max` / `emil-design-eng` różnią się od briefu —
  **pierwszeństwo mają skille** (decyzja użytkownika).
- WCAG AA: kontrast ≥ 4.5:1, fokus z klawiatury, hierarchia nagłówków, etykiety/aria, status nie
  samym kolorem, `prefers-reduced-motion`. Animacje tylko `transform`/`opacity` ≤ 300 ms; brak animacji na akcjach klawiaturowych.
- Bez sekretów/.env w kodzie i logach. Walidacja wejścia na granicach (już parametryzowane — nie ruszamy).

## 4. Wykonalność luk produktowych (potwierdzona w kodzie)

- **Pula godzin (przydział):** dane istnieją w `src/lib/hooks/useDaneKlasy.ts` / `PlanMeinTabela`
  (`przydzial`, `dyrektor`, `rozszerzenia`, `assignedDirectorForPlan`). Widżet = tylko prezentacja.
- **Agregat dashboardu:** istnieją endpointy `src/app/api/dashboard/{podsumowanie,wskaznik-ryzyka,
  braki-kadrowe,obciazenie-nauczycieli,zgodnosc-mein,alerty}/route.ts`. Nowy widok = ich **podłączenie**
  (obecny `/dashboard` ich nie używa — pokazuje plan jednej klasy).

## 5. Warstwa systemowa (etap 1 — fundament)

Kolejność celowa: A1–A7 zanim ruszymy ekrany, bo podnoszą jakość całej aplikacji naraz.

### A1 · Helper statusu realizacji — jedno źródło prawdy
- Nowy `src/lib/status-realizacji.ts`: `statusRealizacji(zrealizowane: number, docelowe: number)`
  → `{ ton: 'ok'|'warn'|'danger'|'accent', roznica: number, znak: 'OK' | '+N' | '−N' }`.
- **Progi (1:1 z dzisiejszą logiką — bez zmian):** `suma > docelowe` → `accent`, `+N` (N=suma−docelowe);
  `suma === docelowe` → `ok`, `OK`; `docelowe − suma === 1` → `warn`, `−1`; `docelowe − suma ≥ 2` → `danger`, `−N`.
- Komponent `src/components/ui/KomorkaStatusu.tsx`: render tła-tokenu (`*-bg`) + tekst `z/d` (`tabular-nums`)
  + znak; `aria-label` pełnozdaniowy („komplet" / „nadwyżka N" / „brakuje N").
- Eliminuje 4× zduplikowane progi: `TabelaPlanu.tsx`, `TabelaDoradztwa.tsx`, `GroupSplitSummary.tsx`, `realizacja/page.tsx`.

### A2 · Prymitywy pól formularza
- `src/components/ui/Input.tsx`, `Select.tsx`, `Field.tsx` (Field = label + hint + komunikat błędu +
  `aria-invalid`/`aria-describedby`, fokus-ring tokenowy `--accent`).
- Zastępują hardkodowane `SELECT_CLASS`/`INPUT` w: `siatka-szkoly`, `mapowania`, `klasy`, `nauczyciele`,
  `KlasySection`, `NauczycieleSection`, `przydzial`, `page.tsx` (login).

### A3 · Bazowy `Modal`
- `src/components/ui/Modal.tsx`: focus-trap + Esc + klik-overlay + przywrócenie fokusu + `role="dialog"`/
  `aria-modal`/`aria-labelledby` (wyjęte z `ConfirmDialog`). Overlay z tokenu (`bg-navy/60`), nie `bg-slate-900/60`.
- Migracja na `Modal`: `ConfirmDialog` (refaktor wewnętrzny), `PrzydzielModal`, `ModalPonadprogramowy`,
  bramka `import/mein-pdf`. Kasuje 4× P0 a11y.

### A4 · `DataTable` v2 + wzorzec gęstej macierzy
- Rozszerzenie `DataTable`: `stickyHeader`, `stickyFirstCol`, oznaczenie kolumny sum (separator
  `border-l-2 border-line-strong`), opcjonalny `tfoot` sumy, `role="status"`+`aria-live` w stanach
  loading/error/empty, skeleton-first (już jest — ujednolicić użycie).
- Wzorzec „gęstej macierzy" (dla siatek nieprzenoszalnych na DataTable: realizacja, TabelaPlanu,
  siatka-szkoly): linie **włosowe poziome** zamiast pełnej kratki, sticky `thead`/pierwsza kolumna, `tabular-nums`.

### A5 · Powłoka `AppShell`
- `Sidebar`: grupy + 5 brakujących ekranów; ikony **lucide** (`Icon`) zamiast emoji (`☰ ✕ ▲ ▼`).
  Struktura: `Dashboard` (osobno, góra) → **Planowanie** (Przydział, Realizacja, Dyspozycja) →
  **Analiza** (Raporty, Zapotrzebowanie kadrowe) → **Konfiguracja** (Szkoły, Klasy, Nauczyciele) →
  **Dane MEiN** (Plany MEiN, Siatka szkoły, Mapowania, Import PDF) → **Administracja** (Panel admina).
- `AppBar` (sticky, desktop+mobile): breadcrumb z trasy (mapa `ścieżka→etykieta` z configu nawigacji) +
  tytuł strony + slot akcji. Wchłania dotychczasowy `PageHeader`.
- Mechanizm meta strony: lekki kontekst/hook `usePageChrome({ title, description, actions, breadcrumb })`
  ustawiany przez stronę; `PageHeader` zachowuje API jako cienki adapter (kompatybilność, mniej zmian w stronach).
- `DashboardLayout` → przebudowa na `AppShell`; `motion-reduce` na przejściu sidebara.

### A6 · `Button` v2 + skala odstępów
- Wariant `toggle`/segmented (stan aktywny/nieaktywny) — dla trybów na przydziale/realizacji.
- Usunięcie `active:scale-[0.97]` z reakcji na akcję klawiaturową (zachować efekt tylko dla pointer; lub usunąć).
- Jednolita skala odstępów strony (`PageShell` lub stała klasa kontenera: jeden `p-*` + `space-y-*`) —
  koniec rozjazdu `p-6 md:p-8` vs `p-4 sm:p-6` vs `space-y-6 p-6`.

### A7 · Drobne wspólne (raz, globalnie)
- Znak pustej wartości: `—` (em-dash) wszędzie.
- `<Icon name="back">` zamiast tekstowej strzałki `←` (klasy, nauczyciele).
- Fix literówki `tabular` → `tabular-nums` (klasy:131, nauczyciele:282,316-317).
- `motion-reduce:animate-none` na wszystkich spinnerach/animacjach; `role="status"` na ładowaniu.
- Hook a11y klikalnych komórek: `tabIndex={0}` + `onKeyDown` (Enter/Space) + `:focus-visible`
  (realizacja, TabelaPlanu, GroupSplitCell, dyspozycja).

## 6. Ekrany (etap 2 — po systemie, P0→P1→P2)

Kolejność wg priorytetu (brief): serce → przydział → dashboard → import → dyspozycja → reszta.

### Serce — siatka MEiN
`realizacja/page.tsx`, `PlanMeinTabela`, `plan-mein/TabelaPlanu`, `plan-mein/TabelaDoradztwa`,
`plan-mein/ModalPonadprogramowy`, `GroupSplitCell`, `GroupSplitSummary`, `KafelkiRealizacji`, `WykresKolowyRealizacji`:
- Tokenizacja: koniec `bg-{blue,green,amber,red}-200`, `gray-*`, `sky-*`, `rounded-lg/xl`, `bg-white`,
  `bg-slate-900/60` → tokeny `ok/warn/danger/accent(-bg)`, `surface(-2)`, `line(-strong)`, `rounded-sm/card`.
- Helper statusu (A1) + wariant B we wszystkich 4 miejscach kodowania.
- Sticky nagłówek + sticky kolumna „Przedmiot"; separacja kolumn sum (`Razem`, `Zrealizowane`).
- Typ godziny (zwykła/dyrektorska/rozszerzenie/ponadprogramowa) — znacznik tekstowy/badge nie-kolorowy.
- A11y klawiatury komórek (A7); `ModalPonadprogramowy` na `Modal` (A3).
- `WykresKolowyRealizacji`: `role="img"`+`aria-label`, `motion-reduce`, paleta z tokenów, ujednolicenie progów z komórkami.
- `KafelkiRealizacji`: na `Card` + tokeny; skeleton spójny z resztą.

### Przydział (`przydzial/page.tsx`)
- Całość na system: `Button`/`AppBar`/`ConfirmDialog`(reset)/`useToast`/`Field` (label-e selektorów), tokeny.
- **Widżet puli godzin** (sticky pasek nad tabelą): do wyboru / dyrektorskie / rozszerzenia jako `X/Y`
  (wykorzystane/limit), ton `warn`/`danger` przy zbliżaniu/przekroczeniu — z istniejących danych (sekcja 4).
- Hierarchia akcji: główna (`Generuj`) osobno; tryby jako segmented (`Button` toggle); `Reset` odsunięty (ghost/danger).
- Rozróżnienie błąd≠pustka przy fetchu klas/typów; komunikaty przez `useToast` (aria-live).

### Dashboard (`dashboard/page.tsx`)
- Nowy agregat całoszkolny z 6 endpointów: rząd KPI (zgodność MEiN %, wskaźnik ryzyka, liczba braków,
  nauczyciele przeciążeni) + sekcje: obciążenie nauczycieli, braki kadrowe, alerty, zgodność. Skeleton-first, aria-live.
- Dotychczasowy widok per-klasa (selektory + plan) przeniesiony niżej lub do realizacji (zachować funkcję, zejść z głównego miejsca).

### Import (`import/mein-pdf/page.tsx`, `import/ImportMeinPdf.tsx`)
- `ImportMeinPdf`: pełne przepisanie na tokeny + prymitywy (`Card`/`Button`/`Field`/`DataTable`/`Icon`).
- **Realny progres**: stany `upload → processing/OCR → gotowe` (użyć istniejącego, lecz nieustawianego
  `'processing'`), zamiast fałszywego paska `0%`. Spinner/nieokreślony progres + etykieta etapu; aria-live na wyniku.
- Strefa pliku: albo realne drag&drop, albo uczciwy przycisk wyboru (nie udawana dropzone). Hierarchia przycisków (Pobierz JSON jako wynik = wyraźny).
- Bramka „w budowie" → dostępny **baner** ostrzegawczy nad treścią zamiast blokującego modala (lub `Modal` z A3, jeśli zostaje modal).

### Dyspozycja (`dyspozycja/page.tsx`, `PrzydzielModal`)
- Tabela na `DataTable` v2 + `StatusPill`/tekst dla „Do przydzielenia" (status nie kolorem); a11y komórek;
  `tabular-nums`; suma w `tfoot`; usunięcie surowego `id` klasy z UI.
- `PrzydzielModal`: na `Modal` (A3); pole numeryczne (stepper) sprzężone z suwakiem; widoczna pula „Do
  przydzielenia: N" + konsekwencja zapisu; aria-live komunikatów; rozróżnienie błąd≠pustka.

### Reszta
- `klasy`(+`[id]`), `przedmioty/[id]`, `szkoly`: `Field`/`Select`, jednolite odstępy, `tabular-nums`,
  jawny pusty stan (`klasy/[id]` `return null` → komunikat), `przedmioty/[id]` „Podział na klasy" gęściej (sumy odróżnione).
- `nauczyciele/page.tsx`: dociągnąć do `nauczyciele/[id]` (Button, `ConfirmDialog` przed usunięciem,
  `useToast`, `AsyncSection`, błąd≠pustka) **lub** skonsolidować oba widoki — decyzja na etapie implementacji,
  preferencja: konsolidacja jeśli bezpieczna.
- `plany-mein`: `PageHeader`, sticky kolumna, wiersz „dyspozycja dyrektora" ze znacznikiem nie-kolorowym, pusty stan.
- `siatka-szkoly`: `StatusPill`/ikona dla „brak nauczyciela" (P0), linie włosowe zamiast kratki, `Field`/`Select`,
  skeleton w kształcie tabeli, `Card`, `tabular-nums`, rok jako select.
- `mapowania`: `Badge`→`StatusPill`; zweryfikować/poprawić link „Dodaj mapowanie" (panel bez sekcji mapowań).
- `panel-admin` (+`KlasySection`,`NauczycieleSection`): błąd≠pustka, skeleton, `Field`/`Select`, tabele na
  `DataTable`, `role="group"` dla multi-select, fallback `?? 18` → `—`.
- `raporty`(+`[typ]`): karty na `Card`, rok jako `Select`, tabele na `DataTable` (puste stany/sumy),
  baner amber `amber-*`/`rounded-lg` → `warn`/`rounded-card`, disabled-linki dostępnie, stan eksportu,
  martwy typ „arkusz-organizacyjny" → „wkrótce" lub ukryć.
- `page.tsx` (login): `Field`/`Input` + tokeny; `role="alert"` na błędzie + `aria-invalid`; landing zalogowanego (`text-5xl` hero) → zwięzły, bez marnowania przestrzeni i bez ciemnego przycisku „Panel Administracyjny".

## 7. Implementacja i weryfikacja

- **Workflow** (ultracode): etap system-first jako blok z weryfikacją gate'ów (`tsc`+`lint`+`test`+`build`),
  potem ekrany **pipeline'em** (per-ekran: zmiana → `tsc`/`lint`/`test`) z adwersaryjną weryfikacją braku regresji
  (szczególnie wizualnej/funkcjonalnej siatki MEiN vs testy charakteryzujące).
- QA wizualne kluczowych ekranów (Playwright) przed/po, gdzie ryzyko regresji wysokie (siatka MEiN, przydział, dashboard).
- Commity na sensownych checkpointach na `full-refactor` (bez merge do `main`, bez deployu — zgodnie z wcześniejszą decyzją).

## 8. Poza zakresem (świadomie)
- Zmiany logiki godzin / reguł MEiN / kontraktów API / schematu danych.
- Pełny widok mobilny (zachowujemy desktop-first; pilnujemy braku rozjazdu na węższych ekranach).
- Budowa nowych funkcji backendowych (import działa — przepisujemy tylko UI; arkusz organizacyjny — „wkrótce", nie budowa).
- Merge do `main` / deploy.
