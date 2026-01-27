# Konfiguracja kolekcji Payload CMS

## Przegląd

Dokument opisuje konfigurację kolekcji Payload CMS dla systemu planowania siatki godzin. Wszystkie kolekcje zostały zaimplementowane z relacjami, walidacją i podstawowymi hookami.

---

## Struktura plików

```
EduGrid/
├── payload.config.ts          # Główna konfiguracja Payload
└── src/
    └── collections/
        ├── TypySzkol.ts       # Typy szkół
        ├── Przedmioty.ts      # Przedmioty
        ├── Klasy.ts           # Klasy
        ├── Nauczyciele.ts     # Nauczyciele
        ├── SiatkiGodzinMein.ts # Wymagania MEiN
        ├── Kwalifikacje.ts    # Kwalifikacje nauczycieli
        ├── RozkladGodzin.ts   # Rozkład godzin
        └── Zawody.ts          # Zawody
```

---

## Kolekcje

### 1. Typy Szkół (`typy-szkol`)

**Slug**: `typy-szkol`

**Pola**:
- `nazwa` (text, required) - Nazwa typu szkoły
- `liczba_lat` (number, required) - Liczba lat w cyklu (1-8)
- `kod_mein` (text, required, unique) - Kod MEiN

**Przykładowe dane**:
- Liceum ogólnokształcące (4 lata, kod: LO)
- Technikum (5 lat, kod: T)
- Branżowa szkoła I stopnia (3 lata, kod: BS1)

---

### 2. Przedmioty (`przedmioty`)

**Slug**: `przedmioty`

**Pola**:
- `nazwa` (text, required) - Nazwa przedmiotu
- `kod_mein` (text) - Kod MEiN (opcjonalnie)
- `typ_zajec` (select, required) - Typ zajęć:
  - `ogolnoksztalcace` - Ogólnokształcące
  - `zawodowe_teoretyczne` - Zawodowe teoretyczne
  - `zawodowe_praktyczne` - Zawodowe praktyczne
- `poziom` (select, required) - Poziom:
  - `podstawowy` - Podstawowy
  - `rozszerzony` - Rozszerzony
  - `brak` - Brak podziału
- `jednostka_org` (text) - Jednostka organizacyjna (opcjonalnie)
- `aktywny` (checkbox) - Czy przedmiot jest aktywny

**Walidacja**:
- Wszystkie pola wymagane są walidowane

---

### 3. Klasy (`klasy`)

**Slug**: `klasy`

**Pola**:
- `nazwa` (text, required) - Nazwa klasy (np. 1A)
- `typ_szkoly` (relationship → `typy-szkol`, required) - Typ szkoły
- `rok_szkolny` (text, required) - Rok szkolny (format: YYYY/YYYY)
- `numer_klasy` (number, required) - Numer klasy w cyklu (1-8)
- `profil` (text) - Profil klasy (opcjonalnie)
- `zawod` (relationship → `zawody`) - Zawód (dla szkół zawodowych)
- `aktywna` (checkbox) - Czy klasa jest aktywna

**Walidacja**:
- `rok_szkolny` - format YYYY/YYYY (regex)
- `numer_klasy` - zakres 1-8

---

### 4. Nauczyciele (`nauczyciele`)

**Slug**: `nauczyciele`

**Pola**:
- `imie` (text, required) - Imię
- `nazwisko` (text, required) - Nazwisko
- `email` (email) - Adres email
- `telefon` (text) - Numer telefonu
- `max_obciazenie` (number, required) - Maksymalne obciążenie (0-40)
- `etat` (select, required) - Wymiar etatu:
  - `pelny` - Pełny etat (18h)
  - `pol` - Pół etatu (9h)
  - `czwarty` - 1/4 etatu (4.5h)
  - `osiemnasty` - 1/18 etatu (1h)
- `aktywny` (checkbox) - Czy nauczyciel jest aktywny

**Hooks**:
- `beforeChange` - Automatyczne ustawienie `max_obciazenie` na podstawie `etat`

**Walidacja**:
- `email` - format email (regex)
- `max_obciazenie` - zakres 0-40

---

### 5. Siatki Godzin MEiN (`siatki-godzin-mein`)

**Slug**: `siatki-godzin-mein`

**Pola**:
- `przedmiot` (relationship → `przedmioty`, required) - Przedmiot
- `typ_szkoly` (relationship → `typy-szkol`, required) - Typ szkoły
- `klasa` (number) - Numer klasy (opcjonalnie, NULL = cały cykl)
- `godziny_w_cyklu` (number, required) - Godziny w cyklu
- `godziny_tygodniowo_min` (number) - Minimalne godziny tygodniowo
- `godziny_tygodniowo_max` (number) - Maksymalne godziny tygodniowo
- `obowiazkowe` (checkbox) - Czy przedmiot jest obowiązkowy
- `data_obowiazywania_od` (date, required) - Obowiązuje od
- `data_obowiazywania_do` (date) - Obowiązuje do (opcjonalnie)
- `uwagi` (textarea) - Dodatkowe uwagi

**Hooks**:
- `beforeValidate` - Sprawdzenie, czy min ≤ max

**Walidacja**:
- `godziny_w_cyklu` - nie może być ujemne
- `godziny_tygodniowo_min` ≤ `godziny_tygodniowo_max`

---

### 6. Kwalifikacje (`kwalifikacje`)

**Slug**: `kwalifikacje`

**Pola**:
- `nauczyciel` (relationship → `nauczyciele`, required) - Nauczyciel
- `przedmiot` (relationship → `przedmioty`, required) - Przedmiot
- `stopien` (text) - Stopień kwalifikacji
- `specjalizacja` (text) - Specjalizacja
- `data_uzyskania` (date) - Data uzyskania
- `dokument` (text) - Numer dokumentu
- `aktywne` (checkbox) - Czy kwalifikacja jest aktywna

**Hooks**:
- `beforeValidate` - Sprawdzenie unikalności kombinacji nauczyciel + przedmiot

**Walidacja**:
- Unikalna kombinacja `nauczyciel` + `przedmiot`

---

### 7. Rozkład Godzin (`rozkład-godzin`)

**Slug**: `rozkład-godzin`

**Pola**:
- `przedmiot` (relationship → `przedmioty`, required) - Przedmiot
- `klasa` (relationship → `klasy`, required) - Klasa
- `nauczyciel` (relationship → `nauczyciele`, required) - Nauczyciel
- `rok_szkolny` (text, required) - Rok szkolny (format: YYYY/YYYY)
- `godziny_roczne` (number, required) - Godziny roczne
- `godziny_tyg` (number, required) - Godziny tygodniowo (0-10)
- `semestr_1` (number, required) - Godziny w semestrze 1
- `semestr_2` (number, required) - Godziny w semestrze 2
- `typ_zajec` (select) - Typ zajęć (kopiowane z przedmiotu)
- `poziom` (select) - Poziom (kopiowane z przedmiotu)
- `uwagi` (textarea) - Dodatkowe uwagi

**Hooks**:
- `beforeValidate` - Sprawdzenie: `godziny_roczne = semestr_1 + semestr_2`
- `beforeChange`:
  - Kopiowanie `typ_zajec` i `poziom` z przedmiotu
  - Sprawdzenie kwalifikacji nauczyciela (ostrzeżenie)
- `afterChange` - Sprawdzenie obciążenia nauczyciela (ostrzeżenie przy przekroczeniu)

**Walidacja**:
- `rok_szkolny` - format YYYY/YYYY
- `godziny_roczne` = `semestr_1` + `semestr_2`
- `godziny_tyg` - zakres 0-10

---

### 8. Zawody (`zawody`)

**Slug**: `zawody`

**Pola**:
- `nazwa` (text, required) - Nazwa zawodu
- `kod_zawodu` (text, required, unique) - Kod zawodu
- `typ_szkoly` (relationship → `typy-szkol`, required) - Typ szkoły
- `godziny_teor_w_cyklu` (number) - Godziny teoretyczne w cyklu
- `godziny_prak_w_cyklu` (number) - Godziny praktyczne w cyklu
- `aktywny` (checkbox) - Czy zawód jest aktywny

---

## Relacje między kolekcjami

### Relacje 1:N (hasMany)

1. **Typy Szkół → Klasy**
   - Jeden typ szkoły ma wiele klas
   - Pole: `klasy.typ_szkoly` → `typy-szkol`

2. **Typy Szkół → Zawody**
   - Jeden typ szkoły ma wiele zawodów
   - Pole: `zawody.typ_szkoly` → `typy-szkol`

3. **Przedmioty → Siatki Godzin MEiN**
   - Jeden przedmiot ma wiele wpisów w siatce MEiN
   - Pole: `siatki-godzin-mein.przedmiot` → `przedmioty`

4. **Przedmioty → Rozkład Godzin**
   - Jeden przedmiot może być realizowany w wielu klasach
   - Pole: `rozkład-godzin.przedmiot` → `przedmioty`

5. **Klasy → Rozkład Godzin**
   - Jedna klasa ma wiele przedmiotów w rozkładzie
   - Pole: `rozkład-godzin.klasa` → `klasy`

6. **Nauczyciele → Rozkład Godzin**
   - Jeden nauczyciel może uczyć wielu przedmiotów
   - Pole: `rozkład-godzin.nauczyciel` → `nauczyciele`

7. **Nauczyciele → Kwalifikacje**
   - Jeden nauczyciel może mieć wiele kwalifikacji
   - Pole: `kwalifikacje.nauczyciel` → `nauczyciele`

8. **Przedmioty → Kwalifikacje**
   - Jeden przedmiot może wymagać kwalifikacji wielu nauczycieli
   - Pole: `kwalifikacje.przedmiot` → `przedmioty`

9. **Zawody → Klasy** (opcjonalnie)
   - Jeden zawód może być realizowany w wielu klasach
   - Pole: `klasy.zawod` → `zawody`

---

## Walidacja danych

### Walidacja na poziomie pól

1. **Formaty**:
   - `rok_szkolny`: regex `/^\d{4}\/\d{4}$/`
   - `email`: regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

2. **Zakresy**:
   - `liczba_lat`: 1-8
   - `numer_klasy`: 1-8
   - `max_obciazenie`: 0-40
   - `godziny_tyg`: 0-10

3. **Wymagane pola**:
   - Wszystkie pola oznaczone jako `required: true`

### Walidacja na poziomie hooków

1. **Kwalifikacje**:
   - Unikalność kombinacji `nauczyciel` + `przedmiot`

2. **Rozkład Godzin**:
   - `godziny_roczne = semestr_1 + semestr_2`
   - Sprawdzenie kwalifikacji nauczyciela (ostrzeżenie)
   - Sprawdzenie obciążenia nauczyciela (ostrzeżenie)

3. **Siatki Godzin MEiN**:
   - `godziny_tygodniowo_min ≤ godziny_tygodniowo_max`

---

## Hooks (zdarzenia)

### beforeValidate
- **SiatkiGodzinMein**: Sprawdzenie min ≤ max
- **Kwalifikacje**: Sprawdzenie unikalności kombinacji

### beforeChange
- **Nauczyciele**: Automatyczne ustawienie `max_obciazenie` na podstawie `etat`
- **RozkladGodzin**:
  - Kopiowanie `typ_zajec` i `poziom` z przedmiotu
  - Sprawdzenie kwalifikacji nauczyciela

### afterChange
- **RozkladGodzin**: Sprawdzenie obciążenia nauczyciela i ostrzeżenie przy przekroczeniu

---

## Użycie

### Instalacja zależności

```bash
npm install payload
npm install -D @types/node typescript
```

### Konfiguracja środowiska

Utwórz plik `.env`:

```env
PAYLOAD_SECRET=twoj-secret-klucz
DATABASE_URI=postgresql://user:password@localhost:5432/edugrid
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000
```

### Uruchomienie

```bash
npm run dev
```

Panel administracyjny Payload będzie dostępny pod adresem: `http://localhost:3000/admin`

---

## Następne kroki

1. **Dodanie autentykacji użytkowników** - kolekcja `users` z rolami (dyrektor, sekretariat)
2. **Rozszerzenie walidacji** - funkcje sprawdzające zgodność z MEiN
3. **API endpoints** - custom endpoints do raportowania
4. **Eksport do XLS** - funkcja eksportująca dane do arkusza organizacyjnego
5. **Import z PDF** - moduł OCR do importu siatek godzin MEiN

---

**Data utworzenia**: 2025-01-26  
**Status**: Konfiguracja gotowa do użycia
