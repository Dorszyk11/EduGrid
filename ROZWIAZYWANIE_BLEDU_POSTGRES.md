# Rozwiązywanie błędu autentykacji PostgreSQL

## Problem
```
password authentication failed for user "postgres"
```

To oznacza, że hasło w pliku `.env` nie pasuje do hasła ustawionego w PostgreSQL.

## Rozwiązanie

### Opcja 1: Docker (zalecane)

#### Krok 1: Sprawdź, czy kontener działa
```powershell
docker ps -a --filter "name=edugrid-postgres"
```

#### Krok 2A: Jeśli kontener nie istnieje, utwórz go
```powershell
docker run --name edugrid-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=edugrid -p 5432:5432 -d postgres:15
```

#### Krok 2B: Jeśli kontener istnieje, ale z innym hasłem
1. **Zatrzymaj i usuń stary kontener:**
   ```powershell
   docker stop edugrid-postgres
   docker rm edugrid-postgres
   ```

2. **Utwórz nowy kontener z hasłem "password":**
   ```powershell
   docker run --name edugrid-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=edugrid -p 5432:5432 -d postgres:15
   ```

3. **Sprawdź, czy działa:**
   ```powershell
   docker ps
   ```

### Opcja 2: Lokalna instalacja PostgreSQL

#### Krok 1: Sprawdź, jakie hasło masz ustawione

Jeśli nie pamiętasz hasła, możesz je zmienić:

#### Krok 2: Zmień hasło w PostgreSQL

**Metoda A: Przez psql (jeśli masz dostęp):**
```sql
-- Połącz się jako superuser
psql -U postgres

-- Zmień hasło
ALTER USER postgres WITH PASSWORD 'password';
\q
```

**Metoda B: Przez pgAdmin lub inny GUI**

#### Krok 3: Zaktualizuj `.env`

Upewnij się, że w pliku `.env` masz:
```env
DATABASE_URI=postgresql://postgres:password@localhost:5432/edugrid
```

**WAŻNE**: Zamień `password` na rzeczywiste hasło, jeśli używasz innego!

### Opcja 3: Użyj innego użytkownika

Jeśli masz innego użytkownika PostgreSQL z innym hasłem:

1. **Zaktualizuj `.env`:**
   ```env
   DATABASE_URI=postgresql://twoj_uzytkownik:twoje_haslo@localhost:5432/edugrid
   ```

2. **Upewnij się, że użytkownik ma uprawnienia:**
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE edugrid TO twoj_uzytkownik;
   ```

## Sprawdzenie połączenia

### Test 1: Przez psql
```powershell
psql -U postgres -d edugrid -h localhost
# Wpisz hasło gdy zostaniesz poproszony
```

### Test 2: Przez Docker (jeśli używasz Dockera)
```powershell
docker exec -it edugrid-postgres psql -U postgres -d edugrid
```

### Test 3: Sprawdź w aplikacji

Po zaktualizowaniu `.env`:
1. **Zrestartuj serwer Next.js** (Ctrl+C, potem `npm run dev`)
2. **Otwórz** http://localhost:3000/api/typy-szkol
3. **Sprawdź terminal** - nie powinno być błędów autentykacji

## Najczęstsze problemy

### Problem: Port 5432 jest zajęty
**Rozwiązanie:**
- Sprawdź, co używa portu: `netstat -ano | findstr :5432`
- Zatrzymaj inne instancje PostgreSQL
- Lub zmień port w Docker: `-p 5433:5432` i zaktualizuj `.env`

### Problem: Docker Desktop nie działa
**Rozwiązanie:**
- Uruchom Docker Desktop
- Uruchom PowerShell jako Administrator
- Spróbuj ponownie

### Problem: Baza danych nie istnieje
**Rozwiązanie:**
```sql
CREATE DATABASE edugrid;
```

## Szybkie rozwiązanie (Docker)

Jeśli chcesz szybko naprawić problem z Dockerem:

```powershell
# Zatrzymaj i usuń stary kontener
docker stop edugrid-postgres 2>$null
docker rm edugrid-postgres 2>$null

# Utwórz nowy z poprawnym hasłem
docker run --name edugrid-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=edugrid -p 5432:5432 -d postgres:15

# Sprawdź status
docker ps
```

Następnie zrestartuj serwer Next.js (`npm run dev`).

---

**Po naprawieniu**: Uruchom migracje Payload:
```powershell
npm run migrate
```
