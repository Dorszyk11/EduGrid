# EduGrid - System planowania siatki godzin

System do budowania siatki godzin i rozkładów przedmiotów dla szkół.

## Technologie

- **Next.js 14** - Framework React
- **Payload CMS 2.0** - Headless CMS
- **PostgreSQL** - Baza danych
- **TypeScript** - Typowanie

## Wymagania

- Node.js 18+ 
- PostgreSQL 12+
- npm lub yarn

## Instalacja

### 1. Zainstaluj zależności

```bash
npm install
```

### 2. Skonfiguruj bazę danych

Utwórz bazę danych PostgreSQL:

```sql
CREATE DATABASE edugrid;
```

### 3. Skonfiguruj zmienne środowiskowe

Skopiuj plik `.env.example` do `.env`:

```bash
cp .env.example .env
```

Edytuj plik `.env` i ustaw:

```env
PAYLOAD_SECRET=twoj-super-secret-klucz-zmien-to
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000
DATABASE_URI=postgresql://user:password@localhost:5432/edugrid
```

**WAŻNE**: Zmień `PAYLOAD_SECRET` na losowy, bezpieczny klucz (możesz wygenerować przez `openssl rand -base64 32`)

### 4. Uruchom migracje bazy danych

```bash
npm run payload migrate
```

### 5. Uruchom serwer deweloperski

```bash
npm run dev
```

Aplikacja będzie dostępna pod adresem:
- **Frontend**: http://localhost:3000
- **Panel Admin Payload**: http://localhost:3000/admin

## Struktura projektu

```
EduGrid/
├── src/
│   ├── collections/          # Kolekcje Payload CMS
│   │   ├── TypySzkol.ts
│   │   ├── Przedmioty.ts
│   │   ├── Klasy.ts
│   │   ├── Nauczyciele.ts
│   │   ├── SiatkiGodzinMein.ts
│   │   ├── Kwalifikacje.ts
│   │   ├── RozkladGodzin.ts
│   │   └── Zawody.ts
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/
│   └── payload.config.ts
├── payload.config.ts        # Główna konfiguracja Payload
├── package.json
├── tsconfig.json
└── next.config.js
```

## Kolekcje

System zawiera następujące kolekcje:

1. **Typy Szkół** - Liceum, Technikum, Branżowa, Podstawowa
2. **Przedmioty** - Przedmioty z typami i poziomami
3. **Klasy** - Klasy szkolne
4. **Nauczyciele** - Dane nauczycieli
5. **Siatki Godzin MEiN** - Wymagania ministerialne
6. **Kwalifikacje** - Kwalifikacje nauczycieli
7. **Rozkład Godzin** - Rzeczywisty rozkład godzin
8. **Zawody** - Zawody dla szkół zawodowych

## Skrypty

- `npm run dev` - Uruchom serwer deweloperski
- `npm run build` - Zbuduj aplikację produkcyjną
- `npm run start` - Uruchom aplikację produkcyjną
- `npm run payload` - Uruchom CLI Payload
- `npm run generate:types` - Wygeneruj typy TypeScript

## Dokumentacja

- [Analiza wymagań MEiN](./ANALIZA_WYMAGAN_MEIN.md)
- [Model danych](./MODELE_DANYCH.md)
- [Konfiguracja Payload](./KONFIGURACJA_PAYLOAD.md)

## Rozwój

### Dodawanie nowych kolekcji

1. Utwórz plik w `src/collections/`
2. Zaimportuj w `payload.config.ts`
3. Dodaj do tablicy `collections`

### Walidacja

Walidacja jest zaimplementowana w hookach kolekcji:
- `beforeValidate` - Walidacja przed zapisem
- `beforeChange` - Automatyczne ustawienia
- `afterChange` - Sprawdzanie zgodności

## Licencja

Prywatny projekt
