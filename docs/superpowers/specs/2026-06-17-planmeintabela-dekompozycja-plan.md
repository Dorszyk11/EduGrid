# Plan dekompozycji PlanMeinTabela.tsx (SP3 — pozostały krok)

Data: 2026-06-17 · Status: gotowy do wykonania (test-first), NIE rozpoczęty poza ekstrakcją reguł.
Źródło: workflow audytu `edugrid-audyt-refaktoru` (ultracode). Plik: `src/components/dashboard/PlanMeinTabela.tsx` (~1515 linii, RDZEŃ aplikacji).

## Kontekst

Logika godzin jest już w `src/lib/przydzial/` (z testami). Czyste **reguły domenowe** zostały wyniesione do `src/lib/przydzial/reguly.ts` (commit 8be4e5e, +8 testów). Pozostała dekompozycja dotyczy prezentacji + orkiestracji stanu. Cel: orkiestrator < 500 linii, **bez zmiany zachowania**.

## Zasady bezpieczeństwa (behavior-preserving)

1. `PlanMeinTabela.tsx` zostaje właścicielem CAŁEGO stanu i wszystkich `useCallback`. NIE ekstrahować stanu do hooka w pierwszych krokach — `useGroupSplit` ma sztywny kontrakt, a `groupSaveRef.current` jest reassignowany w ciele renderu (domknięcie nad `dyrektor`/`zrealizowaneDoradztwo`).
2. Najpierw to, co czyste i bezstanowe (helpery, podkomponenty prezentacyjne sterowane propsami), potem ewentualny hook stanu.
3. **Test charakteryzujący NAJPIERW** dla każdego kroku — pinuje obecne zachowanie zanim cokolwiek przesuniemy.
4. Po każdym kroku: `tsc` + `lint` (0 błędów) + `npm test` zielone.
5. Kopiować stringi/JSX 1:1 (nie przepisywać), zachować polskie znaki UTF-8.

## Kroki (każdy = osobny commit)

- **Krok 0 — siatka regresyjna:** `__tests__/components/PlanMeinTabela.test.tsx` (RTL+jsdom, wzór `__tests__/app/realizacja.test.tsx`). Mock `global.fetch`. Pokryć: render bez `klasaId`; render z planem (nagłówki = `getGrades`); early-return „Brak planu" dla nieznanego typu; klik „+ Dodaj" w doradztwie → POST z `body.doradztwo`. To kontrakt regresyjny dla kolejnych kroków.
- **Krok 1 — czyste helpery →** `src/lib/przydzial/tabelaHelpers.tsx`: `cacheSet`, `getUnit`, `cellDisplay`, `totalDisplay`, `cycleFilterZNazwy`. Test: `__tests__/lib/przydzial/tabelaHelpers.test.ts`. (~40 linii, ryzyko zerowe). `.tsx` bo `cellDisplay/totalDisplay` zwracają JSX.
- **Krok 2 — `TabelaDoradztwa` →** `src/components/dashboard/plan-mein/TabelaDoradztwa.tsx` (blok doradztwa ~l.1409-1530), czysto prezentacyjny (props + callbacki). Test render + kolorowanie progów + wywołania add/usun. (~120 linii, ryzyko niskie).
- **Krok 3 — `ModalPonadprogramowy` →** `src/components/dashboard/plan-mein/ModalPonadprogramowy.tsx` (l.1532-1562). Logika decyzji zostaje w rodzicu jako `onPotwierdz(modal)`. (~35 linii, ryzyko niskie).
- **Krok 4 — `TabelaPlanu` →** `src/components/dashboard/plan-mein/TabelaPlanu.tsx` (główna tabela l.660-1407). **Blok obliczeń per-plan (l.539-651) ZOSTAJE w rodzicu** — przekazujemy tylko wyniki jako propsy. (~700 linii out, ryzyko średnie — siatka z Kroku 0 + typy propsów jako zabezpieczenie).
- **Krok 5 (warunkowy, jeśli wciąż >500) — `useDaneKlasy` →** `src/lib/hooks/useDaneKlasy.ts`: efekt ładowania (l.170-256) + `zapiszDoBazy`/`zapiszRozszerzeniaDoBazy`/`zapiszPrzydzial`. **NIE** ruszać `useGroupSplit`/`groupSaveRef`. Test `renderHook` (wzór `useResource.test.tsx`): sukces/parse, fallback localStorage, cleanup `cancelled`, warunkowy POST.

## Szacunek

Kroki 1-4 ≈ 895 linii out → orkiestrator ~620; Krok 5 dobija < 500.

## Pułapki (z audytu)

- `groupSaveRef.current` reassignowany w renderze (domknięcie nad stanem) — zostaje w rodzicu.
- Blok obliczeń per-plan ma efekty uboczne na `sumByGrade` — zostawić w rodzicu, przekazać wyniki, nie logikę.
- `cellDisplay/totalDisplay` zwracają JSX → plik `.tsx`.

## Dlaczego nie wykonano teraz

Krok 4 (700-linijowa tabela interaktywna: komórki, podział na grupy, godziny dyrektorskie/rozszerzenia) wymaga dowodu behawioralnego, którego w środowisku bez uruchomionej aplikacji (i z zepsutym hookiem `Read` pluginu claude-mem) nie da się rzetelnie postawić samym smoke-testem. Zgodnie z zasadą „nie ma działa na słowo honoru" — do wykonania z pełną siatką testów (Krok 0) i najlepiej z weryfikacją w działającej apce.
