# Pseudo-kod: Przypisywanie nauczycieli do przedmiotów

## Główny algorytm przypisywania

```
FUNKCJA proponujPrzypisanie(przedmiotId, klasaId, godzinyTygodniowo, godzinyRoczne, rokSzkolny):
  
  // KROK 1: Pobierz dane przedmiotu i klasy
  przedmiot = POBRZ_PRZEDMIOT(przedmiotId)
  klasa = POBRZ_KLASE(klasaId)
  
  JEŚLI NIE przedmiot LUB NIE klasa:
    ZWRÓĆ { czyMozliwe: false, problemy: ["Przedmiot lub klasa nie istnieje"] }
  
  // KROK 2: Znajdź wszystkich aktywnych nauczycieli
  nauczyciele = POBRZ_NAUCZYCIELI(aktywny: true)
  
  dostepni = []
  
  // KROK 3: Dla każdego nauczyciela sprawdź dostępność
  DLA KAŻDEGO nauczyciel W nauczyciele:
    
    // Sprawdź kwalifikacje
    kwalifikacje = POBRZ_KWALIFIKACJE(nauczyciel.id, przedmiotId)
    maKwalifikacje = kwalifikacje.length > 0 AND kwalifikacje[0].aktywne == true
    
    JEŚLI wymagajKwalifikacji AND NIE maKwalifikacje:
      KONTYNUUJ  // Pomiń tego nauczyciela
    
    // Sprawdź obciążenie
    rozklady = POBRZ_ROZKLAD_GODZIN(nauczyciel.id, rokSzkolny)
    aktualneObciazenie = SUM(rozklady.godziny_tyg)
    maxObciazenie = nauczyciel.max_obciazenie
    dostepneObciazenie = maxObciazenie - aktualneObciazenie
    
    JEŚLI dostepneObciazenie < godzinyTygodniowo:
      KONTYNUUJ  // Pomiń - za mało dostępnego obciążenia
    
    // Sprawdź preferencje
    JEŚLI nauczyciel.id W wykluczeniNauczyciele:
      KONTYNUUJ  // Pomiń wykluczonych
    
    // Dodaj do listy dostępnych
    DODAJ(dostepni, {
      nauczycielId: nauczyciel.id,
      nauczycielNazwa: nauczyciel.imie + " " + nauczyciel.nazwisko,
      maxObciazenie: maxObciazenie,
      aktualneObciazenie: aktualneObciazenie,
      dostepneObciazenie: dostepneObciazenie,
      maKwalifikacje: maKwalifikacje,
      procentWykorzystania: (aktualneObciazenie / maxObciazenie) * 100
    })
  
  // KROK 4: Sortuj dostępnych nauczycieli
  SORTUJ(dostepni, (a, b) => {
    // Najpierw preferowani
    aPreferowany = a.nauczycielId W preferowaniNauczyciele ? 1 : 0
    bPreferowany = b.nauczycielId W preferowaniNauczyciele ? 1 : 0
    
    JEŚLI aPreferowany != bPreferowany:
      ZWRÓĆ bPreferowany - aPreferowany
    
    // Potem według dostępnego obciążenia (więcej = lepiej)
    ZWRÓĆ b.dostepneObciazenie - a.dostepneObciazenie
  })
  
  // KROK 5: Sprawdź, czy są dostępni nauczyciele
  JEŚLI dostepni.length == 0:
    ZWRÓĆ {
      czyMozliwe: false,
      problemy: ["Brak dostępnych nauczycieli"],
      dostepniNauczyciele: []
    }
  
  // KROK 6: Wybierz najlepszego nauczyciela
  wybrany = dostepni[0]
  noweObciazenie = wybrany.aktualneObciazenie + godzinyTygodniowo
  
  // KROK 7: Oblicz priorytet przypisania
  priorytet = 100
  
  // Bonusy
  JEŚLI wybrany.nauczycielId W preferowaniNauczyciele:
    priorytet = priorytet + 30
  
  JEŚLI wybrany.procentWykorzystania < 50:
    priorytet = priorytet + 20  // Wyrównanie obciążeń
  
  // Sprawdź, czy już uczy tego przedmiotu w klasie
  istniejące = POBRZ_ROZKLAD_GODZIN(przedmiotId, klasaId, wybrany.nauczycielId, rokSzkolny)
  JEŚLI istniejące.length > 0:
    priorytet = priorytet + 10  // Kontynuacja
  
  // Kary
  JEŚLI noweObciazenie > wybrany.maxObciazenie:
    priorytet = priorytet - 50  // Przekroczenie
    DODAJ_OSTRZEZENIE("Przypisanie spowoduje przekroczenie maksymalnego obciążenia")
  
  JEŚLI noweObciazenie == wybrany.maxObciazenie:
    priorytet = priorytet - 20  // Pełne obciążenie
    DODAJ_OSTRZEZENIE("Nauczyciel osiągnie maksymalne obciążenie")
  
  JEŚLI wybrany.procentWykorzystania > 80:
    priorytet = priorytet - 10  // Wysokie wykorzystanie
  
  // KROK 8: Utwórz propozycję
  propozycja = {
    przedmiotId: przedmiotId,
    przedmiotNazwa: przedmiot.nazwa,
    klasaId: klasaId,
    klasaNazwa: klasa.nazwa,
    nauczycielId: wybrany.nauczycielId,
    nauczycielNazwa: wybrany.nauczycielNazwa,
    godzinyTygodniowo: godzinyTygodniowo,
    godzinyRoczne: godzinyRoczne,
    priorytet: priorytet,
    powod: "Najlepszy dostępny nauczyciel",
    ostrzezenia: ostrzezenia
  }
  
  ZWRÓĆ {
    przypisanie: propozycja,
    dostepniNauczyciele: dostepni,
    problemy: [],
    czyMozliwe: true
  }

KONIEC FUNKCJI
```

## Algorytm dla wielu przypisań (Greedy)

```
FUNKCJA proponujRozkladGodzin(zadania, rokSzkolny):
  
  propozycje = []
  problemy = []
  przypisaniNauczyciele = {}  // Map: nauczycielId -> suma godzin
  
  // KROK 1: Sortuj zadania według priorytetu
  SORTUJ(zadania, (a, b) => {
    // Najpierw zadania z preferowanymi nauczycielami
    aMaPreferowanych = (a.preferowaniNauczyciele.length > 0) ? 1 : 0
    bMaPreferowanych = (b.preferowaniNauczyciele.length > 0) ? 1 : 0
    
    JEŚLI aMaPreferowanych != bMaPreferowanych:
      ZWRÓĆ bMaPreferowanych - aMaPreferowanych
    
    // Potem większe godziny
    ZWRÓĆ b.godzinyTygodniowo - a.godzinyTygodniowo
  })
  
  // KROK 2: Dla każdego zadania znajdź nauczyciela
  DLA KAŻDEGO zadanie W zadania:
    
    // Zaktualizuj wykluczonych (którzy już mają pełny etat)
    wykluczeni = []
    DLA KAŻDEJ para (nauczycielId, suma) W przypisaniNauczyciele:
      JEŚLI suma >= 18:  // Pełny etat
        DODAJ(wykluczeni, nauczycielId)
    
    // Proponuj przypisanie
    wynik = proponujPrzypisanie(
      przedmiotId: zadanie.przedmiotId,
      klasaId: zadanie.klasaId,
      godzinyTygodniowo: zadanie.godzinyTygodniowo,
      godzinyRoczne: zadanie.godzinyRoczne,
      rokSzkolny: rokSzkolny,
      preferowaniNauczyciele: zadanie.preferowaniNauczyciele,
      wykluczeniNauczyciele: wykluczeni + zadanie.wykluczeniNauczyciele
    )
    
    JEŚLI wynik.przypisanie:
      DODAJ(propozycje, wynik.przypisanie)
      
      // Aktualizuj mapę przypisanych
      obecnaSuma = przypisaniNauczyciele[wynik.przypisanie.nauczycielId] LUB 0
      przypisaniNauczyciele[wynik.przypisanie.nauczycielId] = 
        obecnaSuma + wynik.przypisanie.godzinyTygodniowo
    INACZEJ:
      DODAJ(problemy, "Nie można przypisać: " + wynik.problemy.join(", "))
  
  // KROK 3: Oblicz statystyki
  statystyki = {
    lacznie: zadania.length,
    udane: propozycje.length,
    nieudane: zadania.length - propozycje.length,
    sredniPriorytet: SUM(propozycje.priorytet) / propozycje.length
  }
  
  ZWRÓĆ {
    propozycje: propozycje,
    problemy: problemy,
    statystyki: statystyki
  }

KONIEC FUNKCJI
```

## Przykład działania

### Przykład 1: Proste przypisanie

```
WEJŚCIE:
  przedmiotId: "Język polski"
  klasaId: "1A"
  godzinyTygodniowo: 4
  rokSzkolny: "2024/2025"

KROK 1: Znajdź dostępnych nauczycieli
  Nauczyciel A:
    - Ma kwalifikacje: TAK
    - Aktualne obciążenie: 10 godzin/tyg
    - Maksymalne: 18 godzin/tyg
    - Dostępne: 8 godzin/tyg
    - Procent wykorzystania: 55.6%
  
  Nauczyciel B:
    - Ma kwalifikacje: TAK
    - Aktualne obciążenie: 14 godzin/tyg
    - Maksymalne: 18 godzin/tyg
    - Dostępne: 4 godzin/tyg
    - Procent wykorzystania: 77.8%
  
  Nauczyciel C:
    - Ma kwalifikacje: NIE
    - (Pominięty)

KROK 2: Sortuj dostępnych
  [Nauczyciel A, Nauczyciel B]  // A ma więcej dostępnego obciążenia

KROK 3: Wybierz najlepszego
  Wybrany: Nauczyciel A

KROK 4: Oblicz priorytet
  priorytet = 100
  + 20 (niskie wykorzystanie < 50%? NIE, ale blisko)
  = 100

KROK 5: Sprawdź obciążenie po przypisaniu
  noweObciazenie = 10 + 4 = 14 godzin/tyg
  14 < 18  ✅ OK

WYJŚCIE:
  przypisanie: {
    nauczyciel: "Nauczyciel A",
    godzinyTygodniowo: 4,
    priorytet: 100,
    ostrzezenia: []
  }
```

### Przykład 2: Wiele przypisań z wyrównaniem

```
WEJŚCIE:
  zadania = [
    { przedmiot: "JP", klasa: "1A", godziny: 4 },
    { przedmiot: "MAT", klasa: "1A", godziny: 4 },
    { przedmiot: "HIST", klasa: "1A", godziny: 2 },
    { przedmiot: "JP", klasa: "1B", godziny: 4 },
  ]

DOSTĘPNI NAUCZYCIELE:
  Nauczyciel A: 0/18 godzin (0%)
  Nauczyciel B: 0/18 godzin (0%)
  Nauczyciel C: 0/18 godzin (0%)

ITERACJA 1: JP w 1A (4 godziny)
  Wybrany: Nauczyciel A (najniższe wykorzystanie)
  Przypisanie: Nauczyciel A → JP w 1A (4h)
  Obciążenie A: 4/18 (22.2%)

ITERACJA 2: MAT w 1A (4 godziny)
  Wybrany: Nauczyciel B (najniższe wykorzystanie)
  Przypisanie: Nauczyciel B → MAT w 1A (4h)
  Obciążenie B: 4/18 (22.2%)

ITERACJA 3: HIST w 1A (2 godziny)
  Wybrany: Nauczyciel A (najniższe wykorzystanie: 4/18 vs 4/18 vs 0/18)
  Przypisanie: Nauczyciel A → HIST w 1A (2h)
  Obciążenie A: 6/18 (33.3%)

ITERACJA 4: JP w 1B (4 godziny)
  Wybrany: Nauczyciel A (już uczy JP, kontynuacja)
  Przypisanie: Nauczyciel A → JP w 1B (4h)
  Obciążenie A: 10/18 (55.6%)

WYNIK:
  Nauczyciel A: 10/18 godzin (55.6%)
  Nauczyciel B: 4/18 godzin (22.2%)
  Nauczyciel C: 0/18 godzin (0%)
  
  Wyrównanie: ✅ Dobrze (różnice < 50%)
```

### Przykład 3: Problem z brakiem kwalifikacji

```
WEJŚCIE:
  przedmiotId: "Matematyka"
  klasaId: "1A"
  godzinyTygodniowo: 4

DOSTĘPNI NAUCZYCIELE:
  Nauczyciel A:
    - Ma kwalifikacje: NIE
    - (Pominięty)
  
  Nauczyciel B:
    - Ma kwalifikacje: NIE
    - (Pominięty)
  
  Nauczyciel C:
    - Ma kwalifikacje: TAK
    - Aktualne obciążenie: 18 godzin/tyg
    - Maksymalne: 18 godzin/tyg
    - Dostępne: 0 godzin/tyg
    - (Pominięty - brak dostępnego obciążenia)

WYJŚCIE:
  czyMozliwe: false
  problemy: [
    "Brak nauczycieli z kwalifikacjami do tego przedmiotu",
    "Wymagane: 4 godziny tygodniowo"
  ]
```

## Optymalizacje

### 1. Wyrównanie obciążeń

Algorytm preferuje nauczycieli z niskim wykorzystaniem, co prowadzi do wyrównania obciążeń.

### 2. Kontynuacja

Jeśli nauczyciel już uczy przedmiotu w klasie, otrzymuje bonus (kontynuacja).

### 3. Preferencje

Można wskazać preferowanych nauczycieli, którzy będą wybierani w pierwszej kolejności.

### 4. Wykluczenia

Można wykluczyć nauczycieli (np. już mają pełny etat, urlop, itp.).

---

**Plik implementacji:** `src/utils/przypisywanieNauczycieli.ts`
