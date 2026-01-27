# Logika przypisywania nauczycieli do przedmiotów

## Przegląd

System automatycznie przypisuje nauczycieli do przedmiotów z uwzględnieniem:
- ✅ Kwalifikacji nauczycieli
- ✅ Maksymalnego rocznego obciążenia godzinowego
- ✅ Wyrównania obciążeń między nauczycielami
- ✅ Preferencji (preferowani/wykluczeni nauczyciele)

## Główne funkcje

### 1. `sprawdzDostepnoscNauczyciela()`

Sprawdza dostępność nauczyciela (obciążenie i kwalifikacje).

**Parametry:**
- `payload` - Instancja Payload CMS
- `nauczycielId` - ID nauczyciela
- `przedmiotId` - ID przedmiotu
- `rokSzkolny` - Rok szkolny

**Zwraca:** `DostepnoscNauczyciela`

**Przykład:**
```typescript
const dostepnosc = await sprawdzDostepnoscNauczyciela(
  payload,
  'nauczyciel-id-123',
  'przedmiot-id-456',
  '2024/2025'
);

console.log(`Dostępne: ${dostepnosc.dostepneObciazenie} godzin tygodniowo`);
console.log(`Ma kwalifikacje: ${dostepnosc.maKwalifikacje}`);
```

### 2. `znajdzDostepnychNauczycieli()`

Znajduje wszystkich dostępnych nauczycieli dla przedmiotu.

**Parametry:**
- `payload` - Instancja Payload CMS
- `przedmiotId` - ID przedmiotu
- `rokSzkolny` - Rok szkolny
- `opcje` - Opcje filtrowania:
  - `wymagajKwalifikacji` - Czy wymagać kwalifikacji (domyślnie: true)
  - `minimalneObciazenie` - Minimalne dostępne obciążenie
  - `preferowani` - Lista ID preferowanych nauczycieli
  - `wykluczeni` - Lista ID wykluczonych nauczycieli

**Zwraca:** `DostepnoscNauczyciela[]` (posortowane: preferowani → dostępne obciążenie)

### 3. `proponujPrzypisanie()`

Proponuje przypisanie nauczyciela do przedmiotu w klasie.

**Parametry:**
- `payload` - Instancja Payload CMS
- `parametry` - `ParametryPrzypisania`:
  - `przedmiotId` - ID przedmiotu
  - `klasaId` - ID klasy
  - `godzinyTygodniowo` - Godziny tygodniowo
  - `godzinyRoczne` - Godziny roczne
  - `rokSzkolny` - Rok szkolny
  - `preferowaniNauczyciele` - Lista ID preferowanych nauczycieli
  - `wykluczeniNauczyciele` - Lista ID wykluczonych nauczycieli
  - `wymagajKwalifikacji` - Czy wymagać kwalifikacji
  - `minimalneObciazenie` - Minimalne obciążenie nauczyciela

**Zwraca:** `WynikPrzypisania`

**Algorytm:**
1. Znajdź dostępnych nauczycieli
2. Wybierz najlepszego (najwięcej dostępnego obciążenia, preferowani)
3. Sprawdź, czy przypisanie jest możliwe
4. Oblicz priorytet przypisania
5. Zwróć propozycję

### 4. `proponujRozkladGodzin()`

Proponuje optymalny rozkład godzin dla wielu przedmiotów/klas.

**Parametry:**
- `payload` - Instancja Payload CMS
- `zadania` - Tablica zadań do przypisania
- `rokSzkolny` - Rok szkolny

**Zwraca:** Propozycje przypisań + statystyki

**Algorytm (Greedy):**
1. Sortuj zadania według priorytetu (preferowani → większe godziny)
2. Dla każdego zadania:
   - Znajdź najlepszego dostępnego nauczyciela
   - Przypisz
   - Zaktualizuj dostępne obciążenie
3. Zwróć wszystkie propozycje

### 5. `walidujPrzypisanie()`

Waliduje przypisanie przed zapisem.

**Parametry:**
- `payload` - Instancja Payload CMS
- `nauczycielId` - ID nauczyciela
- `przedmiotId` - ID przedmiotu
- `klasaId` - ID klasy
- `godzinyTygodniowo` - Godziny tygodniowo
- `rokSzkolny` - Rok szkolny

**Zwraca:** Wynik walidacji (czy ważne, problemy, ostrzeżenia)

## Struktury danych

### `DostepnoscNauczyciela`

```typescript
interface DostepnoscNauczyciela {
  nauczycielId: string;
  nauczycielNazwa: string;
  maxObciazenie: number; // Godziny tygodniowo
  aktualneObciazenie: number; // Godziny tygodniowo
  dostepneObciazenie: number; // maxObciazenie - aktualneObciazenie
  maKwalifikacje: boolean;
  kwalifikacje?: {
    stopien?: string;
    specjalizacja?: string;
  };
  procentWykorzystania: number; // (aktualne / max) * 100
}
```

### `PropozycjaPrzypisania`

```typescript
interface PropozycjaPrzypisania {
  przedmiotId: string;
  przedmiotNazwa: string;
  klasaId: string;
  klasaNazwa: string;
  nauczycielId: string;
  nauczycielNazwa: string;
  godzinyTygodniowo: number;
  godzinyRoczne: number;
  priorytet: number; // Im wyższy, tym lepsze przypisanie
  powod: string; // Powód przypisania
  ostrzezenia: string[];
}
```

### `WynikPrzypisania`

```typescript
interface WynikPrzypisania {
  przypisanie?: PropozycjaPrzypisania;
  dostepniNauczyciele: DostepnoscNauczyciela[];
  problemy: string[];
  czyMozliwe: boolean;
}
```

## Algorytm przypisywania

### Krok 1: Sprawdzenie kwalifikacji

```typescript
kwalifikacje = POBRZ_KWALIFIKACJE(nauczycielId, przedmiotId)
maKwalifikacje = kwalifikacje.length > 0 && kwalifikacje[0].aktywne
```

### Krok 2: Obliczenie obciążenia

```typescript
rozklady = POBRZ_ROZKLAD_GODZIN(nauczycielId, rokSzkolny)
aktualneObciazenie = SUM(rozklady.godziny_tyg)
dostepneObciazenie = maxObciazenie - aktualneObciazenie
```

### Krok 3: Wybór najlepszego nauczyciela

**Kryteria (w kolejności priorytetu):**
1. Preferowani nauczyciele (jeśli podano)
2. Ma kwalifikacje (jeśli wymagane)
3. Wystarczające dostępne obciążenie
4. Najwięcej dostępnego obciążenia (wyrównanie)
5. Najniższe wykorzystanie (wyrównanie)

### Krok 4: Obliczenie priorytetu

```typescript
priorytet = 100

// Bonusy
JEŚLI preferowany:
  priorytet += 30

JEŚLI procentWykorzystania < 50:
  priorytet += 20  // Wyrównanie obciążeń

JEŚLI już uczy tego przedmiotu w klasie:
  priorytet += 10  // Kontynuacja

// Kary
JEŚLI noweObciazenie > maxObciazenie:
  priorytet -= 50  // Przekroczenie

JEŚLI noweObciazenie == maxObciazenie:
  priorytet -= 20  // Pełne obciążenie

JEŚLI procentWykorzystania > 80:
  priorytet -= 10  // Wysokie wykorzystanie
```

## Przykłady użycia

### Przykład 1: Proste przypisanie

```typescript
const wynik = await proponujPrzypisanie(payload, {
  przedmiotId: 'przedmiot-jp',
  klasaId: 'klasa-1a',
  godzinyTygodniowo: 4,
  godzinyRoczne: 120,
  rokSzkolny: '2024/2025',
});

if (wynik.przypisanie) {
  // Zapisz przypisanie
  await payload.create({
    collection: 'rozkład-godzin',
    data: {
      przedmiot: wynik.przypisanie.przedmiotId,
      klasa: wynik.przypisanie.klasaId,
      nauczyciel: wynik.przypisanie.nauczycielId,
      godzinyTygodniowo: wynik.przypisanie.godzinyTygodniowo,
      godzinyRoczne: wynik.przypisanie.godzinyRoczne,
      rokSzkolny: '2024/2025',
    },
  });
}
```

### Przykład 2: Wiele przypisań z wyrównaniem

```typescript
const zadania = [
  { przedmiotId: 'jp', klasaId: '1a', godzinyTygodniowo: 4, godzinyRoczne: 120 },
  { przedmiotId: 'mat', klasaId: '1a', godzinyTygodniowo: 4, godzinyRoczne: 120 },
  { przedmiotId: 'hist', klasaId: '1a', godzinyTygodniowo: 2, godzinyRoczne: 60 },
];

const wynik = await proponujRozkladGodzin(payload, zadania, '2024/2025');

// Zapisz wszystkie propozycje
for (const propozycja of wynik.propozycje) {
  await payload.create({
    collection: 'rozkład-godzin',
    data: {
      przedmiot: propozycja.przedmiotId,
      klasa: propozycja.klasaId,
      nauczyciel: propozycja.nauczycielId,
      godzinyTygodniowo: propozycja.godzinyTygodniowo,
      godzinyRoczne: propozycja.godzinyRoczne,
      rokSzkolny: '2024/2025',
    },
  });
}
```

### Przykład 3: Walidacja przed zapisem

```typescript
const walidacja = await walidujPrzypisanie(
  payload,
  'nauczyciel-id-123',
  'przedmiot-id-456',
  'klasa-id-789',
  4,
  '2024/2025'
);

if (!walidacja.czyWazne) {
  console.error('Nie można zapisać przypisania:');
  walidacja.problemy.forEach(problem => console.error(`  - ${problem}`));
  return;
}

// Zapisz przypisanie
await payload.create({
  collection: 'rozkład-godzin',
  data: { /* ... */ },
});
```

## Integracja z Payload CMS

### Hook przed zapisem

```typescript
// W kolekcji RozkladGodzin
beforeChange: [
  async ({ data, req }) => {
    const walidacja = await walidujPrzypisanie(
      req.payload,
      data.nauczyciel,
      data.przedmiot,
      data.klasa,
      data.godziny_tyg,
      data.rok_szkolny
    );

    if (!walidacja.czyWazne) {
      throw new Error(walidacja.problemy.join(', '));
    }

    return data;
  },
],
```

### API endpoint do proponowania

```typescript
// src/app/api/proponuj-przypisanie/route.ts
export async function POST(req: Request) {
  const { przedmiotId, klasaId, godzinyTygodniowo, godzinyRoczne, rokSzkolny } = await req.json();
  
  const payload = await getPayload({ config });
  
  const wynik = await proponujPrzypisanie(payload, {
    przedmiotId,
    klasaId,
    godzinyTygodniowo,
    godzinyRoczne,
    rokSzkolny,
  });
  
  return Response.json(wynik);
}
```

## Optymalizacje

### 1. Cache'owanie obciążeń

Obciążenia nauczycieli można cache'ować i aktualizować tylko przy zmianach.

### 2. Batch queries

Zamiast wielu zapytań, użyj jednego z JOIN do pobrania wszystkich danych naraz.

### 3. Algorytm optymalizacji

Dla większych szkół można użyć bardziej zaawansowanych algorytmów:
- **Hungarian algorithm** - optymalne przypisanie
- **Simulated annealing** - optymalizacja globalna
- **Genetic algorithm** - ewolucyjna optymalizacja

## Następne kroki

1. Dodaj wizualizację obciążeń nauczycieli
2. Dodaj możliwość ręcznej korekty propozycji
3. Dodaj historię zmian przypisań
4. Dodaj powiadomienia email przy problemach
5. Dodaj eksport do XLS z propozycjami

---

**Plik implementacji:** `src/utils/przypisywanieNauczycieli.ts`  
**Przykłady:** `src/utils/przypisywanieNauczycieli.example.ts`
