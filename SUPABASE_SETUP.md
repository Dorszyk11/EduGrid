# Supabase – zakładanie projektu i podłączenie EduGrid

Krótki przewodnik: założenie bazy PostgreSQL w Supabase i połączenie z aplikacją EduGrid.

---

## Krok 1: Konto Supabase

1. Wejdź na **https://supabase.com**
2. Kliknij **Start your project**
3. Zaloguj się przez GitHub (lub e-mail) i zaakceptuj warunki

---

## Krok 2: Nowy projekt

1. W dashboardzie kliknij **New project**
2. **Organization** – wybierz domyślną (lub utwórz nową)
3. **Name** – np. `edugrid`
4. **Database Password** – **ważne:** ustaw hasło do bazy i **zapisz je**. Będzie potrzebne do `DATABASE_URI`.
5. **Region** – np. `Frankfurt (eu-central-1)` lub najbliższy
6. Kliknij **Create new project** i poczekaj ~2 minuty, aż projekt się utworzy

---

## Krok 3: Connection string (URI)

1. W lewym menu: **Project Settings** (ikona zębatki)
2. **Database** w bocznym menu
3. Przewiń do **Connection string**
4. Wybierz **URI**
5. Skopiuj connection string. Będzie wyglądał mniej więcej tak:
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
   ```
6. **Wklej swoje hasło** w miejsce `[YOUR-PASSWORD]` (to z Kroku 2).
7. Na **końcu** dodaj `?sslmode=require` (jeśli go jeszcze nie ma), np.:
   ```
   postgresql://postgres.xxx:MOJE_HASLO@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require
   ```

Używamy **Session mode** (port **5432**), bo EduGrid działa na zwykłym serwerze Next.js (np. `npm run dev`), a nie w serverless.

---

## Krok 4: Plik `.env` w EduGrid

W katalogu projektu EduGrid utwórz lub edytuj plik `.env` (obok `package.json`).

### Potrzebne zmienne

```env
# Baza Supabase – wklej swój connection string (z hasłem i ?sslmode=require)
DATABASE_URI=postgresql://postgres.xxx:TWOJE_HASLO@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require

# Payload CMS – wygeneruj: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
PAYLOAD_SECRET=wklej-wygenerowany-klucz

# URL aplikacji (localhost przy dev)
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3000
```

### Generowanie `PAYLOAD_SECRET`

W terminalu (w katalogu projektu):

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Skopiuj wynik i wklej jako wartość `PAYLOAD_SECRET` w `.env`.

---

## Krok 5: Migracje i uruchomienie

W katalogu projektu:

```powershell
npm run migrate
npm run dev
```

Otwórz **http://localhost:3000**. Powinieneś zobaczyć działającą aplikację z bazą w Supabase.

---

## Test połączenia z bazą

```powershell
npm run test:db
```

Jeśli połączenie jest OK, zobaczysz m.in. „Połączenie udane!” oraz nazwę bazy.

---

## Częste problemy

### „password authentication failed”
- Sprawdź, czy w `DATABASE_URI` wstawiłeś **właściwe hasło** z Kroku 2.
- W Supabase: **Project Settings → Database** możesz **Reset database password** i ustawić nowe (pamiętaj o aktualizacji `.env`).

### „Connection refused” / brak połączenia
- Sprawdź, czy projekt Supabase jest **Active** (Dashboard).
- Zweryfikuj `DATABASE_URI`: dobry host (np. `aws-0-eu-central-1.pooler.supabase.com`), port **5432**, `?sslmode=require` na końcu.

### „PAYLOAD_SECRET is required”
- Upewnij się, że w `.env` jest ustawione `PAYLOAD_SECRET` (wygenerowany w Kroku 4).

### Błędy SSL
- Konfiguracja Payload dla Supabase włącza SSL. Jeśli nadal są błędy, sprawdź czy w `DATABASE_URI` jest `?sslmode=require`.

---

## Podsumowanie

| Co | Gdzie |
|----|--------|
| Projekt | https://supabase.com/dashboard |
| Connection string | Project Settings → Database → Connection string (URI) |
| Reset hasła | Project Settings → Database → Reset database password |

Po ustawieniu `DATABASE_URI`, `PAYLOAD_SECRET` i `PAYLOAD_PUBLIC_SERVER_URL` w `.env`, migracjach (`npm run migrate`) i uruchomieniu (`npm run dev`) EduGrid powinien działać z Supabase.
