# Algorytm automatycznego rozdziału godzin

## Przegląd

Algorytm automatycznie przypisuje nauczycieli do przedmiotów w klasach, wyrównując obciążenia i wykrywając braki kadrowe.

## Główne funkcje

### `automatycznyRozdzialGodzin()`

Główna funkcja wykonująca automatyczny rozdział godzin.

**Parametry:**
- `payload` - Instancja Payload CMS
- `parametry` - `ParametryRozdzialu`:
  - `typSzkolyId` - ID typu szkoły (opcjonalnie, jeśli podano, tylko klasy tego typu)
  - `rokSzkolny` - Rok szkolny (wymagane)
  - `wymagajKwalifikacji` - Czy wymagać kwalifikacji (domyślnie: true)
  - `maksymalnePrzekroczenie` - Maksymalne przekroczenie obciążenia (domyślnie: 0)
  - `preferujKontynuacje` - Preferuj nauczycieli, którzy już uczą przedmiotu (domyślnie: true)
  - `minimalneObciazenie` - Minimalne obciążenie nauczyciela (opcjonalnie)

**Zwraca:** `WynikAutomatycznegoRozdzialu`

## Algorytm

### Krok 1: Pobranie zadań

1. Pobierz wszystkie aktywne klasy dla danego roku szkolnego
2. Dla każdej klasy:
   - Pobierz wymagania MEiN
   - Sprawdź istniejące przypisania
   - Utwórz zadania dla przedmiotów, które wymagają przypisania
3. Sortuj zadania według priorytetu (obowiązkowe → opcjonalne)

### Krok 2: Analiza nauczycieli

1. Pobierz wszystkich aktywnych nauczycieli
2. Oblicz początkowe obciążenia (z istniejących przypisań)
3. Dla każdego zadania znajdź dostępnych nauczycieli

### Krok 3: Przypisywanie (Greedy z optymalizacją)

Dla każdego zadania (w kolejności priorytetu):

1. **Znajdź dostępnych nauczycieli:**
   - Z kwalifikacjami (jeśli wymagane)
   - Z wystarczającym dostępnym obciążeniem
   - Nie wykluczonych

2. **Filtruj według obciążenia:**
   - Sprawdź, czy przypisanie nie przekroczy maksimum (z tolerancją)

3. **Wybierz najlepszego nauczyciela:**
   - Sortuj według:
     1. Kontynuacja (jeśli preferujKontynuacje)
     2. Procent wykorzystania (niższy = lepszy, wyrównanie)

4. **Utwórz przypisanie i zaktualizuj obciążenia**

### Krok 4: Wykrywanie braków kadrowych

Jeśli nie można przypisać nauczyciela:
- Sprawdź, czy są nauczyciele z kwalifikacjami (ale bez czasu)
- Utwórz wpis o braku kadrowym z sugerowanymi rozwiązaniami

### Krok 5: Obliczanie statystyk

1. Oblicz obciążenia przed i po algorytmie
2. Oblicz metryki:
   - Średnie obciążenie
   - Odchylenie standardowe
   - Współczynnik wyrównania

### Krok 6: Generowanie ostrzeżeń

- Nauczyciele z przekroczeniem obciążenia
- Nauczyciele z niskim obciążeniem
- Braki kadrowe

## Struktury danych

### `ZadaniePrzypisania`

```typescript
interface ZadaniePrzypisania {
  id: string;
  przedmiotId: string;
  przedmiotNazwa: string;
  klasaId: string;
  klasaNazwa: string;
  godzinyTygodniowo: number;
  godzinyRoczne: number;
  priorytet: number;
  wymaganeKwalifikacje: boolean;
  preferowaniNauczyciele?: string[];
  wykluczeniNauczyciele?: string[];
}
```

### `Przypisanie`

```typescript
interface Przypisanie {
  zadanieId: string;
  przedmiotId: string;
  przedmiotNazwa: string;
  klasaId: string;
  klasaNazwa: string;
  nauczycielId: string;
  nauczycielNazwa: string;
  godzinyTygodniowo: number;
  godzinyRoczne: number;
  powod: string;
  priorytet: number;
}
```

### `BrakKadrowy`

```typescript
interface BrakKadrowy {
  zadanieId: string;
  przedmiotId: string;
  przedmiotNazwa: string;
  klasaId: string;
  klasaNazwa: string;
  godzinyTygodniowo: number;
  powod: string;
  dostepniNauczyciele: number;
  sugerowaneRozwiazania: string[];
}
```

### `WynikAutomatycznegoRozdzialu`

```typescript
interface WynikAutomatycznegoRozdzialu {
  przypisania: Przypisanie[];
  brakiKadrowe: BrakKadrowy[];
  statystykiObciazenia: StatystykiObciazenia[];
  metryki: {
    lacznieZadan: number;
    udanePrzypisania: number;
    nieudanePrzypisania: number;
    srednieObciazenie: number;
    odchylenieStandardowe: number;
    wspolczynnikWyrównania: number; // 0-1
  };
  ostrzezenia: string[];
}
```

## Metryki

### Współczynnik wyrównania

```
wspolczynnikWyrównania = 1 - (odchylenieStandardowe / srednieObciazenie)
```

- **1.0** = Idealne wyrównanie (wszyscy mają takie samo obciążenie)
- **0.8-0.9** = Bardzo dobre wyrównanie
- **0.6-0.8** = Dobre wyrównanie
- **< 0.6** = Słabe wyrównanie

### Odchylenie standardowe

Im mniejsze, tym lepsze wyrównanie obciążeń.

## Przykłady użycia

### Przykład 1: Podstawowe użycie

```typescript
const wynik = await automatycznyRozdzialGodzin(payload, {
  rokSzkolny: '2024/2025',
});

console.log(`Przypisano: ${wynik.metryki.udanePrzypisania} zadań`);
console.log(`Braki kadrowe: ${wynik.brakiKadrowe.length}`);
console.log(`Wyrównanie: ${(wynik.metryki.wspolczynnikWyrównania * 100).toFixed(1)}%`);
```

### Przykład 2: Z zapisem do bazy

```typescript
const wynik = await automatycznyRozdzialGodzin(payload, {
  rokSzkolny: '2024/2025',
});

for (const przypisanie of wynik.przypisania) {
  await payload.create({
    collection: 'rozkład-godzin',
    data: {
      przedmiot: przypisanie.przedmiotId,
      klasa: przypisanie.klasaId,
      nauczyciel: przypisanie.nauczycielId,
      godzinyTygodniowo: przypisanie.godzinyTygodniowo,
      godzinyRoczne: przypisanie.godzinyRoczne,
      rok_szkolny: '2024/2025',
    },
  });
}
```

### Przykład 3: Analiza braków kadrowych

```typescript
const wynik = await automatycznyRozdzialGodzin(payload, {
  rokSzkolny: '2024/2025',
});

if (wynik.brakiKadrowe.length > 0) {
  console.log('=== BRAKI KADROWE ===');
  
  // Grupuj według przedmiotu
  const brakiWedlugPrzedmiotu = new Map();
  wynik.brakiKadrowe.forEach(brak => {
    if (!brakiWedlugPrzedmiotu.has(brak.przedmiotId)) {
      brakiWedlugPrzedmiotu.set(brak.przedmiotId, []);
    }
    brakiWedlugPrzedmiotu.get(brak.przedmiotId).push(brak);
  });
  
  brakiWedlugPrzedmiotu.forEach((braki, przedmiotId) => {
    const sumaGodzin = braki.reduce((sum, b) => sum + b.godzinyTygodniowo, 0);
    console.log(`${braki[0].przedmiotNazwa}: ${sumaGodzin} godzin tyg`);
  });
}
```

## Optymalizacje

### 1. Wyrównanie obciążeń

Algorytm preferuje nauczycieli z niskim obciążeniem, co prowadzi do wyrównania.

### 2. Kontynuacja przedmiotów

Jeśli `preferujKontynuacje = true`, nauczyciele, którzy już uczą przedmiotu, są preferowani.

### 3. Priorytetyzacja zadań

Zadania są sortowane według priorytetu (obowiązkowe → opcjonalne).

### 4. Tolerancja przekroczenia

Można ustawić `maksymalnePrzekroczenie`, aby pozwolić na niewielkie przekroczenia obciążenia.

## Wykrywanie braków kadrowych

Algorytm wykrywa braki kadrowe w następujących sytuacjach:

1. **Brak nauczycieli z kwalifikacjami:**
   - Powód: "Brak nauczycieli z kwalifikacjami"
   - Rozwiązanie: Dodaj kwalifikacje lub zatrudnij nowego nauczyciela

2. **Brak nauczycieli z dostępnym obciążeniem:**
   - Powód: "Brak nauczycieli z dostępnym obciążeniem"
   - Rozwiązanie: Zwiększ obciążenie istniejących lub zatrudnij nowego

## Integracja z Payload CMS

### API endpoint

```typescript
// src/app/api/automatyczny-rozdzial/route.ts
export async function POST(req: Request) {
  const { typSzkolyId, rokSzkolny } = await req.json();
  
  const payload = await getPayload({ config });
  
  const wynik = await automatycznyRozdzialGodzin(payload, {
    typSzkolyId,
    rokSzkolny,
  });
  
  return Response.json(wynik);
}
```

### Hook przed zapisem

Można użyć wyników do automatycznego przypisywania przy tworzeniu nowych klas/przedmiotów.

## Następne kroki

1. **Optymalizacja iteracyjna** - Przenoszenie godzin między nauczycielami
2. **Wizualizacja** - Wykresy obciążeń i braków kadrowych
3. **Eksport** - Eksport wyników do XLS
4. **Historia** - Śledzenie zmian w przypisaniach
5. **Powiadomienia** - Email przy wykryciu braków kadrowych

---

**Plik implementacji:** `src/utils/automatycznyRozdzialGodzin.ts`  
**Przykłady:** `src/utils/automatycznyRozdzialGodzin.example.ts`
