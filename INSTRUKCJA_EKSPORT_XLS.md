# Instrukcja eksportu do XLS

## Instalacja

Biblioteka `xlsx` jest już dodana do `package.json`. Aby zainstalować:

```bash
npm install
```

## Funkcjonalność

### Endpoint API

**GET** `/api/export/xls`

**Parametry:**
- `typSzkolyId` (wymagany) - ID typu szkoły
- `rokSzkolny` (opcjonalny) - Rok szkolny, domyślnie `2024/2025`
- `typ` (opcjonalny) - Typ eksportu:
  - `arkusz-organizacyjny` (domyślny) - Pełny arkusz organizacyjny
  - `zgodnosc-mein` - Eksport zgodności z MEiN

### Typy eksportu

#### 1. Arkusz organizacyjny (`arkusz-organizacyjny`)

Generuje plik Excel z 3 arkuszami:

**Arkusz 1: Rozkład godzin**
- Klasa
- Przedmiot
- Nauczyciel
- Godziny tygodniowo
- Godziny rocznie
- Rok szkolny

**Arkusz 2: Podsumowanie klas**
- Klasa
- Profil
- Liczba przedmiotów
- Suma godzin rocznie
- Rok szkolny

**Arkusz 3: Obciążenie nauczycieli**
- Imię
- Nazwisko
- Email
- Max obciążenie
- Godziny tygodniowo
- Godziny rocznie
- Procent wykorzystania
- Etat

#### 2. Zgodność MEiN (`zgodnosc-mein`)

Generuje plik Excel z danymi zgodności:
- Przedmiot
- Klasa
- Wymagane MEiN
- Planowane
- Różnica
- Procent realizacji
- Status

## Użycie w interfejsie

### Przycisk eksportu w DashboardCTA

Przycisk eksportu automatycznie używa wybranego typu szkoły i roku szkolnego z dashboardu.

### Przykład użycia programowego

```typescript
const typSzkolyId = '...';
const rokSzkolny = '2024/2025';
const url = `/api/export/xls?typSzkolyId=${typSzkolyId}&rokSzkolny=${rokSzkolny}&typ=arkusz-organizacyjny`;

const response = await fetch(url);
const blob = await response.blob();
const downloadUrl = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = downloadUrl;
a.download = `Arkusz_organizacyjny_${rokSzkolny.replace('/', '_')}.xlsx`;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
window.URL.revokeObjectURL(downloadUrl);
```

## Format pliku

- Format: `.xlsx` (Excel 2007+)
- Kodowanie: UTF-8
- Obsługa polskich znaków: Tak

## Ograniczenia

- Maksymalna liczba rekordów: 10,000 (można zwiększyć w kodzie)
- Brak historii eksportów (do implementacji)
- Brak wyboru szablonu (do implementacji)

## Rozszerzenia (do zaimplementowania)

1. **Wybór szablonu** - różne szablony arkusza organizacyjnego
2. **Historia eksportów** - logowanie kto i kiedy eksportował
3. **Eksport częściowy** - eksport tylko wybranych klas/przedmiotów
4. **Formatowanie** - lepsze formatowanie komórek (kolory, szerokości)
5. **Wykresy** - dodanie wykresów do arkusza
