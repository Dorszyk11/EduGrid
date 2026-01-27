# Dane testowe i scenariusze testowe dla systemu EduGrid

## 1. Zestaw danych testowych

### 1.1. Typy szkół

```json
[
  {
    "nazwa": "Liceum ogólnokształcące",
    "liczba_lat": 4,
    "kod_mein": "LO"
  },
  {
    "nazwa": "Technikum",
    "liczba_lat": 5,
    "kod_mein": "T"
  },
  {
    "nazwa": "Branżowa szkoła I stopnia",
    "liczba_lat": 3,
    "kod_mein": "BS1"
  },
  {
    "nazwa": "Szkoła podstawowa",
    "liczba_lat": 8,
    "kod_mein": "SP"
  }
]
```

### 1.2. Przedmioty

#### Przedmioty ogólnokształcące (podstawowe)

```json
[
  {
    "nazwa": "Język polski",
    "kod_mein": "JP",
    "typ_zajec": "ogolnoksztalcace",
    "poziom": "podstawowy",
    "aktywny": true
  },
  {
    "nazwa": "Matematyka",
    "kod_mein": "MAT",
    "typ_zajec": "ogolnoksztalcace",
    "poziom": "podstawowy",
    "aktywny": true
  },
  {
    "nazwa": "Język angielski",
    "kod_mein": "JA",
    "typ_zajec": "ogolnoksztalcace",
    "poziom": "podstawowy",
    "aktywny": true
  },
  {
    "nazwa": "Historia",
    "kod_mein": "HIS",
    "typ_zajec": "ogolnoksztalcace",
    "poziom": "podstawowy",
    "aktywny": true
  },
  {
    "nazwa": "Geografia",
    "kod_mein": "GEO",
    "typ_zajec": "ogolnoksztalcace",
    "poziom": "podstawowy",
    "aktywny": true
  },
  {
    "nazwa": "Biologia",
    "kod_mein": "BIO",
    "typ_zajec": "ogolnoksztalcace",
    "poziom": "podstawowy",
    "aktywny": true
  },
  {
    "nazwa": "Chemia",
    "kod_mein": "CHE",
    "typ_zajec": "ogolnoksztalcace",
    "poziom": "podstawowy",
    "aktywny": true
  },
  {
    "nazwa": "Fizyka",
    "kod_mein": "FIZ",
    "typ_zajec": "ogolnoksztalcace",
    "poziom": "podstawowy",
    "aktywny": true
  },
  {
    "nazwa": "Informatyka",
    "kod_mein": "INF",
    "typ_zajec": "ogolnoksztalcace",
    "poziom": "podstawowy",
    "aktywny": true
  },
  {
    "nazwa": "Wiedza o społeczeństwie",
    "kod_mein": "WOS",
    "typ_zajec": "ogolnoksztalcace",
    "poziom": "podstawowy",
    "aktywny": true
  },
  {
    "nazwa": "Edukacja dla bezpieczeństwa",
    "kod_mein": "EDB",
    "typ_zajec": "ogolnoksztalcace",
    "poziom": "podstawowy",
    "aktywny": true
  },
  {
    "nazwa": "Wychowanie fizyczne",
    "kod_mein": "WF",
    "typ_zajec": "ogolnoksztalcace",
    "poziom": "brak",
    "aktywny": true
  },
  {
    "nazwa": "Etyka",
    "kod_mein": "ET",
    "typ_zajec": "ogolnoksztalcace",
    "poziom": "podstawowy",
    "aktywny": true
  },
  {
    "nazwa": "Religia",
    "kod_mein": "REL",
    "typ_zajec": "ogolnoksztalcace",
    "poziom": "brak",
    "aktywny": true
  }
]
```

#### Przedmioty rozszerzone

```json
[
  {
    "nazwa": "Język polski - rozszerzony",
    "kod_mein": "JP-R",
    "typ_zajec": "ogolnoksztalcace",
    "poziom": "rozszerzony",
    "aktywny": true
  },
  {
    "nazwa": "Matematyka - rozszerzona",
    "kod_mein": "MAT-R",
    "typ_zajec": "ogolnoksztalcace",
    "poziom": "rozszerzony",
    "aktywny": true
  },
  {
    "nazwa": "Biologia - rozszerzona",
    "kod_mein": "BIO-R",
    "typ_zajec": "ogolnoksztalcace",
    "poziom": "rozszerzony",
    "aktywny": true
  },
  {
    "nazwa": "Chemia - rozszerzona",
    "kod_mein": "CHE-R",
    "typ_zajec": "ogolnoksztalcace",
    "poziom": "rozszerzony",
    "aktywny": true
  },
  {
    "nazwa": "Fizyka - rozszerzona",
    "kod_mein": "FIZ-R",
    "typ_zajec": "ogolnoksztalcace",
    "poziom": "rozszerzony",
    "aktywny": true
  },
  {
    "nazwa": "Historia - rozszerzona",
    "kod_mein": "HIS-R",
    "typ_zajec": "ogolnoksztalcace",
    "poziom": "rozszerzony",
    "aktywny": true
  },
  {
    "nazwa": "Geografia - rozszerzona",
    "kod_mein": "GEO-R",
    "typ_zajec": "ogolnoksztalcace",
    "poziom": "rozszerzony",
    "aktywny": true
  }
]
```

#### Przedmioty zawodowe (dla Technikum)

```json
[
  {
    "nazwa": "Przedmioty zawodowe teoretyczne - Informatyk",
    "kod_mein": "ZAW-INF-T",
    "typ_zajec": "zawodowe_teoretyczne",
    "poziom": "brak",
    "aktywny": true
  },
  {
    "nazwa": "Przedmioty zawodowe praktyczne - Informatyk",
    "kod_mein": "ZAW-INF-P",
    "typ_zajec": "zawodowe_praktyczne",
    "poziom": "brak",
    "aktywny": true
  },
  {
    "nazwa": "Przedmioty zawodowe teoretyczne - Mechanik",
    "kod_mein": "ZAW-MECH-T",
    "typ_zajec": "zawodowe_teoretyczne",
    "poziom": "brak",
    "aktywny": true
  },
  {
    "nazwa": "Przedmioty zawodowe praktyczne - Mechanik",
    "kod_mein": "ZAW-MECH-P",
    "typ_zajec": "zawodowe_praktyczne",
    "poziom": "brak",
    "aktywny": true
  }
]
```

### 1.3. Klasy

```json
[
  {
    "nazwa": "1A",
    "typ_szkoly": "<ID_LICEUM>",
    "rok_szkolny": "2024/2025",
    "numer_klasy": 1,
    "profil": "matematyczno-fizyczny"
  },
  {
    "nazwa": "1B",
    "typ_szkoly": "<ID_LICEUM>",
    "rok_szkolny": "2024/2025",
    "numer_klasy": 1,
    "profil": "biologiczno-chemiczny"
  },
  {
    "nazwa": "2A",
    "typ_szkoly": "<ID_LICEUM>",
    "rok_szkolny": "2024/2025",
    "numer_klasy": 2,
    "profil": "matematyczno-fizyczny"
  },
  {
    "nazwa": "1T",
    "typ_szkoly": "<ID_TECHNIKUM>",
    "rok_szkolny": "2024/2025",
    "numer_klasy": 1,
    "profil": "Technik informatyk",
    "zawod": "<ID_ZAWOD_INFORMATYK>"
  },
  {
    "nazwa": "2T",
    "typ_szkoly": "<ID_TECHNIKUM>",
    "rok_szkolny": "2024/2025",
    "numer_klasy": 2,
    "profil": "Technik informatyk",
    "zawod": "<ID_ZAWOD_INFORMATYK>"
  },
  {
    "nazwa": "3T",
    "typ_szkoly": "<ID_TECHNIKUM>",
    "rok_szkolny": "2024/2025",
    "numer_klasy": 3,
    "profil": "Technik mechanik",
    "zawod": "<ID_ZAWOD_MECHANIK>"
  }
]
```

### 1.4. Nauczyciele

```json
[
  {
    "imie": "Anna",
    "nazwisko": "Kowalska",
    "email": "anna.kowalska@szkola.pl",
    "telefon": "+48 123 456 789",
    "max_obciazenie": 18,
    "etat": "pełny",
    "aktywny": true
  },
  {
    "imie": "Jan",
    "nazwisko": "Nowak",
    "email": "jan.nowak@szkola.pl",
    "telefon": "+48 123 456 790",
    "max_obciazenie": 18,
    "etat": "pełny",
    "aktywny": true
  },
  {
    "imie": "Maria",
    "nazwisko": "Wiśniewska",
    "email": "maria.wisniewska@szkola.pl",
    "telefon": "+48 123 456 791",
    "max_obciazenie": 18,
    "etat": "pełny",
    "aktywny": true
  },
  {
    "imie": "Piotr",
    "nazwisko": "Zieliński",
    "email": "piotr.zielinski@szkola.pl",
    "telefon": "+48 123 456 792",
    "max_obciazenie": 18,
    "etat": "pełny",
    "aktywny": true
  },
  {
    "imie": "Katarzyna",
    "nazwisko": "Szymańska",
    "email": "katarzyna.szymanska@szkola.pl",
    "telefon": "+48 123 456 793",
    "max_obciazenie": 9,
    "etat": "pół",
    "aktywny": true
  },
  {
    "imie": "Tomasz",
    "nazwisko": "Wójcik",
    "email": "tomasz.wojcik@szkola.pl",
    "telefon": "+48 123 456 794",
    "max_obciazenie": 18,
    "etat": "pełny",
    "aktywny": true
  },
  {
    "imie": "Magdalena",
    "nazwisko": "Kozłowska",
    "email": "magdalena.kozlowska@szkola.pl",
    "telefon": "+48 123 456 795",
    "max_obciazenie": 18,
    "etat": "pełny",
    "aktywny": true
  },
  {
    "imie": "Marcin",
    "nazwisko": "Jankowski",
    "email": "marcin.jankowski@szkola.pl",
    "telefon": "+48 123 456 796",
    "max_obciazenie": 18,
    "etat": "pełny",
    "aktywny": true
  },
  {
    "imie": "Agnieszka",
    "nazwisko": "Mazur",
    "email": "agnieszka.mazur@szkola.pl",
    "telefon": "+48 123 456 797",
    "max_obciazenie": 18,
    "etat": "pełny",
    "aktywny": true
  },
  {
    "imie": "Robert",
    "nazwisko": "Kwiatkowski",
    "email": "robert.kwiatkowski@szkola.pl",
    "telefon": "+48 123 456 798",
    "max_obciazenie": 18,
    "etat": "pełny",
    "aktywny": true
  }
]
```

### 1.5. Kwalifikacje nauczycieli

```json
[
  {
    "nauczyciel": "<ID_ANNA_KOWALSKA>",
    "przedmiot": "<ID_JEZYK_POLSKI>",
    "stopien": "magister",
    "specjalizacja": "Filologia polska",
    "data_uzyskania": "2010-06-30"
  },
  {
    "nauczyciel": "<ID_JAN_NOWAK>",
    "przedmiot": "<ID_MATEMATYKA>",
    "stopien": "magister",
    "specjalizacja": "Matematyka",
    "data_uzyskania": "2012-06-30"
  },
  {
    "nauczyciel": "<ID_MARIA_WISNIEWSKA>",
    "przedmiot": "<ID_JEZYK_ANGIELSKI>",
    "stopien": "magister",
    "specjalizacja": "Filologia angielska",
    "data_uzyskania": "2011-06-30"
  },
  {
    "nauczyciel": "<ID_PIOTR_ZIELINSKI>",
    "przedmiot": "<ID_HISTORIA>",
    "stopien": "magister",
    "specjalizacja": "Historia",
    "data_uzyskania": "2013-06-30"
  },
  {
    "nauczyciel": "<ID_KATARZYNA_SZYMANSKA>",
    "przedmiot": "<ID_BIOLOGIA>",
    "stopien": "magister",
    "specjalizacja": "Biologia",
    "data_uzyskania": "2014-06-30"
  },
  {
    "nauczyciel": "<ID_TOMASZ_WÓJCIK>",
    "przedmiot": "<ID_CHEMIA>",
    "stopien": "magister",
    "specjalizacja": "Chemia",
    "data_uzyskania": "2015-06-30"
  },
  {
    "nauczyciel": "<ID_MAGDALENA_KOZLOWSKA>",
    "przedmiot": "<ID_FIZYKA>",
    "stopien": "magister",
    "specjalizacja": "Fizyka",
    "data_uzyskania": "2016-06-30"
  },
  {
    "nauczyciel": "<ID_MARCIN_JANKOWSKI>",
    "przedmiot": "<ID_INFORMATYKA>",
    "stopien": "magister",
    "specjalizacja": "Informatyka",
    "data_uzyskania": "2017-06-30"
  },
  {
    "nauczyciel": "<ID_AGNIESZKA_MAZUR>",
    "przedmiot": "<ID_GEOGRAFIA>",
    "stopien": "magister",
    "specjalizacja": "Geografia",
    "data_uzyskania": "2018-06-30"
  },
  {
    "nauczyciel": "<ID_ROBERT_KWIATKOWSKI>",
    "przedmiot": "<ID_WYCHOWANIE_FIZYCZNE>",
    "stopien": "magister",
    "specjalizacja": "Wychowanie fizyczne",
    "data_uzyskania": "2019-06-30"
  },
  {
    "nauczyciel": "<ID_ANNA_KOWALSKA>",
    "przedmiot": "<ID_JEZYK_POLSKI_ROZSZERZONY>",
    "stopien": "magister",
    "specjalizacja": "Filologia polska",
    "data_uzyskania": "2010-06-30"
  },
  {
    "nauczyciel": "<ID_JAN_NOWAK>",
    "przedmiot": "<ID_MATEMATYKA_ROZSZERZONA>",
    "stopien": "magister",
    "specjalizacja": "Matematyka",
    "data_uzyskania": "2012-06-30"
  }
]
```

### 1.6. Siatki godzin MEiN (Liceum ogólnokształcące)

```json
[
  {
    "przedmiot": "<ID_JEZYK_POLSKI>",
    "typ_szkoly": "<ID_LICEUM>",
    "klasa": null,
    "godziny_w_cyklu": 360,
    "godziny_tygodniowo_min": 4,
    "godziny_tygodniowo_max": 4,
    "obowiazkowe": true,
    "data_obowiazywania_od": "2024-09-01",
    "data_obowiazywania_do": null
  },
  {
    "przedmiot": "<ID_MATEMATYKA>",
    "typ_szkoly": "<ID_LICEUM>",
    "klasa": null,
    "godziny_w_cyklu": 360,
    "godziny_tygodniowo_min": 4,
    "godziny_tygodniowo_max": 4,
    "obowiazkowe": true,
    "data_obowiazywania_od": "2024-09-01",
    "data_obowiazywania_do": null
  },
  {
    "przedmiot": "<ID_JEZYK_ANGIELSKI>",
    "typ_szkoly": "<ID_LICEUM>",
    "klasa": null,
    "godziny_w_cyklu": 450,
    "godziny_tygodniowo_min": 3,
    "godziny_tygodniowo_max": 3,
    "obowiazkowe": true,
    "data_obowiazywania_od": "2024-09-01",
    "data_obowiazywania_do": null
  },
  {
    "przedmiot": "<ID_HISTORIA>",
    "typ_szkoly": "<ID_LICEUM>",
    "klasa": null,
    "godziny_w_cyklu": 60,
    "godziny_tygodniowo_min": 2,
    "godziny_tygodniowo_max": 2,
    "obowiazkowe": true,
    "data_obowiazywania_od": "2024-09-01",
    "data_obowiazywania_do": null
  },
  {
    "przedmiot": "<ID_WIEDZA_O_SPOLECZENSTWIE>",
    "typ_szkoly": "<ID_LICEUM>",
    "klasa": null,
    "godziny_w_cyklu": 30,
    "godziny_tygodniowo_min": 1,
    "godziny_tygodniowo_max": 1,
    "obowiazkowe": true,
    "data_obowiazywania_od": "2024-09-01",
    "data_obowiazywania_do": null
  },
  {
    "przedmiot": "<ID_GEOGRAFIA>",
    "typ_szkoly": "<ID_LICEUM>",
    "klasa": null,
    "godziny_w_cyklu": 30,
    "godziny_tygodniowo_min": 1,
    "godziny_tygodniowo_max": 1,
    "obowiazkowe": true,
    "data_obowiazywania_od": "2024-09-01",
    "data_obowiazywania_do": null
  },
  {
    "przedmiot": "<ID_BIOLOGIA>",
    "typ_szkoly": "<ID_LICEUM>",
    "klasa": null,
    "godziny_w_cyklu": 30,
    "godziny_tygodniowo_min": 1,
    "godziny_tygodniowo_max": 1,
    "obowiazkowe": true,
    "data_obowiazywania_od": "2024-09-01",
    "data_obowiazywania_do": null
  },
  {
    "przedmiot": "<ID_CHEMIA>",
    "typ_szkoly": "<ID_LICEUM>",
    "klasa": null,
    "godziny_w_cyklu": 30,
    "godziny_tygodniowo_min": 1,
    "godziny_tygodniowo_max": 1,
    "obowiazkowe": true,
    "data_obowiazywania_od": "2024-09-01",
    "data_obowiazywania_do": null
  },
  {
    "przedmiot": "<ID_FIZYKA>",
    "typ_szkoly": "<ID_LICEUM>",
    "klasa": null,
    "godziny_w_cyklu": 30,
    "godziny_tygodniowo_min": 1,
    "godziny_tygodniowo_max": 1,
    "obowiazkowe": true,
    "data_obowiazywania_od": "2024-09-01",
    "data_obowiazywania_do": null
  },
  {
    "przedmiot": "<ID_INFORMATYKA>",
    "typ_szkoly": "<ID_LICEUM>",
    "klasa": null,
    "godziny_w_cyklu": 30,
    "godziny_tygodniowo_min": 1,
    "godziny_tygodniowo_max": 1,
    "obowiazkowe": true,
    "data_obowiazywania_od": "2024-09-01",
    "data_obowiazywania_do": null
  },
  {
    "przedmiot": "<ID_WYCHOWANIE_FIZYCZNE>",
    "typ_szkoly": "<ID_LICEUM>",
    "klasa": null,
    "godziny_w_cyklu": 180,
    "godziny_tygodniowo_min": 3,
    "godziny_tygodniowo_max": 3,
    "obowiazkowe": true,
    "data_obowiazywania_od": "2024-09-01",
    "data_obowiazywania_do": null
  },
  {
    "przedmiot": "<ID_EDUKACJA_DLA_BEZPIECZENSTWA>",
    "typ_szkoly": "<ID_LICEUM>",
    "klasa": null,
    "godziny_w_cyklu": 30,
    "godziny_tygodniowo_min": 1,
    "godziny_tygodniowo_max": 1,
    "obowiazkowe": true,
    "data_obowiazywania_od": "2024-09-01",
    "data_obowiazywania_do": null
  }
]
```

### 1.7. Rozkład godzin (przykładowy)

```json
[
  {
    "przedmiot": "<ID_JEZYK_POLSKI>",
    "klasa": "<ID_1A>",
    "nauczyciel": "<ID_ANNA_KOWALSKA>",
    "rok_szkolny": "2024/2025",
    "godziny_tyg": 4,
    "godziny_roczne": 120,
    "semestr": "cały rok"
  },
  {
    "przedmiot": "<ID_MATEMATYKA>",
    "klasa": "<ID_1A>",
    "nauczyciel": "<ID_JAN_NOWAK>",
    "rok_szkolny": "2024/2025",
    "godziny_tyg": 4,
    "godziny_roczne": 120,
    "semestr": "cały rok"
  },
  {
    "przedmiot": "<ID_JEZYK_ANGIELSKI>",
    "klasa": "<ID_1A>",
    "nauczyciel": "<ID_MARIA_WISNIEWSKA>",
    "rok_szkolny": "2024/2025",
    "godziny_tyg": 3,
    "godziny_roczne": 90,
    "semestr": "cały rok"
  },
  {
    "przedmiot": "<ID_MATEMATYKA_ROZSZERZONA>",
    "klasa": "<ID_1A>",
    "nauczyciel": "<ID_JAN_NOWAK>",
    "rok_szkolny": "2024/2025",
    "godziny_tyg": 6,
    "godziny_roczne": 180,
    "semestr": "cały rok"
  }
]
```

---

## 2. Scenariusze testowe

### 2.1. Scenariusz 1: Podstawowy import i weryfikacja

**Cel**: Sprawdzenie, czy system poprawnie importuje i wyświetla dane MEiN

**Kroki**:
1. Zaloguj się do systemu jako administrator
2. Przejdź do "Import MEiN"
3. Wgraj plik PDF z siatką godzin MEiN
4. Wybierz typ szkoły: "Liceum ogólnokształcące"
5. Kliknij "Importuj i sprawdź"
6. Sprawdź podgląd danych
7. Kliknij "Zapisz do bazy danych"

**Oczekiwany rezultat**:
- System poprawnie ekstrahuje dane z PDF
- Wszystkie przedmioty są zmapowane do bazy
- Brak błędów walidacji
- Dane są widoczne w kolekcji "Siatki godzin MEiN"

**Kryteria akceptacji**:
- ✅ Import zakończony sukcesem
- ✅ Wszystkie rekordy zapisane
- ✅ Brak błędów w logach

---

### 2.2. Scenariusz 2: Sprawdzenie zgodności z MEiN

**Cel**: Weryfikacja, czy szkoła spełnia wymagania MEiN

**Kroki**:
1. Dodaj typ szkoły: "Liceum ogólnokształcące"
2. Dodaj przedmioty (Język polski, Matematyka, itp.)
3. Zaimportuj siatkę godzin MEiN dla liceum
4. Dodaj klasy: 1A, 1B, 2A
5. Dodaj rozkład godzin dla klas
6. Przejdź do Dashboard
7. Wybierz typ szkoły: "Liceum ogólnokształcące"
8. Sprawdź zgodność z MEiN

**Oczekiwany rezultat**:
- System pokazuje procent realizacji dla każdego przedmiotu
- Wykrywa braki godzin (jeśli są)
- Wykrywa nadwyżki godzin (jeśli są)
- Wyświetla alerty dla przedmiotów z brakami

**Kryteria akceptacji**:
- ✅ Wszystkie przedmioty mają obliczony procent realizacji
- ✅ Braki są poprawnie wykryte
- ✅ Nadwyżki są poprawnie wykryte
- ✅ Alerty są wyświetlane

---

### 2.3. Scenariusz 3: Przypisanie nauczycieli do przedmiotów

**Cel**: Sprawdzenie logiki przypisywania nauczycieli z uwzględnieniem kwalifikacji

**Kroki**:
1. Dodaj nauczycieli (Anna Kowalska, Jan Nowak, itp.)
2. Dodaj kwalifikacje nauczycieli
3. Dodaj rozkład godzin dla klasy 1A
4. Spróbuj przypisać nauczyciela bez kwalifikacji do przedmiotu
5. Spróbuj przypisać nauczyciela z kwalifikacjami
6. Sprawdź obciążenie nauczyciela

**Oczekiwany rezultat**:
- System nie pozwala przypisać nauczyciela bez kwalifikacji
- System pozwala przypisać nauczyciela z kwalifikacjami
- Obciążenie nauczyciela jest poprawnie obliczane
- System ostrzega, gdy obciążenie przekracza maksimum

**Kryteria akceptacji**:
- ✅ Walidacja kwalifikacji działa
- ✅ Obciążenie jest poprawnie obliczane
- ✅ Ostrzeżenia są wyświetlane

---

### 2.4. Scenariusz 4: Automatyczny rozdział godzin

**Cel**: Sprawdzenie algorytmu automatycznego rozdziału godzin

**Kroki**:
1. Dodaj 3 nauczycieli z kwalifikacjami do matematyki
2. Dodaj klasę 1A z wymaganiami: 4h matematyki tygodniowo
3. Dodaj klasę 1B z wymaganiami: 4h matematyki tygodniowo
4. Dodaj klasę 2A z wymaganiami: 4h matematyki tygodniowo
5. Uruchom automatyczny rozdział godzin
6. Sprawdź, czy obciążenie jest wyrównane

**Oczekiwany rezultat**:
- System automatycznie przypisuje nauczycieli do klas
- Obciążenie jest wyrównane między nauczycielami
- Wszystkie godziny są pokryte
- Brak przekroczeń maksymalnego obciążenia

**Kryteria akceptacji**:
- ✅ Wszystkie godziny są przypisane
- ✅ Obciążenie jest wyrównane (różnica < 2h)
- ✅ Brak przekroczeń

---

### 2.5. Scenariusz 5: Wykrywanie braków kadrowych

**Cel**: Sprawdzenie, czy system wykrywa braki nauczycieli

**Kroki**:
1. Dodaj klasę 1A z wymaganiami: 4h fizyki tygodniowo
2. Dodaj klasę 1B z wymaganiami: 4h fizyki tygodniowo
3. Dodaj tylko 1 nauczyciela z kwalifikacjami do fizyki (max 18h)
4. Uruchom automatyczny rozdział godzin
5. Sprawdź raport braków kadrowych

**Oczekiwany rezultat**:
- System wykrywa brak nauczycieli
- Raport pokazuje, ile godzin nie można pokryć
- System sugeruje, ile etatów potrzeba uzupełnić
- Alerty są wyświetlane w dashboardzie

**Kryteria akceptacji**:
- ✅ Braki są wykryte
- ✅ Raport jest poprawny
- ✅ Sugestie są wyświetlane

---

### 2.6. Scenariusz 6: Dashboard dyrektora

**Cel**: Sprawdzenie funkcjonalności dashboardu

**Kroki**:
1. Wypełnij bazę danymi testowymi
2. Przejdź do Dashboard
3. Wybierz typ szkoły: "Liceum ogólnokształcące"
4. Sprawdź wszystkie sekcje:
   - Karty z podsumowaniem
   - Wykres zgodności z MEiN
   - Tabela obciążenia nauczycieli
   - Lista braków kadrowych

**Oczekiwany rezultat**:
- Wszystkie sekcje są wyświetlane
- Dane są poprawnie obliczone
- Wykresy są czytelne
- Tabele są sortowalne

**Kryteria akceptacji**:
- ✅ Wszystkie sekcje działają
- ✅ Dane są poprawne
- ✅ Interfejs jest responsywny

---

### 2.7. Scenariusz 7: Eksport do XLS

**Cel**: Sprawdzenie eksportu danych do arkusza organizacyjnego

**Kroki**:
1. Wypełnij bazę danymi testowymi
2. Przejdź do widoku rozkładu godzin
3. Kliknij "Eksportuj do XLS"
4. Sprawdź wygenerowany plik

**Oczekiwany rezultat**:
- Plik XLS jest wygenerowany
- Zawiera wszystkie potrzebne dane
- Format jest zgodny z arkuszem organizacyjnym
- Dane są poprawnie sformatowane

**Kryteria akceptacji**:
- ✅ Plik jest wygenerowany
- ✅ Zawiera wszystkie dane
- ✅ Format jest poprawny

---

### 2.8. Scenariusz 8: Obsługa błędów

**Cel**: Sprawdzenie obsługi błędów i walidacji

**Kroki**:
1. Spróbuj dodać przedmiot bez nazwy
2. Spróbuj dodać nauczyciela z ujemnym obciążeniem
3. Spróbuj przypisać nauczyciela bez kwalifikacji
4. Spróbuj zaimportować nieprawidłowy PDF
5. Sprawdź komunikaty błędów

**Oczekiwany rezultat**:
- System wyświetla czytelne komunikaty błędów
- Walidacja działa poprawnie
- Błędne dane nie są zapisywane
- Użytkownik wie, co poprawić

**Kryteria akceptacji**:
- ✅ Komunikaty błędów są czytelne
- ✅ Walidacja działa
- ✅ Błędne dane nie są zapisywane

---

### 2.9. Scenariusz 9: Różne typy szkół

**Cel**: Sprawdzenie obsługi różnych typów szkół

**Kroki**:
1. Dodaj dane dla Liceum ogólnokształcącego
2. Dodaj dane dla Technikum
3. Dodaj dane dla Branżowej szkoły I stopnia
4. Sprawdź dashboard dla każdego typu szkoły
5. Sprawdź, czy siatki godzin są różne

**Oczekiwany rezultat**:
- System obsługuje wszystkie typy szkół
- Siatki godzin są różne dla różnych typów
- Dashboard pokazuje poprawne dane dla każdego typu

**Kryteria akceptacji**:
- ✅ Wszystkie typy szkół działają
- ✅ Dane są poprawne
- ✅ Nie ma konfliktów

---

### 2.10. Scenariusz 10: Przedmioty rozszerzone

**Cel**: Sprawdzenie obsługi przedmiotów rozszerzonych

**Kroki**:
1. Dodaj przedmiot podstawowy: "Matematyka"
2. Dodaj przedmiot rozszerzony: "Matematyka - rozszerzona"
3. Dodaj klasę 1A z profilem matematyczno-fizycznym
4. Przypisz oba przedmioty do klasy
5. Sprawdź zgodność z MEiN

**Oczekiwany rezultat**:
- System rozróżnia przedmioty podstawowe i rozszerzone
- Obliczenia są poprawne dla obu typów
- Dashboard pokazuje oba typy

**Kryteria akceptacji**:
- ✅ Przedmioty są poprawnie rozróżnione
- ✅ Obliczenia są poprawne
- ✅ Dashboard działa

---

## 3. Testy wydajnościowe

### 3.1. Duża ilość danych

**Scenariusz**: 
- 100 klas
- 50 nauczycieli
- 1000 rekordów rozkładu godzin

**Oczekiwany rezultat**:
- Dashboard ładuje się w < 3 sekundy
- Automatyczny rozdział godzin działa w < 30 sekund
- Eksport do XLS działa w < 10 sekund

---

## 4. Testy integracyjne

### 4.1. Pełny przepływ pracy

**Scenariusz**:
1. Import siatki MEiN
2. Dodanie nauczycieli i kwalifikacji
3. Dodanie klas
4. Automatyczny rozdział godzin
5. Sprawdzenie zgodności
6. Eksport do XLS

**Oczekiwany rezultat**:
- Wszystkie kroki działają poprawnie
- Dane są spójne na wszystkich etapach
- Brak błędów w całym procesie

---

## 5. Checklist testowy

### Podstawowe funkcje
- [ ] Import PDF działa
- [ ] Mapowanie danych działa
- [ ] Walidacja działa
- [ ] Zapis do bazy działa

### Funkcje zgodności MEiN
- [ ] Obliczanie zgodności działa
- [ ] Wykrywanie braków działa
- [ ] Wykrywanie nadwyżek działa
- [ ] Procent realizacji jest poprawny

### Funkcje nauczycieli
- [ ] Przypisanie nauczycieli działa
- [ ] Walidacja kwalifikacji działa
- [ ] Obliczanie obciążenia działa
- [ ] Ostrzeżenia o przekroczeniu działają

### Funkcje automatyczne
- [ ] Automatyczny rozdział godzin działa
- [ ] Wyrównanie obciążenia działa
- [ ] Wykrywanie braków kadrowych działa

### Dashboard
- [ ] Wszystkie sekcje działają
- [ ] Filtry działają
- [ ] Wykresy są czytelne
- [ ] Tabele są sortowalne

### Eksport
- [ ] Eksport do XLS działa
- [ ] Format jest poprawny
- [ ] Wszystkie dane są eksportowane

---

**Status**: Dokumentacja gotowa. Gotowy do testowania! 🧪
