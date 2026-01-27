# Pseudo-kod: Obliczanie zgodności z wymaganiami MEiN

## Główny algorytm

```
FUNKCJA obliczZgodnoscMein(przedmiotId, typSzkolyId, klasaId, rokSzkolny):
  
  // KROK 1: Pobierz wymagania MEiN
  siatkiMein = POBRZ_WYMAGANIA_MEIN(
    przedmiotId: przedmiotId,
    typSzkolyId: typSzkolyId,
    dataSprawdzenia: DZISIAJ
  )
  
  wyniki = []
  
  // KROK 2: Dla każdego wymagania MEiN
  DLA KAŻDEGO siatkaMein W siatkiMein:
    
    przedmiot = POBRZ_PRZEDMIOT(siatkaMein.przedmiotId)
    typSzkoly = POBRZ_TYP_SZKOLY(siatkaMein.typSzkolyId)
    
    // KROK 3: Znajdź odpowiednie klasy
    JEŚLI siatkaMein.klasa != NULL:
      // Wymaganie dla konkretnej klasy
      klasy = POBRZ_KLASY(
        typSzkolyId: typSzkolyId,
        numerKlasy: siatkaMein.klasa,
        rokSzkolny: rokSzkolny
      )
    INACZEJ:
      // Wymaganie dla całego cyklu
      klasy = POBRZ_WSZYSTKIE_KLASY(
        typSzkolyId: typSzkolyId,
        rokSzkolny: rokSzkolny
      )
    
    // KROK 4: Dla każdej klasy oblicz realizację
    DLA KAŻDEJ klasa W klasy:
      
      // Pobierz rozkład godzin
      rozklady = POBRZ_ROZKLAD_GODZIN(
        przedmiotId: przedmiot.id,
        klasaId: klasa.id,
        rokSzkolny: rokSzkolny
      )
      
      // Oblicz sumę realizowanych godzin
      sumaGodzinRocznych = 0
      sumaGodzinTygodniowo = 0
      
      DLA KAŻDEGO rozklad W rozklady:
        sumaGodzinRocznych = sumaGodzinRocznych + rozklad.godziny_roczne
        sumaGodzinTygodniowo = sumaGodzinTygodniowo + rozklad.godziny_tyg
      
      // KROK 5: Oblicz godziny w cyklu
      JEŚLI siatkaMein.klasa == NULL:
        // Wymaganie dla całego cyklu - zsumuj wszystkie klasy
        godziny_w_cyklu = 0
        
        wszystkieKlasy = POBRZ_WSZYSTKIE_KLASY(typSzkolyId, rokSzkolny)
        
        DLA KAŻDEJ k W wszystkieKlasy:
          rozkladyK = POBRZ_ROZKLAD_GODZIN(przedmiotId, k.id, rokSzkolny)
          
          DLA KAŻDEGO r W rozkladyK:
            godziny_w_cyklu = godziny_w_cyklu + r.godziny_roczne
      INACZEJ:
        // Wymaganie dla konkretnej klasy
        godziny_w_cyklu = sumaGodzinRocznych
      
      // KROK 6: Oblicz różnicę i procent realizacji
      wymagane = siatkaMein.godziny_w_cyklu
      realizowane = godziny_w_cyklu
      
      roznica = realizowane - wymagane
      
      JEŚLI wymagane > 0:
        procentRealizacji = (realizowane / wymagane) * 100
      INACZEJ:
        procentRealizacji = 0
      
      // KROK 7: Określ status
      JEŚLI wymagane == 0:
        status = "BRAK_DANYCH"
      INACZEJ JEŚLI roznica < 0:
        status = "BRAK"
      INACZEJ JEŚLI roznica > 0:
        status = "NADWYŻKA"
      INACZEJ:
        status = "OK"
      
      // KROK 8: Generuj alerty
      alerty = []
      
      JEŚLI roznica < 0:
        brakuje = ABS(roznica)
        procentBrakuje = ABS(procentRealizacji - 100)
        DODAJ_ALERT(alerty, "Brakuje {brakuje} godzin ({procentBrakuje}% poniżej minimum)")
      
      JEŚLI roznica > 0:
        nadwyzka = roznica
        procentNadwyzka = procentRealizacji - 100
        DODAJ_ALERT(alerty, "Nadwyżka {nadwyzka} godzin ({procentNadwyzka}% powyżej minimum)")
      
      JEŚLI siatkaMein.godziny_tygodniowo_min != NULL:
        JEŚLI sumaGodzinTygodniowo < siatkaMein.godziny_tygodniowo_min:
          DODAJ_ALERT(alerty, "Godziny tygodniowo ({sumaGodzinTygodniowo}) poniżej minimum ({siatkaMein.godziny_tygodniowo_min})")
      
      JEŚLI siatkaMein.godziny_tygodniowo_max != NULL:
        JEŚLI sumaGodzinTygodniowo > siatkaMein.godziny_tygodniowo_max:
          DODAJ_ALERT(alerty, "Godziny tygodniowo ({sumaGodzinTygodniowo}) powyżej maksimum ({siatkaMein.godziny_tygodniowo_max})")
      
      // KROK 9: Utwórz wynik
      wynik = {
        przedmiotId: przedmiot.id,
        przedmiotNazwa: przedmiot.nazwa,
        typSzkolyId: typSzkoly.id,
        typSzkolyNazwa: typSzkoly.nazwa,
        klasaId: klasa.id,
        klasaNazwa: klasa.nazwa,
        numerKlasy: klasa.numer_klasy,
        
        wymaganeMein: {
          godziny_w_cyklu: wymagane,
          godziny_tygodniowo_min: siatkaMein.godziny_tygodniowo_min,
          godziny_tygodniowo_max: siatkaMein.godziny_tygodniowo_max,
          obowiazkowe: siatkaMein.obowiazkowe,
          klasa: siatkaMein.klasa
        },
        
        realizowane: {
          godziny_roczne: sumaGodzinRocznych,
          godziny_w_cyklu: godziny_w_cyklu,
          godziny_tygodniowo_srednia: sumaGodzinTygodniowo
        },
        
        roznica: {
          godziny: roznica,
          procent_realizacji: procentRealizacji
        },
        
        status: status,
        alerty: alerty
      }
      
      DODAJ(wyniki, wynik)
    
  KONIEC DLA
  
  ZWRÓĆ wyniki

KONIEC FUNKCJI
```

## Przykład obliczeń

### Przykład 1: Przedmiot z brakami

```
WYMAGANIA MEIN:
  Przedmiot: "Język polski"
  Typ szkoły: "Liceum ogólnokształcące"
  Godziny w cyklu: 360
  Klasa: NULL (cały cykl)

REALIZOWANE:
  Klasa 1A: 90 godzin rocznie
  Klasa 2A: 90 godzin rocznie
  Klasa 3A: 90 godzin rocznie
  Klasa 4A: 90 godzin rocznie
  ---------------------------------
  Suma w cyklu: 360 godzin

OBLICZENIA:
  wymagane = 360
  realizowane = 360
  roznica = 360 - 360 = 0
  procent_realizacji = (360 / 360) * 100 = 100%

STATUS: "OK"
```

### Przykład 2: Przedmiot z brakami

```
WYMAGANIA MEIN:
  Przedmiot: "Matematyka"
  Typ szkoły: "Liceum ogólnokształcące"
  Godziny w cyklu: 360
  Klasa: NULL (cały cykl)

REALIZOWANE:
  Klasa 1A: 80 godzin rocznie
  Klasa 2A: 80 godzin rocznie
  Klasa 3A: 80 godzin rocznie
  Klasa 4A: 80 godzin rocznie
  ---------------------------------
  Suma w cyklu: 320 godzin

OBLICZENIA:
  wymagane = 360
  realizowane = 320
  roznica = 320 - 360 = -40
  procent_realizacji = (320 / 360) * 100 = 88.9%

STATUS: "BRAK"
ALERTY: ["Brakuje 40 godzin (11.1% poniżej wymaganego minimum)"]
```

### Przykład 3: Przedmiot z nadwyżką

```
WYMAGANIA MEIN:
  Przedmiot: "Historia"
  Typ szkoły: "Liceum ogólnokształcące"
  Godziny w cyklu: 120
  Klasa: NULL (cały cykl)

REALIZOWANE:
  Klasa 1A: 35 godzin rocznie
  Klasa 2A: 35 godzin rocznie
  Klasa 3A: 35 godzin rocznie
  Klasa 4A: 35 godzin rocznie
  ---------------------------------
  Suma w cyklu: 140 godzin

OBLICZENIA:
  wymagane = 120
  realizowane = 140
  roznica = 140 - 120 = +20
  procent_realizacji = (140 / 120) * 100 = 116.7%

STATUS: "NADWYŻKA"
ALERTY: ["Nadwyżka 20 godzin (16.7% powyżej wymaganego minimum)"]
```

### Przykład 4: Wymaganie dla konkretnej klasy

```
WYMAGANIA MEIN:
  Przedmiot: "Edukacja wczesnoszkolna"
  Typ szkoły: "Szkoła podstawowa"
  Godziny w cyklu: 60
  Klasa: 1 (tylko klasa 1)

REALIZOWANE:
  Klasa 1A: 60 godzin rocznie
  Klasa 1B: 60 godzin rocznie
  Klasa 1C: 60 godzin rocznie
  ---------------------------------
  Suma dla klasy 1: 180 godzin (ale to suma z 3 oddziałów!)

UWAGA: W tym przypadku każdy oddział klasy 1 musi mieć 60 godzin,
       więc sprawdzamy każdy oddział osobno, nie sumujemy.
```

## Funkcje pomocnicze

### Funkcja: Oblicz dla pojedynczego przedmiotu w klasie

```
FUNKCJA obliczZgodnoscDlaPrzedmiotuWKlasie(przedmiotId, klasaId, rokSzkolny):
  wyniki = obliczZgodnoscMein(
    przedmiotId: przedmiotId,
    klasaId: klasaId,
    rokSzkolny: rokSzkolny
  )
  
  JEŚLI wyniki.length > 0:
    ZWRÓĆ wyniki[0]
  INACZEJ:
    ZWRÓĆ NULL
KONIEC FUNKCJI
```

### Funkcja: Oblicz dla całej klasy

```
FUNKCJA obliczZgodnoscDlaKlasy(klasaId, rokSzkolny):
  wyniki = obliczZgodnoscMein(
    klasaId: klasaId,
    rokSzkolny: rokSzkolny
  )
  
  ZWRÓĆ wyniki
KONIEC FUNKCJI
```

### Funkcja: Oblicz dla całej szkoły

```
FUNKCJA obliczZgodnoscDlaSzkoly(typSzkolyId, rokSzkolny):
  wyniki = obliczZgodnoscMein(
    typSzkolyId: typSzkolyId,
    rokSzkolny: rokSzkolny
  )
  
  ZWRÓĆ wyniki
KONIEC FUNKCJI
```

## Złożoność obliczeniowa

- **Czas:** O(n * m * k)
  - n = liczba wymagań MEiN
  - m = liczba klas
  - k = liczba wpisów w rozkładzie godzin

- **Pamięć:** O(n * m)
  - Przechowujemy wyniki dla każdej kombinacji przedmiot/klasa

## Optymalizacje

1. **Cache'owanie:** Przechowuj wyniki w cache, aktualizuj tylko przy zmianach
2. **Batch queries:** Zamiast wielu zapytań, użyj jednego z JOIN
3. **Indeksy:** Upewnij się, że baza ma indeksy na:
   - `przedmiot_id`, `klasa_id` w rozkładzie godzin
   - `typ_szkoly_id`, `numer_klasy` w klasach
   - `przedmiot_id`, `typ_szkoly_id` w siatkach MEiN

---

**Plik implementacji:** `src/utils/zgodnoscMein.ts`
