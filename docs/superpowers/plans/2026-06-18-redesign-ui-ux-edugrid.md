# EduGrid — przeprojektowanie UI/UX — plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Podnieść warstwę prezentacji i UX EduGrid do poziomu dopracowanego enterprise SaaS — spójność prymitywów/tokenów, dostępność (WCAG AA), dopracowane stany, gęste „ledgerowe" tabele — bez zmiany logiki domenowej, API ani danych.

**Architecture:** Najpierw warstwa systemowa (Faza 1: helper statusu, prymitywy pól, bazowy Modal, DataTable v2, AppShell+AppBar, Button v2, wspólne utils) — podnosi całą apkę naraz i ustala interfejsy. Potem ekrany (Faza 2) konsumują te prymitywy, P0→P1→P2, zaczynając od serca (siatka MEiN). Wszystko to kompozycja istniejących danych/endpointów.

**Tech Stack:** Next.js 16.2.9 (App Router, `next build --webpack`), React 19, TypeScript 6 (strict), Tailwind CSS 4 (`@theme` + tokeny w `globals.css`), Jest 30 + React Testing Library (jsdom), lucide-react (ikony), Payload 3.85 (tylko jako źródło danych przez `/api/*`).

## Global Constraints

- Zero zmian logiki domenowej (`src/lib/przydzial/*`, reguły godzin, plany ramowe, obliczenia), kontraktów API i schematu danych. Tylko prezentacja + kompozycja istniejących danych/endpointów.
- Po każdym zadaniu zielone: `npx tsc --noEmit`, `npm run lint` (skrypt: `eslint "src/**/*.{js,jsx,ts,tsx}" --max-warnings 50`), `npm test`. Przed końcem: `npm run build`.
- Testy charakteryzujące w `__tests__/` (m.in. PlanMeinTabela): zachować testowane ZACHOWANIE; asercje aktualizować ostrożnie do nowej struktury, NIE usuwać testów „by przeszły".
- Tylko tokeny CSS z `globals.css` (kolory `bg/surface/surface-2/ink/ink-soft/ink-faint/line/line-strong/accent/accent-strong/accent-weak/navy*/ok/warn/danger` + `-bg`; promienie `rounded-sm`=4px, `rounded-card`=10px; fonty `font-display/sans/mono`). ZERO hardkodowanych klas kolorów Tailwind (`bg-blue-200`, `text-emerald-700`, `bg-slate-900/60`, `gray-*`, `sky-*`, `rounded-lg/xl`).
- A11y: kontrast ≥ 4.5:1; widoczny `:focus-visible`; hierarchia nagłówków; `aria-label` dla ikon-przycisków; status NIGDY samym kolorem; `prefers-reduced-motion` respektowane; animacje tylko `transform`/`opacity` ≤ 300 ms; brak animacji na akcjach klawiaturowych.
- Komunikaty UI po polsku (formalnie, przystępnie). Identyfikatory kodu po angielsku; nazewnictwo domenowe po polsku (zgodnie z repo).
- Commity na `full-refactor` (bez merge do `main`, bez deployu). BEZ trailera `Co-Authored-By` (`attribution.commit` nieustawione).
- Skille `frontend-design`/`ui-ux-pro-max`/`emil-design-eng` mają pierwszeństwo nad tym planem, gdy ich zasady się różnią.

**Wzorce kanoniczne (naśladować, nie wymyślać):** `src/app/szkoly/page.tsx`, `src/app/nauczyciele/[id]/page.tsx`, `src/app/mapowania/page.tsx` (pełne prymitywy + stany). `src/components/ui/ConfirmDialog.tsx` (focus-trap), `DataTable.tsx` (stany), `StatusPill.tsx` (ton semantyczny).

---

## Mapa plików

**Tworzone (Faza 1):**
- `src/lib/status-realizacji.ts` — helper progów statusu (jedno źródło prawdy)
- `src/components/ui/KomorkaStatusu.tsx` — render komórki statusu (wariant B)
- `src/components/ui/Field.tsx`, `Input.tsx`, `Select.tsx` — prymitywy pól
- `src/components/ui/Modal.tsx` — bazowy dostępny dialog
- `src/components/layout/AppBar.tsx` — sticky górny pasek
- `src/lib/nawigacja.ts` — config grup nawigacji + mapa breadcrumb
- `src/lib/hooks/usePageChrome.ts` + `src/components/layout/PageChromeContext.tsx` — meta strony do AppBar
- `src/lib/hooks/useKomorkaKlawiatura.ts` — a11y klikalnych komórek
- `__tests__/lib/status-realizacji.test.ts`, `__tests__/components/KomorkaStatusu.test.tsx`, `__tests__/components/Modal.test.tsx`

**Modyfikowane (Faza 1):** `src/components/ui/Button.tsx`, `ConfirmDialog.tsx`, `DataTable.tsx`, `PageHeader.tsx`, `src/components/layout/Sidebar.tsx`, `DashboardLayout.tsx`, `src/lib/przydzial/tabelaHelpers.ts` (stała pustej wartości — jeśli istnieje; inaczej w `status-realizacji.ts`).

**Modyfikowane (Faza 2):** ekrany w `src/app/**` i komponenty `src/components/{dashboard,dyspozycja,admin,import}/**` wg zadań 10–23.

---

# FAZA 1 — Warstwa systemowa

### Task 1: A1 — helper statusu realizacji (pure logic, TDD)

**Files:**
- Create: `src/lib/status-realizacji.ts`
- Test: `__tests__/lib/status-realizacji.test.ts`

**Interfaces:**
- Produces:
  - `type TonStatusu = 'ok' | 'warn' | 'danger' | 'accent'`
  - `interface StatusRealizacji { ton: TonStatusu; roznica: number; znak: string; opis: string }`
  - `function statusRealizacji(zrealizowane: number, docelowe: number): StatusRealizacji`
  - `const PUSTA = '—'` (em-dash, wspólna pusta wartość)

**Progi (1:1 z dzisiejszą logiką — NIE zmieniać):** `zrealizowane > docelowe` → `accent`, `roznica = zrealizowane-docelowe`, `znak = '+'+roznica`, `opis = 'nadwyżka '+roznica`; `=== docelowe` → `ok`, `roznica 0`, `znak 'OK'`, `opis 'komplet'`; `docelowe-zrealizowane === 1` → `warn`, `znak '−1'`, `opis 'brakuje 1'`; `docelowe-zrealizowane ≥ 2` → `danger`, `znak '−'+(docelowe-zrealizowane)`, `opis 'brakuje '+(docelowe-zrealizowane)`. Gdy `docelowe === 0`: `ton 'ok'`, `znak 'OK'`, `roznica 0` (brak wymagania).

- [ ] **Step 1: Napisz test (pełne przypadki progów)**

```ts
import { statusRealizacji, PUSTA } from '@/lib/status-realizacji';

describe('statusRealizacji', () => {
  it('komplet: zrealizowane === docelowe', () => {
    expect(statusRealizacji(5, 5)).toEqual({ ton: 'ok', roznica: 0, znak: 'OK', opis: 'komplet' });
  });
  it('nadwyżka: zrealizowane > docelowe', () => {
    expect(statusRealizacji(7, 5)).toEqual({ ton: 'accent', roznica: 2, znak: '+2', opis: 'nadwyżka 2' });
  });
  it('brak 1: docelowe - zrealizowane === 1', () => {
    expect(statusRealizacji(4, 5)).toEqual({ ton: 'warn', roznica: -1, znak: '−1', opis: 'brakuje 1' });
  });
  it('brak ≥2: docelowe - zrealizowane >= 2', () => {
    expect(statusRealizacji(3, 5)).toEqual({ ton: 'danger', roznica: -2, znak: '−2', opis: 'brakuje 2' });
    expect(statusRealizacji(0, 5).znak).toBe('−5');
  });
  it('docelowe 0 → brak wymagania traktowany jako OK', () => {
    expect(statusRealizacji(0, 0)).toMatchObject({ ton: 'ok', znak: 'OK', roznica: 0 });
  });
  it('PUSTA to em-dash', () => { expect(PUSTA).toBe('—'); });
});
```

- [ ] **Step 2: Uruchom — ma FAIL** · Run: `npm test -- status-realizacji` · Expected: FAIL (moduł nie istnieje).
- [ ] **Step 3: Implementacja**

```ts
export type TonStatusu = 'ok' | 'warn' | 'danger' | 'accent';
export interface StatusRealizacji { ton: TonStatusu; roznica: number; znak: string; opis: string; }
export const PUSTA = '—';
const MINUS = '−'; // U+2212

export function statusRealizacji(zrealizowane: number, docelowe: number): StatusRealizacji {
  if (docelowe <= 0) return { ton: 'ok', roznica: 0, znak: 'OK', opis: 'komplet' };
  if (zrealizowane > docelowe) {
    const r = zrealizowane - docelowe;
    return { ton: 'accent', roznica: r, znak: `+${r}`, opis: `nadwyżka ${r}` };
  }
  if (zrealizowane === docelowe) return { ton: 'ok', roznica: 0, znak: 'OK', opis: 'komplet' };
  const brak = docelowe - zrealizowane;
  if (brak === 1) return { ton: 'warn', roznica: -1, znak: `${MINUS}1`, opis: 'brakuje 1' };
  return { ton: 'danger', roznica: -brak, znak: `${MINUS}${brak}`, opis: `brakuje ${brak}` };
}
```

- [ ] **Step 4: Uruchom — ma PASS** · Run: `npm test -- status-realizacji` · Expected: PASS.
- [ ] **Step 5: Commit** · `git add src/lib/status-realizacji.ts __tests__/lib/status-realizacji.test.ts && git commit -m "feat(redesign/A1): helper statusu realizacji — jedno zrodlo prawdy progow"`

---

### Task 2: A1 — komponent `KomorkaStatusu`

**Files:**
- Create: `src/components/ui/KomorkaStatusu.tsx`
- Test: `__tests__/components/KomorkaStatusu.test.tsx`

**Interfaces:**
- Consumes: `statusRealizacji`, `TonStatusu` (Task 1)
- Produces: `function KomorkaStatusu(props: { zrealizowane: number; docelowe: number; className?: string }): JSX.Element`. Render: `<td>`-friendly `<span>` z tłem tonu (`bg-{ok|warn|danger|accent}-bg` przez mapę — accent używa `accent-weak`), tekst `z/d` (`tabular-nums`) + znak; `aria-label` = `"{z} z {d}, {opis}"`. Mapa tonów → klasy w jednym miejscu (reużyta także przez StatusPill koncepcyjnie).

- [ ] **Step 1: Test renderu (kolor NIE jest jedynym kanałem)**

```tsx
import { render, screen } from '@testing-library/react';
import KomorkaStatusu from '@/components/ui/KomorkaStatusu';

it('pokazuje liczby, znak i dostępny opis', () => {
  render(<KomorkaStatusu zrealizowane={4} docelowe={5} />);
  expect(screen.getByText('4 / 5')).toBeInTheDocument();
  expect(screen.getByText('−1')).toBeInTheDocument();
  expect(screen.getByLabelText('4 z 5, brakuje 1')).toBeInTheDocument();
});
it('nadwyżka ma znak +N', () => {
  render(<KomorkaStatusu zrealizowane={7} docelowe={5} />);
  expect(screen.getByText('+2')).toBeInTheDocument();
});
```

- [ ] **Step 2: FAIL** · `npm test -- KomorkaStatusu`
- [ ] **Step 3: Implementacja**

```tsx
import { statusRealizacji, type TonStatusu } from '@/lib/status-realizacji';

const TON_BG: Record<TonStatusu, string> = {
  ok: 'bg-ok-bg text-ok',
  warn: 'bg-warn-bg text-warn',
  danger: 'bg-danger-bg text-danger',
  accent: 'bg-accent-weak text-accent-strong',
};

export default function KomorkaStatusu({ zrealizowane, docelowe, className = '' }:
  { zrealizowane: number; docelowe: number; className?: string }) {
  const s = statusRealizacji(zrealizowane, docelowe);
  return (
    <span
      aria-label={`${zrealizowane} z ${docelowe}, ${s.opis}`}
      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-sm font-semibold tabular-nums ${TON_BG[s.ton]} ${className}`}
    >
      <span>{zrealizowane} / {docelowe}</span>
      <span aria-hidden className="opacity-80">·</span>
      <span aria-hidden>{s.znak}</span>
    </span>
  );
}
```

- [ ] **Step 4: PASS** · `npm test -- KomorkaStatusu`
- [ ] **Step 5: Commit** · `git add src/components/ui/KomorkaStatusu.tsx __tests__/components/KomorkaStatusu.test.tsx && git commit -m "feat(redesign/A1): komponent KomorkaStatusu (wariant B: liczba + znak)"`

---

### Task 3: A2 — prymitywy pól `Field` / `Input` / `Select`

**Files:**
- Create: `src/components/ui/Field.tsx`, `src/components/ui/Input.tsx`, `src/components/ui/Select.tsx`
- Test: `__tests__/components/Field.test.tsx`

**Interfaces:**
- Produces:
  - `Input`: `forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>` — klasy: `w-full px-3 py-2 rounded-sm border bg-surface text-ink`, border `border-line-strong`, `focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent`, invalid → `border-danger`.
  - `Select`: jak `Input`, dla `<select>` (`SelectHTMLAttributes`).
  - `Field`: `{ label: string; htmlFor: string; hint?: string; error?: string; required?: boolean; children: ReactNode }` — renderuje `<label htmlFor>` + children + hint (`text-ink-faint text-xs`) + error (`text-danger text-xs`, `role="alert"`). Przekazuje `aria-describedby`/`aria-invalid` przez kontekst lub instrukcję użycia (dziecko dostaje `id`/`aria-*` od konsumenta).

- [ ] **Step 1: Test** — label powiązany z polem, error ma `role="alert"`, fokus-ring obecny.

```tsx
import { render, screen } from '@testing-library/react';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';

it('etykieta wskazuje pole, błąd ma role=alert', () => {
  render(<Field label="Email" htmlFor="email" error="Wymagane"><Input id="email" aria-invalid /></Field>);
  expect(screen.getByLabelText('Email')).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Wymagane');
});
```

- [ ] **Step 2: FAIL** · `npm test -- Field`
- [ ] **Step 3: Implementacja** (3 pliki). `Input`/`Select` jak w Interfaces; `Field`:

```tsx
import type { ReactNode } from 'react';
export default function Field({ label, htmlFor, hint, error, required, children }:
  { label: string; htmlFor: string; hint?: string; error?: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-soft mb-1">
        {label}{required && <span className="text-danger" aria-hidden> *</span>}
      </label>
      {children}
      {hint && !error && <p id={`${htmlFor}-hint`} className="mt-1 text-xs text-ink-faint">{hint}</p>}
      {error && <p id={`${htmlFor}-error`} role="alert" className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 4: PASS** · `npm test -- Field`
- [ ] **Step 5: Commit** · `git commit -m "feat(redesign/A2): prymitywy pol Field/Input/Select"`

---

### Task 4: A3 — bazowy `Modal` + refaktor `ConfirmDialog`

**Files:**
- Create: `src/components/ui/Modal.tsx`
- Modify: `src/components/ui/ConfirmDialog.tsx` (oprzeć na `Modal`)
- Test: `__tests__/components/Modal.test.tsx`

**Interfaces:**
- Produces: `function Modal(props: { open: boolean; onClose: () => void; title: string; titleId?: string; initialFocus?: 'first'|'last'; children: ReactNode; footer?: ReactNode; size?: 'sm'|'md'|'lg' }): JSX.Element|null`. Zachowanie wyjęte z dzisiejszego `ConfirmDialog`: overlay `bg-navy/60` (token), focus-trap (Tab/Shift+Tab cyklicznie wśród focusowalnych w panelu), Esc → `onClose`, klik-overlay → `onClose`, przywrócenie fokusu po zamknięciu, `role="dialog"` + `aria-modal="true"` + `aria-labelledby={titleId}`. Panel: `rounded-card bg-surface p-5 shadow-pop`.

- [ ] **Step 1: Test a11y** — przy `open` fokus wchodzi do panelu, Esc woła `onClose`, jest `role="dialog"` z `aria-modal`.

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '@/components/ui/Modal';

it('dialog ma aria-modal i reaguje na Esc', () => {
  const onClose = jest.fn();
  render(<Modal open title="Tytuł" onClose={onClose}><button>OK</button></Modal>);
  const dlg = screen.getByRole('dialog');
  expect(dlg).toHaveAttribute('aria-modal', 'true');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalled();
});
```

- [ ] **Step 2: FAIL** · `npm test -- Modal`
- [ ] **Step 3: Implementacja `Modal`** — przenieś logikę z `ConfirmDialog` (useEffect focus-trap/Esc/restore z linii 35–77 obecnego pliku), overlay zmień `bg-slate-900/60`→`bg-navy/60`. Footer renderuj w `flex justify-end gap-2 mt-5`.
- [ ] **Step 4: Refaktor `ConfirmDialog`** — niech używa `<Modal open title onClose={onCancel} initialFocus={tone==='danger'?'first':'last'} footer={<><Button secondary>Anuluj</Button><Button …>Potwierdź</Button></>}>{description}</Modal>`. Zachować dotychczasowe API (props bez zmian) i zachowanie (danger → fokus na Anuluj).
- [ ] **Step 5: PASS + brak regresji** · `npm test` (cały) · Expected: PASS, w tym istniejące testy używające ConfirmDialog.
- [ ] **Step 6: Commit** · `git commit -m "feat(redesign/A3): bazowy Modal (focus-trap/Esc/aria) + ConfirmDialog na nim"`

---

### Task 5: A4 — `DataTable` v2 (sticky, sumy, aria-live)

**Files:**
- Modify: `src/components/ui/DataTable.tsx`
- Test: `__tests__/components/DataTable.test.tsx` (rozszerzyć/utworzyć)

**Interfaces:**
- Produces (dodatkowe props, wstecznie zgodne — wszystkie opcjonalne):
  - `stickyHeader?: boolean` — `thead th` dostaje `sticky top-0 z-10 bg-surface-2`.
  - `Column.sticky?: boolean` — komórki kolumny `sticky left-0 bg-surface` (+ `bg-surface-2` w thead).
  - `Column.separator?: boolean` — `border-l-2 border-line-strong` (oznaczenie grupy/sum).
  - `footer?: ReactNode` — render w `<tfoot>` (`bg-surface-2 font-semibold`), wizualnie odróżniony.
  - Stany loading/error/empty: dodać `role="status"` + `aria-live="polite"` na komunikacie error/empty i obszarze skeletonu.

- [ ] **Step 1: Test** — `stickyHeader` dodaje klasę sticky do `th`; `footer` renderuje `<tfoot>`; error ma `role="status"`.
- [ ] **Step 2: FAIL** · `npm test -- DataTable`
- [ ] **Step 3: Implementacja** — dołożyć props do typu i klas (zob. obecny plik: `th` linia ~47, wiersze ~87). Skeleton/empty/error: opakować komunikat w `<td role="status" aria-live="polite">`.
- [ ] **Step 4: PASS** · `npm test -- DataTable`
- [ ] **Step 5: Commit** · `git commit -m "feat(redesign/A4): DataTable v2 — sticky header/kolumna, tfoot sum, aria-live"`

---

### Task 6: A6 — `Button` wariant toggle + bez animacji na klawiaturze

**Files:** Modify: `src/components/ui/Button.tsx`

- [ ] **Step 1:** Dodaj wariant `toggle` (parametr `active?: boolean`): aktywny → `bg-accent-weak text-accent-strong border border-accent/40`; nieaktywny → jak `secondary`. Zaktualizuj `ButtonVariant`/`buttonClass`.
- [ ] **Step 2:** Zamień `active:scale-[0.97]` w `BASE` na `pointer-fine:active:scale-[0.97]` lub usuń (akcja klawiaturowa nie animuje). Zachowaj resztę.
- [ ] **Step 3:** `npx tsc --noEmit && npm run lint && npm test` — zielone (Button używany szeroko).
- [ ] **Step 4: Commit** · `git commit -m "feat(redesign/A6): Button wariant toggle + bez scale na akcji klawiaturowej"`

---

### Task 7: A7 — wspólne utils (a11y komórek)

**Files:**
- Create: `src/lib/hooks/useKomorkaKlawiatura.ts`
- Test: `__tests__/lib/useKomorkaKlawiatura.test.tsx`

**Interfaces:**
- Produces: `function useKomorkaKlawiatura(onActivate: () => void): { role: 'button'; tabIndex: 0; onKeyDown: (e: KeyboardEvent) => void; onClick: () => void }` — Enter/Space → `onActivate` (+ `preventDefault` dla Space). Spread na klikalną komórkę; konsument dokłada `aria-label` i klasę `focus-visible:outline …`.

- [ ] **Step 1: Test** — Enter i Space wołają `onActivate`.
- [ ] **Step 2: FAIL** · `npm test -- useKomorkaKlawiatura`
- [ ] **Step 3: Implementacja** (mały hook wg Interfaces).
- [ ] **Step 4: PASS** · `npm test -- useKomorkaKlawiatura`
- [ ] **Step 5: Commit** · `git commit -m "feat(redesign/A7): hook a11y klikalnych komorek"`

---

### Task 8: A5 — config nawigacji + `Sidebar` (grupy, +5 ekranów, ikony lucide)

**Files:**
- Create: `src/lib/nawigacja.ts`
- Modify: `src/components/layout/Sidebar.tsx`

**Interfaces:**
- Produces (`nawigacja.ts`): `interface NavItem { name: string; href: string; icon: IconName }`, `interface NavGroup { label: string | null; items: NavItem[] }`, `const NAWIGACJA: NavGroup[]`, `function breadcrumbDla(pathname: string): { label: string; href: string }[]` (z mapy href→label + grupa nadrzędna). `IconName` z istniejącego `ui/Icon` (rozszerzyć o brakujące ikony lucide: dla szkół, planów, siatki, mapowań, importu, raportów — dobrać sensowne z lucide).

Struktura `NAWIGACJA`: `[{label:null, items:[Dashboard]}, {label:'Planowanie', items:[Przydział, Realizacja, Dyspozycja]}, {label:'Analiza', items:[Raporty, Zapotrzebowanie kadrowe]}, {label:'Konfiguracja', items:[Szkoły, Klasy, Nauczyciele]}, {label:'Dane MEiN', items:[Plany MEiN, Siatka szkoły, Mapowania, Import PDF]}, {label:'Administracja', items:[Panel admina]}]`. Href-y: `/dashboard, /przydzial, /realizacja, /dyspozycja, /raporty, /zapotrzebowanie-kadrowe, /szkoly, /klasy, /nauczyciele, /plany-mein, /siatka-szkoly, /mapowania, /import/mein-pdf, /panel-admin`.

- [ ] **Step 1:** Rozszerz `src/components/ui/Icon.tsx` o brakujące ikony lucide (np. `School`, `LayoutGrid`/`Grid3x3`, `ClipboardList`, `Replace`/`ArrowLeftRight`, `Upload`, `FileBarChart`, `Users`, `GraduationCap`, `Settings`). Dodaj do mapy `ICONS` semantyczne nazwy.
- [ ] **Step 2:** Utwórz `src/lib/nawigacja.ts` wg Interfaces.
- [ ] **Step 3:** Przepisz `Sidebar.tsx`: renderuj `NAWIGACJA` (etykiety grup `text-[10px] uppercase tracking-wide text-slate-500 px-3 pt-4 pb-1`), usuń lokalny `NavIcon`/emoji (`✕`,`▲`,`▼`) → `Icon`. Zachowaj: aktywny stan (pasek accent), profil/logout, `aria-current`, mobilny overlay. Przycisk zamknięcia: `Icon name="close"`.
- [ ] **Step 4:** `npx tsc --noEmit && npm run lint && npm test` zielone; ręczna weryfikacja: wszystkie 14 ekranów osiągalne z menu.
- [ ] **Step 5: Commit** · `git commit -m "feat(redesign/A5): nawigacja w grupach + 5 brakujacych ekranow, ikony lucide zamiast emoji"`

---

### Task 9: A5 — `AppBar` + `usePageChrome` + `AppShell` (z `DashboardLayout`)

**Files:**
- Create: `src/components/layout/PageChromeContext.tsx`, `src/lib/hooks/usePageChrome.ts`, `src/components/layout/AppBar.tsx`
- Modify: `src/components/layout/DashboardLayout.tsx` (→ AppShell), `src/components/ui/PageHeader.tsx` (adapter)

**Interfaces:**
- Produces:
  - `PageChromeContext`: stan `{ title?: string; description?: string; actions?: ReactNode }` + setter; `PageChromeProvider`.
  - `usePageChrome(meta: { title: string; description?: string; actions?: ReactNode }): void` — ustawia meta w kontekście (efekt), czyści przy unmount.
  - `AppBar`: czyta kontekst + `breadcrumbDla(pathname)`; sticky `top-0 z-20 bg-surface border-b border-line`; renderuje breadcrumb (linki) + `font-display` tytuł + slot akcji. Mobile: hamburger (z `DashboardLayout`).
  - `PageHeader` (adapter): wywołuje `usePageChrome({title, description, actions})` i nic nie renderuje w treści (albo renderuje fallback gdy brak Providera). Dzięki temu strony zostają bez zmian, a tytuł/akcje lądują w AppBar.

- [ ] **Step 1:** Utwórz kontekst + provider + hook.
- [ ] **Step 2:** Utwórz `AppBar` (sticky, breadcrumb z `nawigacja.ts`, tytuł+akcje z kontekstu).
- [ ] **Step 3:** Przebuduj `DashboardLayout` → owija w `PageChromeProvider`, renderuje `Sidebar` + `AppBar` + `main`; mobilny hamburger przenieś do AppBar; `page-enter` + `motion-reduce`.
- [ ] **Step 4:** Przerób `PageHeader` na adapter (Step Interfaces). Zweryfikuj na 2 ekranach (np. `szkoly`, `dashboard`): tytuł i akcje pojawiają się w AppBar, breadcrumb poprawny.
- [ ] **Step 5:** `npx tsc --noEmit && npm run lint && npm test` zielone.
- [ ] **Step 6: Commit** · `git commit -m "feat(redesign/A5): AppBar (sticky breadcrumb+tytul+akcje) + AppShell; PageHeader adapter"`

**Gate Fazy 1:** `npx tsc --noEmit && npm run lint && npm test && npm run build` — wszystko zielone przed Fazą 2.

---

# FAZA 2 — Ekrany (konsumują Fazę 1; P0→P1→P2)

Każde zadanie kończy: `npx tsc --noEmit && npm run lint && npm test` zielone + (dla ekranów z testami charakteryzującymi) brak zmiany zachowania + commit. Wzorce: zob. Global Constraints.

### Task 10: Serce — `realizacja/page.tsx`
**Files:** Modify `src/app/realizacja/page.tsx`
- [ ] Zamień kodowanie statusu komórek (linie ~401–408,422) na `<KomorkaStatusu zrealizowane docelowe>` (Task 2).
- [ ] Sticky: `thead` → `stickyHeader`; pierwsza kolumna „Przedmiot" sticky; kolumna „Razem" `separator` (Task 5 wzorzec lub bezpośrednie klasy dla ręcznej tabeli: `sticky top-0`/`sticky left-0`/`border-l-2 border-line-strong`).
- [ ] Klikalne komórki: `useKomorkaKlawiatura` (Task 7) + `aria-label` (np. „Dodaj realizację: {przedmiot}, {rok}") + `focus-visible:outline-2 outline-accent`. Dodaj klawiaturową alternatywę usuwania (dziś tylko `onContextMenu`).
- [ ] Spinner (linia ~324): `motion-reduce:animate-none` + `role="status"`. Komunikat zapisu → `useToast`.
- [ ] Pusty stan gdy `planRzeczywisty.length===0` mimo wybranej klasy.
- [ ] Tryb „Dodaj realizację" → `Button` wariant `toggle` (Task 6).
- [ ] `npx tsc --noEmit && npm run lint && npm test` zielone. Commit: `git commit -m "refactor(redesign): realizacja — KomorkaStatusu, sticky, a11y komorek"`

### Task 11: Serce — `plan-mein/TabelaPlanu.tsx` (najgęstsza siatka)
**Files:** Modify `src/components/dashboard/plan-mein/TabelaPlanu.tsx` (+ usuń duplikat progów; użyj Task 1/2)
- [ ] Zastąp hardkod `bg-{blue,green,amber,red}-200`/`text-*-900`/`ring-*`/`sky-*`/`gray-*`/`rounded-lg/xs` tokenami; kolumna „Zrealizowane" i wiersz dyrektora → `<KomorkaStatusu>` / mapowanie tonów z Task 1.
- [ ] Sticky `thead` + sticky kolumna „Przedmiot"; grupa kolumn sum (`Razem`, „Zrealizowane") `border-l-2 border-line-strong`.
- [ ] Typ godziny (ponad/dyrektorska/rozszerzenie) → znacznik tekstowy/badge nie-kolorowy (np. małe `dyr.`/`roz.`/`+`), nie tylko kolor (linie ~682–694).
- [ ] Usuń martwą gałąź (linie ~546–548, identyczne odnogi). Ujednolić wyrównanie liczb (prawostronnie, `tabular-nums`).
- [ ] Klikalne `td` → `useKomorkaKlawiatura` + focus-visible (zamiast custom shadow).
- [ ] **Zachowaj zachowanie** — uruchom testy charakteryzujące: `npm test -- PlanMeinTabela`. Jeśli asercje dotyczą klas/struktury — zaktualizuj OSTROŻNIE do nowej struktury, nie zmieniając logiki.
- [ ] `npx tsc --noEmit && npm run lint && npm test` zielone. Commit: `git commit -m "refactor(redesign): TabelaPlanu — tokeny, KomorkaStatusu, sticky, znacznik typu godziny"`

### Task 12: Serce — `TabelaDoradztwa`, `GroupSplitCell`, `GroupSplitSummary`
**Files:** Modify te trzy pliki w `src/components/dashboard/`
- [ ] `GroupSplitSummary`: usuń lokalny `statusClasses` (duplikat) → Task 1/2; tokeny zamiast `sky/gray`.
- [ ] `TabelaDoradztwa`: kolumna „Zrealizowano" → `<KomorkaStatusu>` (suma vs total); przyciski `+Dodaj`/`−Usuń` na `Button` (mini/ghost) z tokenami `ok`/`danger` (dziś `emerald-50`/`red-50`); kompaktowy stepper.
- [ ] `GroupSplitCell`: tokeny zamiast `gray-*`; trwały nie-kolorowy znacznik typu w połówce; połówki interaktywne → `useKomorkaKlawiatura` + `aria-label` per połówka („Rocznik X, grupa 1, N godz.").
- [ ] Testy + gate zielone. Commit: `git commit -m "refactor(redesign): doradztwo/grupy — KomorkaStatusu, tokeny, a11y polowek"`

### Task 13: Serce — `KafelkiRealizacji`, `WykresKolowyRealizacji`
**Files:** Modify te dwa pliki
- [ ] `KafelkiRealizacji`: przepisz na `Card` + tokeny (`surface/line/ink-faint/danger/ok`; pusty stan `warn-bg/warn`); skeleton spójny z DataTable.
- [ ] `WykresKolowyRealizacji`: `role="img"` + `aria-label` (z `%`); `transition` → `motion-reduce:transition-none`, ≤300ms i tylko `opacity`/`transform` (stroke-dashoffset jest dozwolony jako transform-podobny, ale dodaj reduce); paleta z tokenów; ujednolić progi z `statusRealizacji` jeśli sensowne (bez zmiany danych).
- [ ] Gate zielone. Commit: `git commit -m "refactor(redesign): kafelki+wykres realizacji — Card, tokeny, role=img, motion-reduce"`

### Task 14: Serce — `ModalPonadprogramowy` na `Modal`
**Files:** Modify `src/components/dashboard/plan-mein/ModalPonadprogramowy.tsx`
- [ ] Przepisz na `<Modal>` (Task 4); przyciski na `Button` (primary/secondary); overlay/`bg-slate-900/60`/`bg-blue-600` → tokeny.
- [ ] `npm test -- PlanMeinTabela` (modal jest częścią przepływu) + gate. Commit: `git commit -m "refactor(redesign): ModalPonadprogramowy na bazowy Modal"`

### Task 15: Przydział — system + widżet puli + grupowanie akcji
**Files:** Modify `src/app/przydzial/page.tsx`
- [ ] Modal resetu (linie ~343–368) → `ConfirmDialog` (tone danger). Usuń ręczny `<div>`/`bg-slate-900/60`/`bg-white`.
- [ ] Surowe `<button>` → `Button` (warianty); tryby → `Button` `toggle`; `Reset` ghost/danger odsunięty od `Generuj`. Tytuł `<h1>` → `usePageChrome`/PageHeader. Selektory → `Field`+`Select` z label-ami.
- [ ] **Widżet puli** (sticky pasek nad tabelą): „Do wyboru X/Y", „Dyrektorskie X/Y", „Rozszerzenia X/Y" z istniejących danych (`useDaneKlasy`: `assignedDirectorForPlan`, sumy `przydzial`/`rozszerzeniaPrzydzial` vs limity z planu); ton `warn`/`danger` przy zbliżeniu/przekroczeniu; `aria-live` przy zmianie.
- [ ] Komunikat sukcesu/błędu → `useToast`; rozróżnij błąd≠pustka przy fetchu klas/typów (linie ~60–77,103).
- [ ] Gate zielone + ręczna weryfikacja: pula liczy się zgodnie z tabelą. Commit: `git commit -m "feat(redesign): przydzial — system design, widzet puli godzin, grupowanie akcji"`

### Task 16: Dashboard — agregat całoszkolny z 6 endpointów
**Files:** Modify `src/app/dashboard/page.tsx` (ew. wydziel `src/components/dashboard/Agregat*.tsx`)
- [ ] Podłącz `GET /api/dashboard/{podsumowanie,wskaznik-ryzyka,braki-kadrowe,obciazenie-nauczycieli,zgodnosc-mein,alerty}` (sprawdź kształt odpowiedzi czytając route'y przed użyciem). Rząd KPI (zgodność %, ryzyko, liczba braków, przeciążeni) jako `Card`; sekcje: obciążenie (DataTable), braki (DataTable/StatusPill), alerty (lista z tonami), zgodność (StatusPill/KomorkaStatusu).
- [ ] Skeleton-first + `aria-live`; błąd≠pustka per sekcja.
- [ ] Dotychczasowy widok per-klasa (selektory + plan) przenieś niżej (sekcja „Podgląd klasy") lub do realizacji — zachowaj funkcję.
- [ ] Gate zielone. Commit: `git commit -m "feat(redesign): dashboard — agregat caloszkolny z istniejacych endpointow"`

### Task 17: Import — przepisanie `ImportMeinPdf` + bramka
**Files:** Modify `src/components/import/ImportMeinPdf.tsx`, `src/app/import/mein-pdf/page.tsx`
- [ ] Przepisz `ImportMeinPdf` na tokeny + prymitywy (`Card`/`Button`/`Field`/`DataTable`/`Icon`).
- [ ] **Realny progres**: użyj stanu `'processing'` (dziś zdefiniowany, nieustawiany): `upload` → `processing/OCR` → `gotowe`; pasek zastąp etapem + spinnerem (`motion-reduce`); `aria-live` na wyniku. Akordeon planu: `aria-expanded`/`aria-controls`.
- [ ] Strefa pliku: uczciwy `Input type=file` (lub realne drag&drop). „Pobierz JSON" jako wyraźny wynik (primary), nie szary.
- [ ] Bramka `mein-pdf/page.tsx`: blokujący modal „w budowie" → dostępny baner (`warn-bg/warn`, `role="status"`) nad treścią; jeśli zostaje modal — `Modal` (Task 4).
- [ ] Gate zielone. Commit: `git commit -m "feat(redesign): import PDF — przepisanie na design system, realny progres, dostepna bramka"`

### Task 18: Dyspozycja — DataTable v2 + StatusPill + `PrzydzielModal`
**Files:** Modify `src/app/dyspozycja/page.tsx`, `src/components/dyspozycja/PrzydzielModal.tsx`
- [ ] Tabela → `DataTable` v2 (lub StatusPill na komórce „Do przydzielenia": status nie kolorem — „gotowe"/„brakuje N"); a11y komórek (`useKomorkaKlawiatura`); `tabular-nums`; suma w `tfoot`/footer; usuń surowe `id` klasy z UI; rozróżnij błąd≠pustka.
- [ ] `PrzydzielModal`: na `Modal`; dodaj pole numeryczne (stepper) sprzężone z suwakiem; pokaż „Do przydzielenia: N" + konsekwencję zapisu; `aria-live` komunikatów; rozróżnij ładowanie/pustka/błąd listy nauczycieli.
- [ ] Gate zielone. Commit: `git commit -m "feat(redesign): dyspozycja — DataTable v2, StatusPill, PrzydzielModal na Modal + pole liczbowe"`

### Task 19: Konfiguracja — `klasy`(+[id]), `nauczyciele`(+[id]), `przedmioty/[id]`, `szkoly`
**Files:** Modify odpowiednie `page.tsx`
- [ ] Surowe `<select>`/`SELECT_CLASS` → `Field`+`Select`; tekstowe `←` → `Icon name="back"`; `tabular`→`tabular-nums`; jednolite odstępy (kontener); pusta wartość `—` (PUSTA).
- [ ] `klasy/[id]`: `return null` → jawny stan „Nie znaleziono klasy".
- [ ] `nauczyciele/page.tsx`: dociągnij do `[id]` (Button, `ConfirmDialog` przed usunięciem, `useToast`, `AsyncSection`, błąd≠pustka). Preferencja: jeśli bezpieczne, skonsoliduj widoki (oceń w trakcie).
- [ ] `przedmioty/[id]`: „Podział na klasy" gęściej; suma jako wyróżniony wiersz; pusty stan listy klas.
- [ ] `szkoly`: usuń `max-w-4xl`; ujednolić odstępy; `tabular-nums` na kodach/latach.
- [ ] Gate zielone. Commit: `git commit -m "refactor(redesign): konfiguracja — Field/Select, stany, a11y, spojnosc odstepow"`

### Task 20: Dane MEiN — `plany-mein`, `siatka-szkoly`, `mapowania`
**Files:** Modify odpowiednie `page.tsx`
- [ ] `plany-mein`: `PageHeader`; sticky kolumna „Przedmiot"; wiersz „dyspozycja dyrektora" ze znacznikiem nie-kolorowym (StatusPill/Icon); pusty stan.
- [ ] `siatka-szkoly` (P0): „Brak nauczyciela"/puste → StatusPill/ikona + tekst; pełna kratka → linie włosowe; `Field`/`Select`; skeleton w kształcie tabeli; `Card`; `tabular-nums`; rok jako `Select`; liczniki do `description`.
- [ ] `mapowania`: lokalny `Badge` → `StatusPill`; zweryfikuj link „Dodaj mapowanie" (panel bez sekcji mapowań — popraw cel lub komunikat).
- [ ] Gate zielone. Commit: `git commit -m "refactor(redesign): dane MEiN — status nie kolorem, linie wlosowe, prymitywy"`

### Task 21: Admin — `panel-admin`, `KlasySection`, `NauczycieleSection`
**Files:** Modify te trzy pliki
- [ ] `panel-admin`: błąd≠pustka (zamiast `catch {}`); skeleton zamiast „Ładowanie…" + `aria-live`.
- [ ] Sekcje: lokalny `INPUT` → `Field`/`Input`/`Select`; ręczne `<table>` → `DataTable`; multi-select przedmiotów: `role="group"`+aria-label, wyższy kontener/licznik; fallback `?? 18` → `—`; `rounded-b`→`rounded-sm`.
- [ ] Gate zielone (zachowaj walidację/`useConfirm`/`useToast`). Commit: `git commit -m "refactor(redesign): panel admina — DataTable, Field, blad!=pustka"`

### Task 22: Raporty — `raporty`, `raporty/[typ]`
**Files:** Modify `src/app/raporty/page.tsx`, `src/app/raporty/[typ]/page.tsx`
- [ ] Lista: ręczne karty → `Card`; rok jako `Select`; disabled-linki dostępnie (nie `Link href="#"` + opacity); stan błędu/pusty selektora.
- [ ] `[typ]`: baner amber (`amber-*`/`rounded-lg`) → `warn`/`warn-bg`/`rounded-card`; tabele → `DataTable` (puste stany/sumy `tfoot`); stan eksportu na przycisku; PageHeader też w ładowaniu/błędzie; martwy „arkusz-organizacyjny" → „wkrótce" lub ukryć.
- [ ] Gate zielone. Commit: `git commit -m "refactor(redesign): raporty — Card/DataTable, baner warn, dostepne disabled, stan eksportu"`

### Task 23: Login — `page.tsx`
**Files:** Modify `src/app/page.tsx`
- [ ] Pola → `Field`/`Input`; błąd → `role="alert"` + `aria-invalid`; loader spinner → `motion-reduce` + `role="status"`.
- [ ] Landing zalogowanego (`text-5xl` hero, linie ~64–97) → zwięzły, bez marnowania przestrzeni i bez ciemnego „Panel Administracyjny".
- [ ] Gate zielone. Commit: `git commit -m "refactor(redesign): login — Field, role=alert, zwiezly landing"`

### Task 24: Finał — pełna weryfikacja + QA wizualne + sprzątanie
- [ ] `npx tsc --noEmit && npm run lint && npm test && npm run build` — wszystko zielone.
- [ ] QA wizualne (Playwright) ekranów wysokiego ryzyka: siatka MEiN (realizacja), przydział (pula), dashboard (agregat), import — sprawdź brak regresji i poprawność statusu (wariant B) w skali szarości.
- [ ] Skan końcowy: `grep` za hardkodem kolorów (`bg-(blue|green|amber|red|slate|gray|sky)-[0-9]`, `rounded-(lg|xl)`) w `src/` — zero trafień poza uzasadnionymi.
- [ ] Zaktualizuj pamięć (`memory/`) wpisem o milestone UI/UX.
- [ ] Commit: `git commit -m "chore(redesign): finalna weryfikacja gate'ow + QA wizualne"`. Push `full-refactor`.

---

## Self-Review (autor)

- **Pokrycie speca:** A1→T1,T2 · A2→T3 · A3→T4 · A4→T5 · A5→T8,T9 · A6→T6 · A7→T7 (+ a11y komórek w ekranach). Ekrany: serce→T10–T14 · przydział→T15 · dashboard→T16 · import→T17 · dyspozycja→T18 · reszta→T19–T23 · finał→T24. Brak luk względem sekcji 5–6 speca.
- **Placeholdery:** kod pokazany dla logiki/prymitywów (T1–T7); ekrany mają konkretne instrukcje plik+linie+zamiana (nie „add error handling" — wskazane `catch {}`→błąd≠pustka itd.).
- **Spójność typów:** `statusRealizacji`/`StatusRealizacji`/`TonStatusu`/`PUSTA` (T1) używane w T2/T11/T12; `Modal` props (T4) w T14/T17/T18; `usePageChrome`/`PageHeader` adapter (T9) w ekranach; `useKomorkaKlawiatura` (T7) w T10–T12,T18; props `DataTable` v2 (T5) w T18,T20–T22.
