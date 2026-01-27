# Quick Start - EduGrid

## Szybki start

### 1. Zainstaluj zależności

```bash
npm install
```

Jeśli pojawią się błędy z peer dependencies:
```bash
npm install --legacy-peer-deps
```

### 2. Skonfiguruj bazę danych

#### Opcja A: Docker (zalecane)

```bash
docker run --name edugrid-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=edugrid -p 5432:5432 -d postgres:15
```

#### Opcja B: Lokalna instalacja PostgreSQL

Utwórz bazę danych:
```sql
CREATE DATABASE edugrid;
```

### 3. Skonfiguruj zmienne środowiskowe

Plik `.env` powinien zawierać:

```env
# Payload CMS
PAYLOAD_SECRET=Jp9sV8E2kNwQZrF3mY0H6cA4X7BqT5LDUeK+ZxR1o=
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000

# Database
DATABASE_URI=postgresql://postgres:password@localhost:5432/edugrid

# Next.js
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

**WAŻNE**: 
- `PAYLOAD_SECRET` - już ustawione w `.env`, możesz wygenerować nowy przez: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- `DATABASE_URI` - dostosuj do swojej konfiguracji PostgreSQL

### 4. Uruchom migracje

```bash
npm run migrate
```

### 5. Uruchom serwer deweloperski

```bash
npm run dev
```

### 6. Otwórz aplikację

- **Frontend**: http://localhost:3000
- **Panel Admin Payload**: http://localhost:3000/admin
- **Dashboard Dyrektora**: http://localhost:3000/dashboard

## Pierwsze kroki

1. **Utwórz pierwszego użytkownika**:
   - Przejdź do http://localhost:3000/admin
   - Zostaniesz poproszony o utworzenie konta administratora

2. **Dodaj typy szkół**:
   - W panelu admin: Typy Szkół → Create New
   - Dodaj: Liceum ogólnokształcące (4 lata), Technikum (5 lat), itp.

3. **Dodaj przedmioty**:
   - Przedmioty → Create New
   - Dodaj przedmioty: Język polski, Matematyka, itp.

4. **Dodaj klasy**:
   - Klasy → Create New
   - Wybierz typ szkoły, ustaw rok szkolny

5. **Dodaj nauczycieli**:
   - Nauczyciele → Create New
   - Ustaw maksymalne obciążenie (domyślnie 18h dla pełnego etatu)

6. **Dodaj kwalifikacje**:
   - Kwalifikacje → Create New
   - Przypisz nauczycieli do przedmiotów

7. **Zaimportuj siatki godzin MEiN**:
   - Siatki Godzin MEiN → Create New
   - Wprowadź wymagania dla każdego przedmiotu

8. **Utwórz rozkład godzin**:
   - Rozkład Godzin → Create New
   - Lub użyj automatycznego rozdziału (przyszłe)

## Rozwiązywanie problemów

### Błąd: "Module not found: Package path ./config"

✅ **NAPRAWIONE**: Import został zmieniony z `'payload/config'` na `'payload'` w `payload.config.ts`

### Błąd: "Cannot connect to database"

- Sprawdź, czy PostgreSQL jest uruchomiony
- Sprawdź `DATABASE_URI` w `.env`
- Sprawdź, czy baza danych `edugrid` istnieje

### Błąd: "PAYLOAD_SECRET is required"

- Upewnij się, że plik `.env` istnieje
- Sprawdź, czy `PAYLOAD_SECRET` jest ustawione

### Port 3000 jest zajęty

- Zmień port w `package.json` (dodaj `-p 3001` do skryptu `dev`)
- Lub zatrzymaj proces używający portu 3000

---

**Gotowe!** System powinien teraz działać. 🚀
