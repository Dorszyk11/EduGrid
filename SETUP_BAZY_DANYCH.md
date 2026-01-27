# Konfiguracja bazy danych PostgreSQL

## Opcja 1: Docker (zalecane)

### Krok 1: Uruchom Docker Desktop

Upewnij się, że Docker Desktop jest uruchomiony na Twoim komputerze.

### Krok 2: Uruchom kontener PostgreSQL

```bash
docker run --name edugrid-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=edugrid -p 5432:5432 -d postgres:15
```

### Krok 3: Sprawdź, czy kontener działa

```bash
docker ps
```

Powinieneś zobaczyć kontener `edugrid-postgres` na liście.

### Krok 4: Skonfiguruj .env

W pliku `.env` ustaw:

```env
DATABASE_URI=postgresql://postgres:password@localhost:5432/edugrid
```

### Przydatne komendy Docker:

- **Zatrzymaj kontener**: `docker stop edugrid-postgres`
- **Uruchom ponownie**: `docker start edugrid-postgres`
- **Usuń kontener**: `docker rm edugrid-postgres`
- **Zobacz logi**: `docker logs edugrid-postgres`

---

## Opcja 2: Lokalna instalacja PostgreSQL

### Krok 1: Zainstaluj PostgreSQL

Pobierz i zainstaluj PostgreSQL z: https://www.postgresql.org/download/windows/

### Krok 2: Utwórz bazę danych

Otwórz **pgAdmin** lub **psql** i wykonaj:

```sql
CREATE DATABASE edugrid;
```

### Krok 3: Skonfiguruj .env

W pliku `.env` ustaw (dostosuj do swoich ustawień):

```env
DATABASE_URI=postgresql://twoj_uzytkownik:twoje_haslo@localhost:5432/edugrid
```

Przykłady:
- Domyślny użytkownik: `postgresql://postgres:haslo@localhost:5432/edugrid`
- Inny użytkownik: `postgresql://moj_user:moje_haslo@localhost:5432/edugrid`

---

## Opcja 3: PostgreSQL w chmurze (dla testów)

Możesz użyć darmowych usług jak:
- **Supabase** (https://supabase.com)
- **Neon** (https://neon.tech)
- **Railway** (https://railway.app)

Po utworzeniu bazy danych, skopiuj connection string i ustaw w `.env`:

```env
DATABASE_URI=postgresql://user:password@host:port/database
```

---

## Rozwiązywanie problemów

### Problem: "Access is denied" przy Dockerze

**Rozwiązanie:**
1. Uruchom Docker Desktop jako administrator
2. Upewnij się, że Docker Desktop jest w pełni uruchomiony (ikona w system tray)
3. Spróbuj uruchomić PowerShell jako administrator

### Problem: "Cannot connect to database"

**Rozwiązanie:**
1. Sprawdź, czy PostgreSQL/Docker jest uruchomiony
2. Sprawdź `DATABASE_URI` w pliku `.env`
3. Sprawdź, czy port 5432 nie jest zajęty przez inny proces
4. Sprawdź firewall - może blokować połączenia

### Problem: "Database does not exist"

**Rozwiązanie:**
1. Utwórz bazę danych ręcznie:
   ```sql
   CREATE DATABASE edugrid;
   ```
2. Lub użyj Dockera z flagą `-e POSTGRES_DB=edugrid` (baza zostanie utworzona automatycznie)

### Problem: Port 5432 jest zajęty

**Rozwiązanie:**
1. Sprawdź, co używa portu:
   ```bash
   netstat -ano | findstr :5432
   ```
2. Zmień port w Dockerze:
   ```bash
   docker run --name edugrid-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=edugrid -p 5433:5432 -d postgres:15
   ```
3. I zaktualizuj `.env`:
   ```env
   DATABASE_URI=postgresql://postgres:password@localhost:5433/edugrid
   ```

---

## Test połączenia

Po skonfigurowaniu bazy danych, możesz przetestować połączenie:

### Z psql:
```bash
psql -h localhost -U postgres -d edugrid
```

### Z Node.js (opcjonalnie):
```bash
node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URI }); pool.query('SELECT NOW()', (err, res) => { console.log(err || res.rows[0]); process.exit(0); });"
```

---

## Następne kroki

Po skonfigurowaniu bazy danych:

1. Uruchom migracje:
   ```bash
   npm run migrate
   ```

2. Uruchom serwer:
   ```bash
   npm run dev
   ```

Powodzenia! 🚀
