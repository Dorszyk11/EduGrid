# Logika obliczania zgodności z wymaganiami MEiN

## Przegląd

System oblicza różnice między wymaganymi godzinami MEiN a godzinami zaplanowanymi przez szkołę, wraz z procentem realizacji.

## Główne funkcje

### 1. `obliczZgodnoscMein()`

Główna funkcja obliczająca zgodność z MEiN dla określonych parametrów.

**Parametry:**
- `payload` - Instancja Payload CMS
- `parametry` - Obiekt z opcjonalnymi filtrami:
  - `przedmiotId` - ID przedmiotu (opcjonalnie)
  - `typSzkolyId` - ID typu szkoły (opcjonalnie)
  - `klasaId` - ID klasy (opcjonalnie)
  - `rokSzkolny` - Rok szkolny (opcjonalnie)
  - `dataSprawdzenia` - Data sprawdzenia (domyślnie: dzisiaj)

**Zwraca:** Tablica wyników `WynikZgodnosciMein[]`

### 2. Funkcje pomocnicze

- `obliczZgodnoscDlaPrzedmiotuWKlasie()` - Dla pojedynczego przedmiotu w klasie
- `obliczZgodnoscDlaSzkoly()` - Dla całej szkoły
- `obliczZgodnoscDlaKlasy()` - Dla całej klasy
- `formatujWynikZgodnosci()` - Formatowanie wyniku jako tekst

## Struktura wyniku

```typescript
interface WynikZgodnosciMein {
  // Identyfikatory
  przedmiotId: string;
  przedmiotNazwa: string;
  typSzkolyId: string;
  typSzkolyNazwa: string;
  klasaId?: string;
  klasaNazwa?: string;
  numerKlasy?: number;
  
  // Wymagania MEiN
  wymaganeMein: {
    godziny_w_cyklu: number;
    godziny_tygodniowo_min?: number;
    godziny_tygodniowo_max?: number;
    obowiazkowe: boolean;
    klasa?: number; // NULL = cały cykl
  };
  
  // Realizowane przez szkołę
  realizowane: {
    godziny_roczne: number;
    godziny_w_cyklu: number;
    godziny_tygodniowo_srednia: number;
  };
  
  // Obliczenia
  roznica: {
    godziny: number; // ujemne = brak, dodatnie = nadwyżka
    procent_realizacji: number;
  };
  
  // Status
  status: 'OK' | 'BRAK' | 'NADWYŻKA' | 'BRAK_DANYCH';
  alerty: string[];
}
```

## Algorytm obliczeń

### Krok 1: Pobranie wymagań MEiN

1. Pobierz wszystkie aktywne siatki godzin MEiN
2. Filtruj według daty obowiązywania
3. Filtruj według parametrów (przedmiot, typ szkoły, klasa)

### Krok 2: Dla każdego wymagania MEiN

1. Znajdź odpowiednie klasy (według typu szkoły i numeru klasy)
2. Dla każdej klasy:
   - Pobierz rozkład godzin dla przedmiotu
   - Zsumuj godziny roczne

### Krok 3: Obliczenia dla całego cyklu

**Jeśli wymaganie jest dla całego cyklu** (`klasa = NULL`):
- Zsumuj godziny z **wszystkich klas** danego typu szkoły
- Porównaj z wymaganiami dla całego cyklu

**Jeśli wymaganie jest dla konkretnej klasy**:
- Zsumuj godziny tylko z tej klasy
- Porównaj z wymaganiami dla tej klasy

### Krok 4: Obliczenie różnic

```typescript
roznica = realizowane_godziny_w_cyklu - wymagane_godziny_w_cyklu
procent_realizacji = (realizowane / wymagane) * 100
```

### Krok 5: Określenie statusu

- **OK**: `roznica = 0` (dokładnie zgodne)
- **BRAK**: `roznica < 0` (brakuje godzin)
- **NADWYŻKA**: `roznica > 0` (więcej niż wymagane)
- **BRAK_DANYCH**: `wymagane = 0` (brak wymagań MEiN)

### Krok 6: Generowanie alertów

- Brak godzin (jeśli `roznica < 0`)
- Nadwyżka godzin (jeśli `roznica > 0`)
- Godziny tygodniowo poniżej minimum
- Godziny tygodniowo powyżej maksimum

## Przykłady użycia

### Przykład 1: Sprawdzenie pojedynczego przedmiotu

```typescript
const wynik = await obliczZgodnoscDlaPrzedmiotuWKlasie(
  payload,
  'przedmiot-id-123',
  'klasa-id-456',
  '2024/2025'
);

if (wynik) {
  console.log(`Status: ${wynik.status}`);
  console.log(`Procent realizacji: ${wynik.roznica.procent_realizacji.toFixed(1)}%`);
  console.log(`Różnica: ${wynik.roznica.godziny} godzin`);
}
```

### Przykład 2: Sprawdzenie całej klasy

```typescript
const wyniki = await obliczZgodnoscDlaKlasy(
  payload,
  'klasa-id-456',
  '2024/2025'
);

const zBrakami = wyniki.filter(w => w.status === 'BRAK');
console.log(`Przedmioty z brakami: ${zBrakami.length}`);
```

### Przykład 3: Raport dla całej szkoły

```typescript
const wyniki = await obliczZgodnoscDlaSzkoly(
  payload,
  'typ-szkoly-id-789',
  '2024/2025'
);

const statystyki = {
  zgodne: wyniki.filter(w => w.status === 'OK').length,
  zBrakami: wyniki.filter(w => w.status === 'BRAK').length,
  zNadwyzkami: wyniki.filter(w => w.status === 'NADWYŻKA').length,
  sredniProcent: wyniki.reduce((sum, w) => sum + w.roznica.procent_realizacji, 0) / wyniki.length,
};
```

## Uwagi implementacyjne

### Wydajność

- Funkcja wykonuje wiele zapytań do bazy danych
- Dla dużych szkół może być wolna
- Rozważ cache'owanie wyników
- Można zoptymalizować przez batch queries

### Dokładność

- Godziny są sumowane z wszystkich wpisów w rozkładzie godzin
- Jeśli przedmiot jest realizowany przez wielu nauczycieli, sumuje się wszystkie godziny
- Uwaga: może być konieczne sprawdzenie, czy nie ma duplikatów

### Walidacja

- Funkcja nie sprawdza, czy dane są kompletne
- Jeśli brakuje rozkładu godzin, wynik będzie pokazywał brak
- Jeśli brakuje wymagań MEiN, status będzie `BRAK_DANYCH`

## Integracja z Payload CMS

Funkcje można użyć w:

1. **Hooks Payload** - automatyczne sprawdzanie przy zapisie
2. **API endpoints** - endpointy do raportowania
3. **Custom components** - komponenty UI pokazujące zgodność
4. **Scheduled jobs** - okresowe sprawdzanie i raportowanie

## Następne kroki

1. Dodaj cache'owanie wyników
2. Dodaj możliwość eksportu do XLS
3. Dodaj wizualizacje (wykresy, tabele)
4. Dodaj powiadomienia email przy brakach
5. Dodaj historię zmian zgodności

---

**Plik:** `src/utils/zgodnoscMein.ts`  
**Przykłady:** `src/utils/zgodnoscMein.example.ts`
