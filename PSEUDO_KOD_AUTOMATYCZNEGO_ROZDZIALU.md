# Pseudo-kod: Automatyczny rozdział godzin

## Główny algorytm

```
FUNKCJA automatycznyRozdzialGodzin(typSzkolyId, rokSzkolny, opcje):
  
  // KROK 1: Pobierz wszystkie zadania do przypisania
  zadania = []
  
  klasy = POBRZ_KLASY(typSzkolyId, rokSzkolny, aktywna: true)
  
  DLA KAŻDEJ klasa W klasy:
    // Pobierz wymagania MEiN dla tej klasy
    wymagania = POBRZ_WYMAGANIA_MEIN(klasa.typ_szkoly, klasa.numer_klasy)
    
    // Sprawdź istniejące przypisania
    istniejące = POBRZ_ROZKLAD_GODZIN(klasa.id, rokSzkolny)
    
    DLA KAŻDEGO wymaganie W wymagania:
      przedmiot = POBRZ_PRZEDMIOT(wymaganie.przedmiotId)
      
      // Sprawdź, czy już jest przypisanie
      czyJestPrzypisanie = SPRAWDZ_CZY_JEST_PRZYPISANIE(istniejące, przedmiot.id)
      
      JEŚLI NIE czyJestPrzypisanie:
        // Oblicz godziny
        godzinyTygodniowo = wymaganie.godziny_tygodniowo_min LUB 
                           (wymaganie.godziny_w_cyklu / liczba_lat / 30)
        godzinyRoczne = godzinyTygodniowo * 30
        
        DODAJ(zadania, {
          id: klasa.id + "-" + przedmiot.id,
          przedmiotId: przedmiot.id,
          przedmiotNazwa: przedmiot.nazwa,
          klasaId: klasa.id,
          klasaNazwa: klasa.nazwa,
          godzinyTygodniowo: godzinyTygodniowo,
          godzinyRoczne: godzinyRoczne,
          priorytet: wymaganie.obowiazkowe ? 100 : 50
        })
  
  // Sortuj zadania według priorytetu
  SORTUJ(zadania, (a, b) => b.priorytet - a.priorytet)
  
  // KROK 2: Pobierz nauczycieli i oblicz początkowe obciążenia
  nauczyciele = POBRZ_NAUCZYCIELI(aktywny: true)
  obciazeniaPoczatkowe = {}
  obciazeniaAktualne = {}
  
  DLA KAŻDEGO nauczyciel W nauczyciele:
    rozklady = POBRZ_ROZKLAD_GODZIN(nauczyciel.id, rokSzkolny)
    suma = SUM(rozklady.godziny_tyg)
    obciazeniaPoczatkowe[nauczyciel.id] = suma
    obciazeniaAktualne[nauczyciel.id] = suma
  
  // KROK 3: Przypisz zadania
  przypisania = []
  brakiKadrowe = []
  przypisaniaNauczycieli = {}  // Map: nauczycielId -> lista zadanieId
  
  DLA KAŻDEGO zadanie W zadania:
    // Znajdź dostępnych nauczycieli
    dostepni = ZNAJDZ_DOSTEPNYCH_NAUCZYCIELI(
      przedmiotId: zadanie.przedmiotId,
      rokSzkolny: rokSzkolny,
      wymagajKwalifikacji: opcje.wymagajKwalifikacji
    )
    
    // Filtruj według obciążenia
    dostepniZObciazeniem = []
    DLA KAŻDEGO nauczyciel W dostepni:
      obecneObciazenie = obciazeniaAktualne[nauczyciel.id]
      noweObciazenie = obecneObciazenie + zadanie.godzinyTygodniowo
      
      JEŚLI noweObciazenie <= (nauczyciel.maxObciazenie + opcje.maksymalnePrzekroczenie):
        DODAJ(dostepniZObciazeniem, nauczyciel)
    
    // Sprawdź, czy są dostępni nauczyciele
    JEŚLI dostepniZObciazeniem.length == 0:
      // Brak kadrowy
      dostepniBezObciazenia = FILTRUJ(dostepni, 
        nauczyciel => obciazeniaAktualne[nauczyciel.id] < nauczyciel.maxObciazenie
      )
      
      DODAJ(brakiKadrowe, {
        zadanieId: zadanie.id,
        przedmiotNazwa: zadanie.przedmiotNazwa,
        klasaNazwa: zadanie.klasaNazwa,
        godzinyTygodniowo: zadanie.godzinyTygodniowo,
        powod: dostepni.length == 0 
          ? "Brak nauczycieli z kwalifikacjami"
          : "Brak nauczycieli z dostępnym obciążeniem",
        dostepniNauczyciele: dostepniBezObciazenia.length
      })
      KONTYNUUJ
    
    // Wybierz najlepszego nauczyciela
    SORTUJ(dostepniZObciazeniem, (a, b) => {
      // Preferuj kontynuację (jeśli opcja włączona)
      JEŚLI opcje.preferujKontynuacje:
        aUczy = SPRAWDZ_CZY_UCZY(a.id, zadanie.przedmiotId, przypisaniaNauczycieli)
        bUczy = SPRAWDZ_CZY_UCZY(b.id, zadanie.przedmiotId, przypisaniaNauczycieli)
        
        JEŚLI aUczy AND NIE bUczy:
          ZWRÓĆ -1
        JEŚLI NIE aUczy AND bUczy:
          ZWRÓĆ 1
      
      // Preferuj niższe obciążenie (wyrównanie)
      aProcent = (obciazeniaAktualne[a.id] / a.maxObciazenie) * 100
      bProcent = (obciazeniaAktualne[b.id] / b.maxObciazenie) * 100
      
      ZWRÓĆ aProcent - bProcent
    })
    
    wybrany = dostepniZObciazeniem[0]
    
    // Utwórz przypisanie
    przypisanie = {
      zadanieId: zadanie.id,
      przedmiotId: zadanie.przedmiotId,
      przedmiotNazwa: zadanie.przedmiotNazwa,
      klasaId: zadanie.klasaId,
      klasaNazwa: zadanie.klasaNazwa,
      nauczycielId: wybrany.id,
      nauczycielNazwa: wybrany.nazwa,
      godzinyTygodniowo: zadanie.godzinyTygodniowo,
      godzinyRoczne: zadanie.godzinyRoczne,
      powod: SPRAWDZ_CZY_UCZY(wybrany.id, zadanie.przedmiotId, przypisaniaNauczycieli)
        ? "Kontynuacja przedmiotu"
        : "Wyrównanie obciążeń"
    }
    
    DODAJ(przypisania, przypisanie)
    
    // Aktualizuj obciążenia
    obciazeniaAktualne[wybrany.id] = obciazeniaAktualne[wybrany.id] + zadanie.godzinyTygodniowo
    
    // Aktualizuj mapę przypisań
    JEŚLI NIE przypisaniaNauczycieli[wybrany.id]:
      przypisaniaNauczycieli[wybrany.id] = []
    DODAJ(przypisaniaNauczycieli[wybrany.id], zadanie.id)
  
  // KROK 4: Oblicz statystyki obciążeń
  statystykiObciazenia = []
  DLA KAŻDEGO nauczyciel W nauczyciele:
    przed = obciazeniaPoczatkowe[nauczyciel.id]
    po = obciazeniaAktualne[nauczyciel.id]
    przypisaniaNauczyciela = FILTRUJ(przypisania, p => p.nauczycielId == nauczyciel.id)
    
    DODAJ(statystykiObciazenia, {
      nauczycielId: nauczyciel.id,
      nauczycielNazwa: nauczyciel.nazwa,
      maxObciazenie: nauczyciel.maxObciazenie,
      przedObciazenie: przed,
      poObciazeniu: po,
      roznica: po - przed,
      procentWykorzystania: (po / nauczyciel.maxObciazenie) * 100,
      przypisania: przypisaniaNauczyciela.length
    })
  
  // KROK 5: Oblicz metryki
  obciazenia = WARTOSCI(obciazeniaAktualne)
  srednieObciazenie = SUM(obciazenia) / LICZBA(obciazenia)
  
  wariancja = 0
  DLA KAŻDEGO obciazenie W obciazenia:
    wariancja = wariancja + (obciazenie - srednieObciazenie)^2
  wariancja = wariancja / LICZBA(obciazenia)
  odchylenieStandardowe = SQRT(wariancja)
  
  wspolczynnikWyrównania = srednieObciazenie > 0
    ? MAX(0, 1 - (odchylenieStandardowe / srednieObciazenie))
    : 0
  
  // KROK 6: Generuj ostrzeżenia
  ostrzezenia = []
  
  przekroczenia = FILTRUJ(statystykiObciazenia, s => s.poObciazeniu > s.maxObciazenie)
  JEŚLI LICZBA(przekroczenia) > 0:
    DODAJ(ostrzezenia, "{LICZBA(przekroczenia)} nauczycieli przekroczyło maksymalne obciążenie")
  
  niskoObciazeni = FILTRUJ(statystykiObciazenia, s => s.procentWykorzystania < 50)
  JEŚLI LICZBA(niskoObciazeni) > 0:
    DODAJ(ostrzezenia, "{LICZBA(niskoObciazeni)} nauczycieli ma obciążenie poniżej 50%")
  
  JEŚLI LICZBA(brakiKadrowe) > 0:
    DODAJ(ostrzezenia, "{LICZBA(brakiKadrowe)} przedmiotów nie ma przypisanych nauczycieli")
  
  // KROK 7: Zwróć wynik
  ZWRÓĆ {
    przypisania: przypisania,
    brakiKadrowe: brakiKadrowe,
    statystykiObciazenia: statystykiObciazenia,
    metryki: {
      lacznieZadan: LICZBA(zadania),
      udanePrzypisania: LICZBA(przypisania),
      nieudanePrzypisania: LICZBA(brakiKadrowe),
      srednieObciazenie: srednieObciazenie,
      odchylenieStandardowe: odchylenieStandardowe,
      wspolczynnikWyrównania: wspolczynnikWyrównania
    },
    ostrzezenia: ostrzezenia
  }

KONIEC FUNKCJI
```

## Przykład działania

### Przykład 1: Prosty przypadek

```
WEJŚCIE:
  Klasy: [1A, 1B, 2A]
  Przedmioty: [JP, MAT, HIST]
  Nauczyciele: [A: 0/18h, B: 0/18h, C: 0/18h]

ZADANIA:
  1. JP w 1A (4h) - priorytet 100
  2. MAT w 1A (4h) - priorytet 100
  3. JP w 1B (4h) - priorytet 100
  4. HIST w 1A (2h) - priorytet 100

ITERACJA 1: JP w 1A (4h)
  Dostępni: [A, B, C] (wszyscy mają kwalifikacje i czas)
  Wybrany: A (najniższe obciążenie: 0%)
  Przypisanie: A → JP w 1A (4h)
  Obciążenie A: 4/18 (22.2%)

ITERACJA 2: MAT w 1A (4h)
  Dostępni: [A: 4/18, B: 0/18, C: 0/18]
  Wybrany: B (najniższe obciążenie: 0%)
  Przypisanie: B → MAT w 1A (4h)
  Obciążenie B: 4/18 (22.2%)

ITERACJA 3: JP w 1B (4h)
  Dostępni: [A: 4/18, B: 4/18, C: 0/18]
  Wybrany: A (kontynuacja - już uczy JP)
  Przypisanie: A → JP w 1B (4h)
  Obciążenie A: 8/18 (44.4%)

ITERACJA 4: HIST w 1A (2h)
  Dostępni: [A: 8/18, B: 4/18, C: 0/18]
  Wybrany: C (najniższe obciążenie: 0%)
  Przypisanie: C → HIST w 1A (2h)
  Obciążenie C: 2/18 (11.1%)

WYNIK:
  Nauczyciel A: 8/18 (44.4%) - 2 przypisania
  Nauczyciel B: 4/18 (22.2%) - 1 przypisanie
  Nauczyciel C: 2/18 (11.1%) - 1 przypisanie
  
  Średnie obciążenie: 4.67h
  Odchylenie standardowe: 2.49h
  Współczynnik wyrównania: 0.47 (umiarkowane)
```

### Przykład 2: Wykrywanie braku kadrowego

```
WEJŚCIE:
  Zadanie: JP w 1A (4h)
  Nauczyciele:
    A: 18/18h (pełny etat)
    B: 18/18h (pełny etat)
    C: 16/18h (brak kwalifikacji do JP)

ITERACJA:
  Dostępni z kwalifikacjami: [A, B]
  Dostępni z obciążeniem: [] (A i B mają pełny etat)
  
  Brak kadrowy:
    Powód: "Brak nauczycieli z dostępnym obciążeniem"
    Dostępni nauczyciele (bez czasu): 2
    Sugerowane rozwiązania:
      - "Zwiększ obciążenie istniejących nauczycieli"
      - "Zatrudnij nowego nauczyciela"
```

### Przykład 3: Wyrównanie obciążeń

```
WEJŚCIE:
  Zadania: 10 zadań po 2h (20h łącznie)
  Nauczyciele:
    A: 0/18h
    B: 0/18h
    C: 0/18h

ALGORYTM:
  Iteracja 1: A → 2h (0% → 11.1%)
  Iteracja 2: B → 2h (0% → 11.1%)
  Iteracja 3: C → 2h (0% → 11.1%)
  Iteracja 4: A → 2h (11.1% → 22.2%)
  Iteracja 5: B → 2h (11.1% → 22.2%)
  Iteracja 6: C → 2h (11.1% → 22.2%)
  Iteracja 7: A → 2h (22.2% → 33.3%)
  Iteracja 8: B → 2h (22.2% → 33.3%)
  Iteracja 9: C → 2h (22.2% → 33.3%)
  Iteracja 10: A → 2h (33.3% → 44.4%)

WYNIK:
  A: 8/18h (44.4%)
  B: 6/18h (33.3%)
  C: 6/18h (33.3%)
  
  Średnie: 6.67h
  Odchylenie: 0.94h
  Współczynnik wyrównania: 0.86 (bardzo dobre)
```

## Optymalizacje

### 1. Sortowanie zadań

Zadania są sortowane według priorytetu, co zapewnia, że ważniejsze zadania (obowiązkowe) są przypisywane w pierwszej kolejności.

### 2. Wyrównanie obciążeń

Algorytm preferuje nauczycieli z niskim obciążeniem, co prowadzi do wyrównania.

### 3. Kontynuacja przedmiotów

Jeśli włączona, nauczyciele, którzy już uczą przedmiotu, są preferowani (stabilność).

### 4. Tolerancja przekroczenia

Można ustawić `maksymalnePrzekroczenie`, aby pozwolić na niewielkie przekroczenia w sytuacjach awaryjnych.

## Złożoność

- **Czas:** O(n * m * k)
  - n = liczba zadań
  - m = liczba nauczycieli
  - k = średnia liczba kwalifikacji nauczyciela

- **Pamięć:** O(n + m)
  - Przechowujemy zadania, przypisania i obciążenia

## Ulepszenia (przyszłe)

1. **Iteracyjna optymalizacja** - Przenoszenie godzin między nauczycielami
2. **Hungarian algorithm** - Dla małych problemów (optymalne przypisanie)
3. **Simulated annealing** - Dla większych problemów (optymalizacja globalna)
4. **Machine learning** - Uczenie się z poprzednich przypisań

---

**Plik implementacji:** `src/utils/automatycznyRozdzialGodzin.ts`
