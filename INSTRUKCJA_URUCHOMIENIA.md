# Instrukcja uruchomienia EduGrid

## Krok 1: Instalacja zależności

Otwórz terminal w katalogu projektu i uruchom:

```bash
npm install
```

## Krok 2: Konfiguracja bazy danych PostgreSQL

### Opcja A: Lokalna baza PostgreSQL

1. Upewnij się, że masz zainstalowany PostgreSQL
2. Utwórz bazę danych:

```sql
CREATE DATABASE edugrid;
```

### Opcja B: Docker (zalecane dla szybkiego startu)

Jeśli masz Docker, możesz uruchomić PostgreSQL w kontenerze:

```bash
docker run --name edugrid-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=edugrid -p 5432:5432 -d postgres:15
```

## Krok 3: Konfiguracja zmiennych środowiskowych

1. Skopiuj plik `.env.example` do `.env`:

```bash
cp .env.example .env
```

2. Edytuj plik `.env` i ustaw:

```env
# Wygeneruj bezpieczny klucz (możesz użyć: openssl rand -base64 32)
PAYLOAD_SECRET=twoj-super-secret-klucz-zmien-to-na-losowy

# URL serwera
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000

# Baza danych (dostosuj do swoich ustawień)
# Dla lokalnej bazy:
DATABASE_URI=postgresql://postgres:password@localhost:5432/edugrid

# Dla Dockera (jeśli używasz powyższego polecenia):
# DATABASE_URI=postgresql://postgres:password@localhost:5432/edugrid
```

**WAŻNE**: 
- Zmień `PAYLOAD_SECRET` na losowy, bezpieczny klucz
- Dostosuj `DATABASE_URI` do swoich ustawień bazy danych (użytkownik, hasło, port)

## Krok 4: Migracja bazy danych

Uruchom migracje, aby utworzyć tabele w bazie danych:

```bash
npm run payload migrate
```

Jeśli pojawi się błąd, upewnij się, że:
- Baza danych istnieje
- `DATABASE_URI` w `.env` jest poprawne
- PostgreSQL jest uruchomiony

## Krok 5: Uruchomienie serwera deweloperskiego

```bash
npm run dev
```

## Krok 6: Dostęp do aplikacji

Po uruchomieniu serwera:

1. **Frontend**: http://localhost:3000
2. **Panel Admin Payload**: http://localhost:3000/admin

## Krok 7: Utworzenie pierwszego użytkownika

1. Przejdź do http://localhost:3000/admin
2. Zostaniesz poproszony o utworzenie pierwszego użytkownika administratora
3. Wypełnij formularz i utwórz konto

## Rozwiązywanie problemów

### Błąd: "Cannot connect to database"

- Sprawdź, czy PostgreSQL jest uruchomiony
- Sprawdź `DATABASE_URI` w pliku `.env`
- Sprawdź, czy baza danych `edugrid` istnieje

### Błąd: "PAYLOAD_SECRET is required"

- Upewnij się, że plik `.env` istnieje
- Sprawdź, czy `PAYLOAD_SECRET` jest ustawione w `.env`

### Błąd: "Module not found"

- Uruchom `npm install` ponownie
- Sprawdź, czy wszystkie zależności są zainstalowane

### Port 3000 jest zajęty

- Zmień port w `package.json` (dodaj `-p 3001` do skryptu `dev`)
- Lub zatrzymaj proces używający portu 3000

## Następne kroki

Po uruchomieniu systemu:

1. Dodaj typy szkół (Liceum, Technikum, itp.)
2. Dodaj przedmioty
3. Dodaj klasy
4. Dodaj nauczycieli
5. Dodaj kwalifikacje nauczycieli
6. Zaimportuj siatki godzin MEiN
7. Utwórz rozkład godzin

Powodzenia! 🚀
