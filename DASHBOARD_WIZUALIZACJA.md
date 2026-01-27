# Wizualizacja Dashboardu Dyrektora

## Layout Dashboardu

```
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard Dyrektora                    [Typ szkoły ▼] [Rok ▼] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Zgodność │  │  Braki   │  │ Obciążenie│  │  Braki   │      │
│  │  z MEiN  │  │  godzin  │  │nauczycieli│  │ kadrowe  │      │
│  │  95.5%   │  │    8     │  │  15.2h   │  │    3     │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Zgodność z wymaganiami MEiN                                   │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  [Statystyki: Zgodne | Z brakami | Z nadwyżkami | %]    │  │
│  │                                                          │  │
│  │         [Wykres kołowy: 95.5%]                          │  │
│  │                                                          │  │
│  │  Przedmioty wymagające uwagi:                            │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ Przedmiot | Klasa | % realizacji | Różnica | Status│  │  │
│  │  │ JP        | 1A    | [████░░] 88% | -20h   | BRAK  │  │  │
│  │  │ MAT       | 2A    | [█████░] 95% | -5h    | BRAK  │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Obciążenie nauczycieli                                         │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  [Statystyki: Nauczycieli | Przekroczone | Pełne | ...]│  │
│  │                                                          │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ Nauczyciel | Obciążenie | Wykorzystanie | Status│  │  │
│  │  │ Kowalski   | 16/18h     | [███████░] 89% | OK   │  │  │
│  │  │ Nowak      | 18/18h     | [████████] 100%| PEŁNE│  │  │
│  │  │ Wiśniewski | 20/18h     | [████████] 111%| PRZEK│  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  Braki kadrowe                                                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  [Statystyki: Łącznie | Godziny | Wymagane etaty]     │  │
│  │                                                          │  │
│  │  Braki według przedmiotu:                                │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │ Matematyka                                       │  │  │
│  │  │ 2 klasy, 8 godzin tygodniowo                    │  │  │
│  │  │ Powód: Brak nauczycieli z dostępnym obciążeniem │  │  │
│  │  │ 💡 2 nauczycieli ma kwalifikacje, ale brak czasu│  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Komponenty

### 1. Karty podsumowujące (DashboardKarty)

4 karty z kluczowymi metrykami:
- **Zgodność z MEiN** - Średni procent realizacji
- **Braki godzin** - Liczba przedmiotów z brakami
- **Średnie obciążenie** - Średnie obciążenie nauczycieli
- **Braki kadrowe** - Liczba przedmiotów bez nauczycieli

### 2. Wykres zgodności z MEiN (ZgodnoscMeinWykres)

- **Statystyki** - 4 karty z liczbami
- **Wykres kołowy** - Wizualizacja rozkładu statusów
- **Tabela** - Top 10 najgorszych przedmiotów

### 3. Tabela obciążeń (ObciazenieNauczycieliTabela)

- **Statystyki** - Podsumowanie obciążeń
- **Tabela** - Wszyscy nauczyciele z:
  - Obciążeniem (aktualne/maksymalne)
  - Paskiem postępu wykorzystania
  - Statusem (kolorowy badge)

### 4. Lista braków kadrowych (BrakiKadroweLista)

- **Statystyki** - Łączne braki
- **Grupowanie** - Według przedmiotu
- **Szczegóły** - Lista wszystkich braków z rozwiązaniami

## Kolory i statusy

### Statusy zgodności z MEiN:
- 🟢 **OK** - Zgodne z wymaganiami
- 🔴 **BRAK** - Brakuje godzin
- 🟡 **NADWYŻKA** - Więcej niż wymagane
- ⚪ **BRAK_DANYCH** - Brak wymagań MEiN

### Statusy obciążenia:
- 🟢 **OK** - Normalne obciążenie (50-90%)
- 🟡 **PEŁNE** - Pełne obciążenie (100%)
- 🔴 **PRZEKROCZONE** - Przekroczone obciążenie (>100%)
- 🔵 **NISKIE** - Niskie obciążenie (<50%)

## Responsywność

Dashboard jest responsywny:
- **Desktop** - 4 kolumny kart, pełne tabele
- **Tablet** - 2 kolumny kart, przewijane tabele
- **Mobile** - 1 kolumna, uproszczone widoki

## Interaktywność

- **Filtrowanie** - Wybór typu szkoły i roku szkolnego
- **Odświeżanie** - Automatyczne odświeżanie przy zmianie filtrów
- **Szczegóły** - Kliknięcie w wiersz pokazuje szczegóły (przyszłe)

---

**Plik:** `src/app/dashboard/page.tsx`
