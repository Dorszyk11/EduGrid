# EduGrid — pass jakościowy, SP1: Fundament (wspólna infrastruktura)

Data: 2026-06-17
Branch: `refactor/p0-izolacja-multitenant`
Status: design zaakceptowany do spisania, czeka na review użytkownika przed planem implementacji.

## Kontekst i problem

Po Fazie 2 (redesign) recolor był mechaniczny — kolory są na tokenach, ale jakość kodu/prezentacji wciąż nosi znamiona „AI slop":

- Ekrany nie używają istniejących prymitywów (`Card`, `PageHeader`, `DataTable`, `Button`) — powielony boilerplate loading/empty/error na ~10 stronach, surowe `<table>`.
- `17×` `any` / `confirm()` / `alert()` w 6 plikach (np. `useState<any>`, natywne `confirm()` do usuwania, `alert()` przy błędzie eksportu).
- Emoji jako ikony akcji (➕ 🔄 📥 ✅ ⚠️ 📄 ℹ️ ←) zamiast spójnego systemu.
- Monolity >500 linii (`PlanMeinTabela` 1583, `panel-admin` 677, `dyspozycja` 649, `realizacja` 537, `zapotrzebowanie-kadrowe` 535).

## Dekompozycja całości (kontekst — nie zakres tego spec)

Praca dzieli się na trzy pod-projekty, każdy z własnym spec → plan → implementacja, w kolejności **A (od fundamentu w górę)**:

- **SP1 — Fundament (TEN dokument):** wspólna infrastruktura (ikony, dialog, toast, typy, hook zasobu).
- **SP2 — Pass jakościowy ekranów:** ~10 przemalowanych stron na prymitywy + SP1.
- **SP3 — Rozbicie monolitów:** RTL + testy charakteryzujące najpierw, potem behavior-preserving split (panel-admin, dyspozycja, realizacja, zapotrzebowanie-kadrowe, na końcu PlanMeinTabela).

## Decyzje (zatwierdzone z użytkownikiem)

1. Zakres całości: pełny, z monolitami.
2. Kontrakt monolitów (SP3): testy charakteryzujące najpierw, potem podział bez zmian zachowania.
3. Ikony: `lucide-react` na ikony **akcji**; **Sidebar zostaje na swoich bespoke ikonach domenowych** (dashboard/przydzial/… „w duchu siatki" — lucide ich nie ma). Cienki wrapper `<Icon>`.
4. Dialogi/feedback: `<ConfirmDialog>` (modal) + system `Toast`.
5. Typy: ręcznie pisane typy odpowiedzi w `src/types/api.ts` (zgodne z tym, co trasy realnie zwracają — kształty zmapowane, nie surowe kolekcje Payload).

## Zakres SP1 (co budujemy teraz)

### 1. Ikony — `lucide-react` + `<Icon>` wrapper
- Dodać zależność `lucide-react`.
- `src/components/ui/Icon.tsx`: cienki wrapper z mapą nazw semantycznych → komponenty lucide. Domyślnie `size=16`, `strokeWidth=1.75` (spójne z Sidebarem), `aria-hidden` chyba że podano `label` (wtedy `role="img"` + `aria-label`). Prop `className`, `size`.
- Mapa nazw (audyt obecnych emoji + potrzeby ekranów): `plus`→Plus, `reset`→RotateCcw, `download`→Download, `success`→CheckCircle2, `warning`→AlertTriangle, `info`→Info, `back`→ArrowLeft, `trash`→Trash2, `chevron-right`→ChevronRight, `chevron-down`→ChevronDown, `close`→X, `file`→FileText, `chart`→BarChart3, `external`→ArrowUpRight. (Dokładny zbiór domknąć przy implementacji wg realnych call-site’ów.)
- Callsite: `<Icon name="trash" />`, `<Icon name="warning" size={20} className="text-warn" />`.
- **Nie zmieniamy Sidebara** (jego `NavIcon` zostaje).

### 2. `<ConfirmDialog>` + `useConfirm()`
- `src/components/ui/ConfirmDialog.tsx` — komponent kontrolowany: `open`, `title`, `description?`, `confirmLabel='Potwierdź'`, `cancelLabel='Anuluj'`, `tone: 'danger'|'default'='default'`, `onConfirm`, `onCancel`, `loading?`.
- Zachowanie: nic gdy zamknięty; overlay `bg-slate-900/60`; panel `bg-surface rounded-card shadow-pop`. Focus na przycisk akcji przy otwarciu, **focus-trap** (Tab cyklicznie w obrębie), `Esc`→`onCancel`, klik w overlay→`onCancel`, przywrócenie focusu na element wyzwalający po zamknięciu. `role="dialog"`, `aria-modal`, `aria-labelledby`/`aria-describedby`. Przyciski = `Button` (`danger`/`primary` + `secondary`).
- Ergonomia: hook `useConfirm()` (`src/lib/hooks/useConfirm.ts`) zwraca `{ confirm, dialog }`, gdzie `confirm(opts): Promise<boolean>`. Call-site zamiast `if (!confirm('...')) return;` →
  ```ts
  if (!(await confirm({ title: 'Usunąć typ szkoły?', tone: 'danger', confirmLabel: 'Usuń' }))) return;
  ```
  a w JSX renderujemy `{dialog}`.

### 3. System `Toast`
- `src/components/ui/Toast.tsx` (+ provider) i `src/lib/hooks/useToast.ts`.
- `ToastProvider` montowany w root layoutcie; portal do `body`; stos w prawym górnym rogu.
- `useToast()` → `{ toast }` z `toast.success(msg)`, `toast.error(msg)`, `toast.info(msg)`. Auto-dismiss ~4 s, ręczne zamknięcie (`<Icon name="close" />`), tokeny (`ok`/`danger`/`ink`/`surface`/`line`).
- A11y: sukces/info `role="status"` `aria-live="polite"`; błąd `role="alert"` `aria-live="assertive"`. Wejście tylko `opacity` przy `prefers-reduced-motion: reduce` (bez ruchu).

### 4. Typy odpowiedzi API — `src/types/api.ts`
- Ręcznie pisane typy **dokładnie tego, co trasy zwracają** (kształty zmapowane). Wyprowadzone z kodu mapującego w `src/app/api/**` podczas implementacji. Co najmniej:
  - `NauczycielSzczegoly` (nauczyciel + `podsumowanie` + `kwalifikacje[]` + `obciazenie[]`),
  - `PrzedmiotSzczegoly`, `KlasaSzczegoly`,
  - `RaportZgodnoscMein`, `RaportObciazenia`, `RaportBrakiKadrowe` (przeniesienie inline-typów z `raporty/[typ]` do współdzielonych),
  - typy używane w `panel-admin` (3× `any`).
- Cel: **0 wystąpień `any`** w dotkniętych plikach (SP1 dostarcza typy; SP2 je podpina). Reużycie istniejących z `src/types/domain.ts` gdzie pasują.

### 5. Hook zasobu — `useResource<T>`
- `src/lib/hooks/useResource.ts`: `useResource<T>(fetcher, deps)` → `{ data, loading, error, reload }`, typowany, z anulowaniem (AbortController) i jednolitą obsługą błędów. Usuwa powielony boilerplate `fetch`+`setLadowanie`+`try/catch` ze stron-szczegółów.
- `src/components/ui/AsyncSection.tsx`: lekki wrapper renderujący spójny stan `loading` (spinner na tokenach) / `error` (banner) dla treści NIE-tabelarycznej (strony szczegółów). Tabele nadal używają wbudowanych stanów `DataTable`.
- SP1 dostarcza hook+wrapper; **podpięcie na stronach to SP2**.

### 6. Testy SP1 (RTL — dokładamy tu, reużyjemy w SP3)
- Dodać dev-deps: `jest-environment-jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`.
- Testy komponentowe (z docblockiem `@jest-environment jsdom`, bez przebudowy globalnej konfiguracji jest, by testy node/API/lib działały jak dotąd):
  - `ConfirmDialog`: otwarcie/zamknięcie, `Esc`→cancel, klik overlay→cancel, `onConfirm` po kliknięciu, focus na przycisku akcji, trap Tab.
  - `Toast`: pojawienie się, auto-dismiss, ręczne zamknięcie, `aria-live`.
  - `useResource`: stan loading→data, ścieżka błędu, `reload`.

## Architektura i granice

| Jednostka | Co robi | Zależy od | Plik |
|---|---|---|---|
| `Icon` | Renderuje ikonę akcji ze spójnym rozmiarem/stroke/a11y | lucide-react | `src/components/ui/Icon.tsx` |
| `ConfirmDialog` | Dostępny modal potwierdzenia | `Button`, tokeny | `src/components/ui/ConfirmDialog.tsx` |
| `useConfirm` | Imperatywne `confirm(): Promise<boolean>` | `ConfirmDialog` | `src/lib/hooks/useConfirm.ts` |
| `ToastProvider`/`useToast` | Globalny, dostępny feedback | tokeny, portal | `src/components/ui/Toast.tsx`, `src/lib/hooks/useToast.ts` |
| `useResource` | Typowany fetch + loading/error/reload | — | `src/lib/hooks/useResource.ts` |
| `AsyncSection` | Spójny loading/error dla treści nie-tabelarycznej | tokeny | `src/components/ui/AsyncSection.tsx` |
| typy API | Kontrakt odpowiedzi tras | `domain.ts` | `src/types/api.ts` |

Każda jednostka testowalna/zrozumiała niezależnie; brak zależności od konkretnej strony. `ToastProvider` jest jedynym punktem dotykającym root layout w SP1.

## Poza zakresem SP1 (świadomie)
- Refaktor ekranów na prymitywy i podpięcie SP1 (→ SP2).
- Rozbicie monolitów i testy charakteryzujące krytycznych ścieżek (→ SP3).
- Migracja Sidebara do lucide (zostaje na bespoke ikonach).
- Zmiany logiki domenowej / reguł godzin (zgodność z Dz.U. 2025 poz. 363 — bez zmian).

## Kryteria akceptacji SP1
- `lucide-react` dodany; `<Icon>` z mapą nazw, domyślny rozmiar/stroke/a11y.
- `ConfirmDialog` + `useConfirm` z focus-trap, Esc, klik-overlay, przywróceniem focusu; pokryte testami RTL.
- `Toast` (provider + hook), auto-dismiss, a11y `aria-live`, reduced-motion; pokryte testami RTL.
- `src/types/api.ts` z typami odpowiedzi (gotowe do podpięcia w SP2).
- `useResource` + `AsyncSection` z testem `useResource`.
- RTL skonfigurowane bez psucia testów node/API/lib.
- Bramki zielone: `next build`, `tsc --noEmit`, ESLint **0 błędów**, wszystkie testy (49 dotychczasowych + nowe SP1) przechodzą.
- Brak zmian w zachowaniu istniejących ekranów (SP1 tylko dodaje infrastrukturę; nie podpina jej jeszcze).

## Ryzyka
- Konfiguracja jest dla dwóch środowisk (node + jsdom) — mitygacja: docblock `@jest-environment jsdom` per-plik, bez globalnej zmiany.
- `lucide-react` vs React 19 / Next 16 — zweryfikować kompatybilność wersji przy instalacji.
- Focus-trap napisany ręcznie bywa źródłem subtelnych błędów a11y — pokryty testami; trzymać się minimalnej, sprawdzonej implementacji.
