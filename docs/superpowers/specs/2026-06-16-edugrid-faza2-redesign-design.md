# EduGrid — Faza 2 (redesign) — design

> Data: 2026-06-16. Branch: `refactor/p0-izolacja-multitenant` (lokalny, push dopiero po wszystkich fazach).
> Kierunek wizualny (decyzja użytkownika): **enterprise SaaS** — granat `#0f172a`/`#1e293b` + akcent `#2563eb`,
> gęste dane, sygnatura = „ledgerowa" siatka z tabularnymi liczbami i włosowymi liniami.
> Fundament gotowy: tokeny (`globals.css` CSS vars + `tailwind.config.js`), przebudowana powłoka (Sidebar/DashboardLayout) — commit `2fded02`.

## Cel

Przebudować warstwę prezentacji wszystkich stron na spójny system designu, **bez ruszania logiki**
(fetch/hooki/handlery zostają). Przy okazji molochy schodzą <500 linii (powtarzalny markup → prymitywy)
i dostają stany loading/empty/error. WCAG AA jako podłoga.

## Architektura: współdzielone prymitywy (`src/components/ui/`)

Czysta prezentacja, jeden cel, jasny props-interfejs, zero logiki domenowej.

- `PageHeader` — tytuł + opis + slot akcji (selektory/eksport po prawej).
- `Card` — `surface`, `border-line`, `rounded-card`, `shadow-card`; warianty paddingu.
- `StatusPill` — mapuje status zgodności MEiN: `OK`→`ok`, `NADWYŻKA`→`warn`, `BRAK`→`danger` (semantyczne tokeny + ikona).
- `Button` — warianty `primary` (accent) / `secondary` (line) / `ghost`; `:focus-visible`; stan `disabled`.
- `DataTable` — `<table>`: `th` na `surface-2`, włosowe `border-line`, `tabular-nums`, opcjonalna zebra; stany `loading` (skeleton) / `empty` / `error`.

## Kolejność stron (od najniższego ryzyka do molochów)

0. **webfonty** — Space Grotesk (display) + Inter (body) przez `next/font`; globalny efekt.
1. `dashboard` (344) — landing; PageHeader + Card + StatusPill.
2. `nauczyciele` (413) — poligon dla DataTable.
3. `klasy` — adopcja DataTable.
4. `zapotrzebowanie-kadrowe` (535, moloch glue) — adopcja, schodzi <500.
5. `realizacja` (525, moloch) — DataTable + StatusPill.
6. `dyspozycja` (649, moloch) — najwięcej stanu; logika nietknięta.
7. `panel-admin` (677, moloch) — CRUD słowników.
8. `przydzial` (447) — chrome strony; PlanMeinTabela osobno.
9. `PlanMeinTabela` (1583) — NA KOŃCU, najwyższa staranność: tylko styling tokenami, logika już w `lib`.

## Zasady wykonania

- Jedna strona = jeden commit = `build`+`lint`(0 błędów)+`test`(49) zielone + **screenshot** (Playwright, login→strona).
- Granica bezpieczeństwa: zmieniam tylko JSX/klasy. Nie dotykam fetchy/hooków/handlerów. Jeśli logiki nie da się
  bezpiecznie oddzielić od markupu — oznaczam jako ryzyko i zostawiam zachowanie.

## Motion (GSAP) — wstrzemięźliwie

- Wejście strony: subtelny stagger nagłówka + kart (`opacity`/`translateY`, ≤250ms, ease-out), raz.
- Tabele: bez animacji per-wiersz (szum przy gęstych danych); ewentualnie fade kontenera.
- Mikrointerakcje: wyłącznie CSS `transform`/`opacity`.
- Twardo: `prefers-reduced-motion` (globalny guard jest), zero animacji na akcjach klawiaturowych, GSAP przez dynamiczny `import()`.
- GSAP wchodzi **po** redesignie strukturalnym, jako warstwa.

## Definicja ukończenia Fazy 2

Wszystkie 8 stron na tokenach + prymitywach, każda <500 linii (lub świadomie uzasadniona), WCAG AA
(kontrast 4.5:1, hierarchia nagłówków, fokus z klawiatury, reduced-motion), build+lint+test zielone,
screenshoty potwierdzające. → raport zamknięcia + push całości na osobnego brancha do review.
