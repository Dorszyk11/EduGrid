# Model danych dla systemu planowania siatki godzin

## 1. Przegląd modelu

Model danych obsługuje:
- ✅ Przedmioty (ogólnokształcące, zawodowe teoretyczne/praktyczne, podstawowe/rozszerzone)
- ✅ Klasy (różne typy szkół, roki szkolne)
- ✅ Nauczyciele (z kwalifikacjami i obciążeniem)
- ✅ Kwalifikacje nauczycieli (relacja wiele-do-wielu)
- ✅ Wymagania MEiN (siatki godzin)
- ✅ Realizowane godziny (rozkład godzin)
- ✅ Walidacja zgodności z MEiN

---

## 2. Diagram relacji (ER)

```
┌─────────────────┐
│   TYPY_SZKOL    │
│─────────────────│
│ id (PK)         │
│ nazwa           │
│ liczba_lat      │
│ kod_mein        │
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────┐
│     KLASY       │
│─────────────────│
│ id (PK)         │
│ nazwa           │
│ typ_szkoly_id   │──┐
│ rok_szkolny     │  │
│ numer_klasy     │  │
│ profil          │  │
│ zawod_id (FK)   │  │ (opcjonalnie)
└─────────────────┘  │
                     │
┌─────────────────┐  │
│   PRZEDMIOTY    │  │
│─────────────────│  │
│ id (PK)         │  │
│ nazwa           │  │
│ kod_mein        │  │
│ typ_zajec       │  │ (ogólnokształcące/zawodowe_teoretyczne/zawodowe_praktyczne)
│ poziom          │  │ (podstawowy/rozszerzony)
│ jednostka_org   │  │ (przedmiot/jednostka organizacyjna)
└────────┬────────┘  │
         │            │
         │ N:M        │
         │            │
┌────────▼───────────▼────────┐
│   SIATKI_GODZIN_MEIN        │
│─────────────────────────────│
│ id (PK)                     │
│ przedmiot_id (FK)           │
│ typ_szkoly_id (FK)          │
│ klasa (numer)               │
│ godziny_w_cyklu             │
│ godziny_tygodniowo_min      │
│ godziny_tygodniowo_max      │
│ obowiazkowe (boolean)       │
│ data_obowiazywania_od       │
│ data_obowiazywania_do       │
└─────────────────────────────┘

┌─────────────────┐
│   NAUCZYCIELE   │
│─────────────────│
│ id (PK)         │
│ imie            │
│ nazwisko        │
│ email           │
│ telefon         │
│ max_obciazenie  │ (godziny tygodniowo)
│ etat            │ (pełny/pół/1/4)
│ aktywny         │ (boolean)
└────────┬────────┘
         │
         │ 1:N
         │
┌────────▼────────┐
│  KWALIFIKACJE   │
│─────────────────│
│ id (PK)         │
│ nauczyciel_id   │──┐
│ przedmiot_id    │──┤──┐
│ stopien         │  │  │
│ specjalizacja   │  │  │
│ data_uzyskania  │  │  │
└─────────────────┘  │  │
                     │  │
┌─────────────────┐  │  │
│  ROZKLAD_GODZIN │  │  │
│─────────────────│  │  │
│ id (PK)         │  │  │
│ przedmiot_id    │──┘  │
│ klasa_id        │─────┘
│ nauczyciel_id   │──┐
│ rok_szkolny     │  │
│ godziny_roczne  │  │
│ godziny_tyg     │  │
│ semestr_1       │  │
│ semestr_2       │  │
│ typ_zajec       │  │
│ poziom          │  │
└─────────────────┘  │
                     │
┌─────────────────────┘
│
┌─────────────────┐
│   ZAWODY        │
│─────────────────│
│ id (PK)         │
│ nazwa           │
│ kod_zawodu      │
│ typ_szkoly_id   │
│ godziny_teor    │
│ godziny_prak    │
└─────────────────┘
```

---

## 3. Szczegółowy opis tabel

### 3.1. TYPY_SZKOL

Definicja typów szkół objętych rozporządzeniem MEiN.

| Kolumna | Typ | Opis | Przykład |
|---------|-----|------|----------|
| `id` | UUID (PK) | Unikalny identyfikator | `550e8400-e29b-41d4-a716-446655440000` |
| `nazwa` | VARCHAR(100) | Nazwa typu szkoły | `Liceum ogólnokształcące` |
| `liczba_lat` | INTEGER | Długość cyklu kształcenia | `4` |
| `kod_mein` | VARCHAR(20) | Kod w dokumentacji MEiN | `LO` |
| `created_at` | TIMESTAMP | Data utworzenia | `2025-01-26 10:00:00` |
| `updated_at` | TIMESTAMP | Data ostatniej aktualizacji | `2025-01-26 10:00:00` |

**Przykładowe dane:**
- `Liceum ogólnokształcące` (4 lata)
- `Technikum` (5 lat)
- `Branżowa szkoła I stopnia` (3 lata)
- `Branżowa szkoła II stopnia` (2 lata)
- `Szkoła podstawowa` (8 lat)

---

### 3.2. PRZEDMIOTY

Katalog wszystkich przedmiotów nauczanych w szkole.

| Kolumna | Typ | Opis | Przykład |
|---------|-----|------|----------|
| `id` | UUID (PK) | Unikalny identyfikator | |
| `nazwa` | VARCHAR(200) | Nazwa przedmiotu | `Język polski` |
| `kod_mein` | VARCHAR(50) | Kod w dokumentacji MEiN | `JP` |
| `typ_zajec` | ENUM | Typ zajęć | `ogolnoksztalcace`, `zawodowe_teoretyczne`, `zawodowe_praktyczne` |
| `poziom` | ENUM | Poziom przedmiotu | `podstawowy`, `rozszerzony`, `brak` |
| `jednostka_org` | VARCHAR(100) | Jednostka organizacyjna (jeśli dotyczy) | `Edukacja wczesnoszkolna` |
| `aktywny` | BOOLEAN | Czy przedmiot jest aktywny | `true` |
| `created_at` | TIMESTAMP | Data utworzenia | |
| `updated_at` | TIMESTAMP | Data ostatniej aktualizacji | |

**Wartości ENUM `typ_zajec`:**
- `ogolnoksztalcace` - Zajęcia ogólnokształcące
- `zawodowe_teoretyczne` - Zajęcia zawodowe teoretyczne
- `zawodowe_praktyczne` - Zajęcia zawodowe praktyczne

**Wartości ENUM `poziom`:**
- `podstawowy` - Przedmiot w zakresie podstawowym
- `rozszerzony` - Przedmiot w zakresie rozszerzonym
- `brak` - Brak podziału (np. edukacja wczesnoszkolna)

**Przykładowe dane:**
- `Język polski` (ogólnokształcące, podstawowy)
- `Matematyka` (ogólnokształcące, podstawowy)
- `Matematyka - rozszerzona` (ogólnokształcące, rozszerzony)
- `Praktyka zawodowa - mechanik` (zawodowe praktyczne)

---

### 3.3. KLASY

Klasy w szkole, przypisane do typu szkoły.

| Kolumna | Typ | Opis | Przykład |
|---------|-----|------|----------|
| `id` | UUID (PK) | Unikalny identyfikator | |
| `nazwa` | VARCHAR(50) | Pełna nazwa klasy | `1A` |
| `typ_szkoly_id` | UUID (FK) | Typ szkoły | → TYPY_SZKOL |
| `rok_szkolny` | VARCHAR(9) | Rok szkolny | `2024/2025` |
| `numer_klasy` | INTEGER | Numer klasy w cyklu | `1` (pierwsza klasa) |
| `profil` | VARCHAR(100) | Profil klasy (opcjonalnie) | `matematyczno-fizyczny` |
| `zawod_id` | UUID (FK) | Zawód (dla szkół zawodowych) | → ZAWODY (nullable) |
| `aktywna` | BOOLEAN | Czy klasa jest aktywna | `true` |
| `created_at` | TIMESTAMP | Data utworzenia | |
| `updated_at` | TIMESTAMP | Data ostatniej aktualizacji | |

**Przykładowe dane:**
- `1A` (Liceum, 2024/2025, numer_klasy=1, profil=matematyczno-fizyczny)
- `2B` (Technikum, 2024/2025, numer_klasy=2, zawod_id=mechanik)

---

### 3.4. SIATKI_GODZIN_MEIN

Wymagania MEiN dotyczące liczby godzin dla przedmiotów w poszczególnych typach szkół i klasach.

| Kolumna | Typ | Opis | Przykład |
|---------|-----|------|----------|
| `id` | UUID (PK) | Unikalny identyfikator | |
| `przedmiot_id` | UUID (FK) | Przedmiot | → PRZEDMIOTY |
| `typ_szkoly_id` | UUID (FK) | Typ szkoły | → TYPY_SZKOL |
| `klasa` | INTEGER | Numer klasy (NULL = wszystkie klasy) | `1` lub `NULL` |
| `godziny_w_cyklu` | INTEGER | Wymagane godziny w całym cyklu | `360` |
| `godziny_tygodniowo_min` | DECIMAL(4,2) | Minimalne godziny tygodniowo | `2.0` |
| `godziny_tygodniowo_max` | DECIMAL(4,2) | Maksymalne godziny tygodniowo | `5.0` |
| `obowiazkowe` | BOOLEAN | Czy przedmiot jest obowiązkowy | `true` |
| `data_obowiazywania_od` | DATE | Od kiedy obowiązuje | `2024-09-01` |
| `data_obowiazywania_do` | DATE | Do kiedy obowiązuje (NULL = nadal) | `NULL` |
| `uwagi` | TEXT | Dodatkowe uwagi | |
| `created_at` | TIMESTAMP | Data utworzenia | |
| `updated_at` | TIMESTAMP | Data ostatniej aktualizacji | |

**Uwagi:**
- `klasa = NULL` oznacza wymaganie dla całego cyklu (suma wszystkich klas)
- `godziny_w_cyklu` to suma godzin z wszystkich lat cyklu
- `godziny_tygodniowo_min/max` określają rozkład godzin w poszczególnych latach

**Przykładowe dane:**
- Język polski, Liceum, klasa=NULL, godziny_w_cyklu=360, obowiazkowe=true
- Matematyka, Liceum, klasa=1, godziny_tygodniowo_min=4.0, godziny_tygodniowo_max=4.0

---

### 3.5. NAUCZYCIELE

Dane nauczycieli w szkole.

| Kolumna | Typ | Opis | Przykład |
|---------|-----|------|----------|
| `id` | UUID (PK) | Unikalny identyfikator | |
| `imie` | VARCHAR(50) | Imię | `Jan` |
| `nazwisko` | VARCHAR(50) | Nazwisko | `Kowalski` |
| `email` | VARCHAR(100) | Adres email | `jan.kowalski@szkola.pl` |
| `telefon` | VARCHAR(20) | Numer telefonu | `+48 123 456 789` |
| `max_obciazenie` | DECIMAL(5,2) | Maksymalne obciążenie godzinowe (tygodniowo) | `18.0` |
| `etat` | ENUM | Wymiar etatu | `pelny`, `pol`, `czwarty`, `osiemnasty` |
| `aktywny` | BOOLEAN | Czy nauczyciel jest aktywny | `true` |
| `created_at` | TIMESTAMP | Data utworzenia | |
| `updated_at` | TIMESTAMP | Data ostatniej aktualizacji | |

**Wartości ENUM `etat`:**
- `pelny` - Etat pełny (18 godzin)
- `pol` - Pół etatu (9 godzin)
- `czwarty` - 1/4 etatu (4.5 godziny)
- `osiemnasty` - 1/18 etatu (1 godzina)

---

### 3.6. KWALIFIKACJE

Kwalifikacje nauczycieli do nauczania przedmiotów (relacja wiele-do-wielu).

| Kolumna | Typ | Opis | Przykład |
|---------|-----|------|----------|
| `id` | UUID (PK) | Unikalny identyfikator | |
| `nauczyciel_id` | UUID (FK) | Nauczyciel | → NAUCZYCIELE |
| `przedmiot_id` | UUID (FK) | Przedmiot | → PRZEDMIOTY |
| `stopien` | VARCHAR(50) | Stopień kwalifikacji | `magister`, `doktor` |
| `specjalizacja` | VARCHAR(200) | Specjalizacja (opcjonalnie) | `Matematyka stosowana` |
| `data_uzyskania` | DATE | Data uzyskania kwalifikacji | `2010-06-15` |
| `dokument` | VARCHAR(200) | Numer dokumentu potwierdzającego | `Dyplom UW 12345` |
| `aktywne` | BOOLEAN | Czy kwalifikacja jest aktywna | `true` |
| `created_at` | TIMESTAMP | Data utworzenia | |
| `updated_at` | TIMESTAMP | Data ostatniej aktualizacji | |

**Uwagi:**
- Jeden nauczyciel może mieć wiele kwalifikacji (do różnych przedmiotów)
- Jeden przedmiot może być nauczany przez wielu nauczycieli
- System musi weryfikować kwalifikacje przed przypisaniem nauczyciela do przedmiotu

---

### 3.7. ROZKLAD_GODZIN

Rzeczywisty rozkład godzin - przypisania nauczycieli do przedmiotów w klasach.

| Kolumna | Typ | Opis | Przykład |
|---------|-----|------|----------|
| `id` | UUID (PK) | Unikalny identyfikator | |
| `przedmiot_id` | UUID (FK) | Przedmiot | → PRZEDMIOTY |
| `klasa_id` | UUID (FK) | Klasa | → KLASY |
| `nauczyciel_id` | UUID (FK) | Nauczyciel | → NAUCZYCIELE |
| `rok_szkolny` | VARCHAR(9) | Rok szkolny | `2024/2025` |
| `godziny_roczne` | INTEGER | Liczba godzin w roku szkolnym | `120` |
| `godziny_tyg` | DECIMAL(4,2) | Godziny tygodniowo | `4.0` |
| `semestr_1` | INTEGER | Godziny w semestrze 1 | `60` |
| `semestr_2` | INTEGER | Godziny w semestrze 2 | `60` |
| `typ_zajec` | ENUM | Typ zajęć (kopia z przedmiotu) | `ogolnoksztalcace` |
| `poziom` | ENUM | Poziom (kopia z przedmiotu) | `podstawowy` |
| `uwagi` | TEXT | Dodatkowe uwagi | |
| `created_at` | TIMESTAMP | Data utworzenia | |
| `updated_at` | TIMESTAMP | Data ostatniej aktualizacji | |

**Uwagi:**
- `godziny_roczne = semestr_1 + semestr_2`
- `godziny_tyg` to średnia godzin tygodniowo (może się różnić między semestrami)
- `typ_zajec` i `poziom` są kopiowane z przedmiotu dla szybkiego wyszukiwania

**Przykładowe dane:**
- Przedmiot: Język polski, Klasa: 1A, Nauczyciel: Jan Kowalski, godziny_roczne: 120, godziny_tyg: 4.0

---

### 3.8. ZAWODY

Zawody w szkołach zawodowych (technikum, branżowa).

| Kolumna | Typ | Opis | Przykład |
|---------|-----|------|----------|
| `id` | UUID (PK) | Unikalny identyfikator | |
| `nazwa` | VARCHAR(200) | Nazwa zawodu | `Technik mechanik` |
| `kod_zawodu` | VARCHAR(20) | Kod zawodu | `311504` |
| `typ_szkoly_id` | UUID (FK) | Typ szkoły | → TYPY_SZKOL |
| `godziny_teor_w_cyklu` | INTEGER | Godziny teoretyczne w cyklu | `800` |
| `godziny_prak_w_cyklu` | INTEGER | Godziny praktyczne w cyklu | `1200` |
| `aktywny` | BOOLEAN | Czy zawód jest aktywny | `true` |
| `created_at` | TIMESTAMP | Data utworzenia | |
| `updated_at` | TIMESTAMP | Data ostatniej aktualizacji | |

---

## 4. Relacje między tabelami

### 4.1. Relacje główne

1. **TYPY_SZKOL → KLASY** (1:N)
   - Jeden typ szkoły ma wiele klas
   - Klasy są przypisane do typu szkoły

2. **PRZEDMIOTY → SIATKI_GODZIN_MEIN** (1:N)
   - Jeden przedmiot ma wiele wpisów w siatce MEiN (dla różnych typów szkół/klas)

3. **TYPY_SZKOL → SIATKI_GODZIN_MEIN** (1:N)
   - Jeden typ szkoły ma wiele wpisów w siatce MEiN

4. **PRZEDMIOTY → ROZKLAD_GODZIN** (1:N)
   - Jeden przedmiot może być realizowany w wielu klasach

5. **KLASY → ROZKLAD_GODZIN** (1:N)
   - Jedna klasa ma wiele przedmiotów w rozkładzie

6. **NAUCZYCIELE → ROZKLAD_GODZIN** (1:N)
   - Jeden nauczyciel może uczyć wielu przedmiotów w wielu klasach

7. **NAUCZYCIELE → KWALIFIKACJE** (1:N)
   - Jeden nauczyciel może mieć wiele kwalifikacji

8. **PRZEDMIOTY → KWALIFIKACJE** (1:N)
   - Jeden przedmiot może wymagać kwalifikacji wielu nauczycieli

9. **ZAWODY → KLASY** (1:N)
   - Jeden zawód może być realizowany w wielu klasach (opcjonalnie)

---

## 5. Indeksy i ograniczenia

### 5.1. Indeksy dla wydajności

```sql
-- Indeksy dla szybkiego wyszukiwania
CREATE INDEX idx_klasy_typ_szkoly ON klasy(typ_szkoly_id);
CREATE INDEX idx_klasy_rok_szkolny ON klasy(rok_szkolny);
CREATE INDEX idx_rozkład_przedmiot ON rozklad_godzin(przedmiot_id);
CREATE INDEX idx_rozkład_klasa ON rozklad_godzin(klasa_id);
CREATE INDEX idx_rozkład_nauczyciel ON rozklad_godzin(nauczyciel_id);
CREATE INDEX idx_rozkład_rok_szkolny ON rozklad_godzin(rok_szkolny);
CREATE INDEX idx_siatki_przedmiot ON siatki_godzin_mein(przedmiot_id);
CREATE INDEX idx_siatki_typ_szkoly ON siatki_godzin_mein(typ_szkoly_id);
CREATE INDEX idx_kwalifikacje_nauczyciel ON kwalifikacje(nauczyciel_id);
CREATE INDEX idx_kwalifikacje_przedmiot ON kwalifikacje(przedmiot_id);
```

### 5.2. Ograniczenia (Constraints)

```sql
-- Unikalność kombinacji
ALTER TABLE rozklad_godzin 
  ADD CONSTRAINT uk_rozkład_przedmiot_klasa_nauczyciel_rok 
  UNIQUE (przedmiot_id, klasa_id, nauczyciel_id, rok_szkolny);

ALTER TABLE kwalifikacje 
  ADD CONSTRAINT uk_kwalifikacje_nauczyciel_przedmiot 
  UNIQUE (nauczyciel_id, przedmiot_id);

-- Sprawdzenie wartości
ALTER TABLE rozklad_godzin 
  ADD CONSTRAINT chk_godziny_roczne 
  CHECK (godziny_roczne = semestr_1 + semestr_2);

ALTER TABLE rozklad_godzin 
  ADD CONSTRAINT chk_godziny_pozytywne 
  CHECK (godziny_roczne > 0 AND godziny_tyg > 0);

ALTER TABLE nauczyciele 
  ADD CONSTRAINT chk_max_obciazenie 
  CHECK (max_obciazenie > 0 AND max_obciazenie <= 40);
```

---

## 6. Widoki (Views) dla raportowania

### 6.1. Widok: Zgodność z MEiN

```sql
CREATE VIEW v_zgodnosc_mein AS
SELECT 
  k.nazwa AS klasa,
  p.nazwa AS przedmiot,
  tg.nazwa AS typ_szkoly,
  sm.godziny_w_cyklu AS wymagane_mein,
  SUM(rg.godziny_roczne) AS realizowane,
  SUM(rg.godziny_roczne) - sm.godziny_w_cyklu AS roznica,
  CASE 
    WHEN SUM(rg.godziny_roczne) >= sm.godziny_w_cyklu THEN 'OK'
    ELSE 'BRAK'
  END AS status
FROM rozklad_godzin rg
JOIN klasy k ON rg.klasa_id = k.id
JOIN przedmioty p ON rg.przedmiot_id = p.id
JOIN typy_szkol tg ON k.typ_szkoly_id = tg.id
LEFT JOIN siatki_godzin_mein sm ON 
  sm.przedmiot_id = p.id 
  AND sm.typ_szkoly_id = tg.id
  AND (sm.klasa = k.numer_klasy OR sm.klasa IS NULL)
GROUP BY k.id, p.id, tg.id, sm.godziny_w_cyklu;
```

### 6.2. Widok: Obciążenie nauczycieli

```sql
CREATE VIEW v_obciazenie_nauczycieli AS
SELECT 
  n.id,
  n.imie,
  n.nazwisko,
  n.max_obciazenie,
  SUM(rg.godziny_tyg) AS aktualne_obciazenie,
  n.max_obciazenie - SUM(rg.godziny_tyg) AS dostepne,
  CASE 
    WHEN SUM(rg.godziny_tyg) > n.max_obciazenie THEN 'PRZEKROCZONE'
    WHEN SUM(rg.godziny_tyg) = n.max_obciazenie THEN 'PEŁNE'
    ELSE 'DOSTĘPNE'
  END AS status
FROM nauczyciele n
LEFT JOIN rozklad_godzin rg ON n.id = rg.nauczyciel_id
WHERE n.aktywny = true
GROUP BY n.id, n.imie, n.nazwisko, n.max_obciazenie;
```

### 6.3. Widok: Godziny w klasie

```sql
CREATE VIEW v_godziny_w_klasie AS
SELECT 
  k.nazwa AS klasa,
  k.rok_szkolny,
  p.nazwa AS przedmiot,
  n.imie || ' ' || n.nazwisko AS nauczyciel,
  rg.godziny_roczne,
  rg.godziny_tyg,
  rg.semestr_1,
  rg.semestr_2
FROM rozklad_godzin rg
JOIN klasy k ON rg.klasa_id = k.id
JOIN przedmioty p ON rg.przedmiot_id = p.id
JOIN nauczyciele n ON rg.nauczyciel_id = n.id
WHERE k.aktywna = true;
```

---

## 7. Funkcje walidacyjne

### 7.1. Sprawdzanie zgodności z MEiN

```sql
CREATE OR REPLACE FUNCTION sprawdz_zgodnosc_mein(
  p_klasa_id UUID,
  p_przedmiot_id UUID
) RETURNS TABLE (
  wymagane INTEGER,
  realizowane INTEGER,
  roznica INTEGER,
  procent REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sm.godziny_w_cyklu AS wymagane,
    COALESCE(SUM(rg.godziny_roczne), 0)::INTEGER AS realizowane,
    COALESCE(SUM(rg.godziny_roczne), 0)::INTEGER - sm.godziny_w_cyklu AS roznica,
    CASE 
      WHEN sm.godziny_w_cyklu > 0 
      THEN (COALESCE(SUM(rg.godziny_roczne), 0)::REAL / sm.godziny_w_cyklu::REAL) * 100
      ELSE 0
    END AS procent
  FROM klasy k
  JOIN typy_szkol ts ON k.typ_szkoly_id = ts.id
  JOIN siatki_godzin_mein sm ON 
    sm.typ_szkoly_id = ts.id 
    AND sm.przedmiot_id = p_przedmiot_id
    AND (sm.klasa = k.numer_klasy OR sm.klasa IS NULL)
  LEFT JOIN rozklad_godzin rg ON 
    rg.klasa_id = k.id 
    AND rg.przedmiot_id = p_przedmiot_id
  WHERE k.id = p_klasa_id
  GROUP BY sm.godziny_w_cyklu;
END;
$$ LANGUAGE plpgsql;
```

### 7.2. Sprawdzanie obciążenia nauczyciela

```sql
CREATE OR REPLACE FUNCTION sprawdz_obciazenie_nauczyciela(
  p_nauczyciel_id UUID,
  p_rok_szkolny VARCHAR
) RETURNS TABLE (
  max_obciazenie DECIMAL,
  aktualne_obciazenie DECIMAL,
  dostepne DECIMAL,
  status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.max_obciazenie,
    COALESCE(SUM(rg.godziny_tyg), 0) AS aktualne_obciazenie,
    n.max_obciazenie - COALESCE(SUM(rg.godziny_tyg), 0) AS dostepne,
    CASE 
      WHEN COALESCE(SUM(rg.godziny_tyg), 0) > n.max_obciazenie THEN 'PRZEKROCZONE'
      WHEN COALESCE(SUM(rg.godziny_tyg), 0) = n.max_obciazenie THEN 'PEŁNE'
      ELSE 'DOSTĘPNE'
    END AS status
  FROM nauczyciele n
  LEFT JOIN rozklad_godzin rg ON 
    n.id = rg.nauczyciel_id 
    AND rg.rok_szkolny = p_rok_szkolny
  WHERE n.id = p_nauczyciel_id
  GROUP BY n.id, n.max_obciazenie;
END;
$$ LANGUAGE plpgsql;
```

### 7.3. Sprawdzanie kwalifikacji

```sql
CREATE OR REPLACE FUNCTION sprawdz_kwalifikacje(
  p_nauczyciel_id UUID,
  p_przedmiot_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_ma_kwalifikacje BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 
    FROM kwalifikacje k
    WHERE k.nauczyciel_id = p_nauczyciel_id
      AND k.przedmiot_id = p_przedmiot_id
      AND k.aktywne = true
  ) INTO v_ma_kwalifikacje;
  
  RETURN v_ma_kwalifikacje;
END;
$$ LANGUAGE plpgsql;
```

---

## 8. Przykładowe zapytania

### 8.1. Pobranie wszystkich godzin dla klasy

```sql
SELECT 
  p.nazwa AS przedmiot,
  n.imie || ' ' || n.nazwisko AS nauczyciel,
  rg.godziny_roczne,
  rg.godziny_tyg
FROM rozklad_godzin rg
JOIN przedmioty p ON rg.przedmiot_id = p.id
JOIN nauczyciele n ON rg.nauczyciel_id = n.id
WHERE rg.klasa_id = '550e8400-e29b-41d4-a716-446655440000'
  AND rg.rok_szkolny = '2024/2025'
ORDER BY p.nazwa;
```

### 8.2. Znalezienie braków zgodności z MEiN

```sql
SELECT 
  k.nazwa AS klasa,
  p.nazwa AS przedmiot,
  sm.godziny_w_cyklu AS wymagane,
  COALESCE(SUM(rg.godziny_roczne), 0) AS realizowane,
  sm.godziny_w_cyklu - COALESCE(SUM(rg.godziny_roczne), 0) AS brak
FROM klasy k
JOIN typy_szkol ts ON k.typ_szkoly_id = ts.id
JOIN siatki_godzin_mein sm ON sm.typ_szkoly_id = ts.id
JOIN przedmioty p ON sm.przedmiot_id = p.id
LEFT JOIN rozklad_godzin rg ON 
  rg.klasa_id = k.id 
  AND rg.przedmiot_id = p.id
WHERE k.aktywna = true
  AND sm.obowiazkowe = true
GROUP BY k.id, k.nazwa, p.id, p.nazwa, sm.godziny_w_cyklu
HAVING COALESCE(SUM(rg.godziny_roczne), 0) < sm.godziny_w_cyklu
ORDER BY brak DESC;
```

### 8.3. Lista nauczycieli z dostępnymi godzinami

```sql
SELECT 
  n.imie || ' ' || n.nazwisko AS nauczyciel,
  n.max_obciazenie,
  COALESCE(SUM(rg.godziny_tyg), 0) AS aktualne,
  n.max_obciazenie - COALESCE(SUM(rg.godziny_tyg), 0) AS dostepne
FROM nauczyciele n
LEFT JOIN rozklad_godzin rg ON 
  n.id = rg.nauczyciel_id 
  AND rg.rok_szkolny = '2024/2025'
WHERE n.aktywny = true
GROUP BY n.id, n.imie, n.nazwisko, n.max_obciazenie
ORDER BY dostepne DESC;
```

---

## 9. Migracje i wersjonowanie

### 9.1. Struktura migracji

System powinien obsługiwać migracje bazy danych:
- Wersjonowanie schematu
- Migracje wstecz (rollback)
- Seed data (dane początkowe: typy szkół, przykładowe przedmioty)

### 9.2. Dane referencyjne

Dane, które powinny być załadowane przy inicjalizacji:
- Typy szkół (z analizy MEiN)
- Podstawowe przedmioty ogólnokształcące
- Siatki godzin MEiN (z załączników rozporządzenia)

---

## 10. Uwagi implementacyjne dla Payload CMS

### 10.1. Kolekcje Payload

Model danych powinien być zaimplementowany jako kolekcje Payload CMS:

1. **Kolekcja `typyszkol`** - TYPY_SZKOL
2. **Kolekcja `przedmioty`** - PRZEDMIOTY
3. **Kolekcja `klasy`** - KLASY
4. **Kolekcja `siatkigodzinmein`** - SIATKI_GODZIN_MEIN
5. **Kolekcja `nauczyciele`** - NAUCZYCIELE
6. **Kolekcja `kwalifikacje`** - KWALIFIKACJE
7. **Kolekcja `rozkładgodzin`** - ROZKLAD_GODZIN
8. **Kolekcja `zawody`** - ZAWODY

### 10.2. Relacje w Payload

Payload CMS obsługuje relacje przez pola `relationship`:
- `hasMany` - relacja 1:N
- `hasOne` - relacja 1:1
- `belongsTo` - relacja odwrotna

### 10.3. Walidacja w Payload

Walidacja powinna być zaimplementowana w:
- Hooks `beforeValidate`, `beforeChange`
- Custom validation functions
- After hooks do sprawdzania zgodności z MEiN

---

**Data utworzenia**: 2025-01-26  
**Status**: Model gotowy do implementacji
