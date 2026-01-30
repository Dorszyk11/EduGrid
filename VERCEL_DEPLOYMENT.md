# Deployment na Vercel

## Konfiguracja zmiennych środowiskowych

W ustawieniach projektu Vercel (Settings → Environment Variables) dodaj następujące zmienne:

### Wymagane zmienne:

1. **`DATABASE_URI`**
   ```
   postgresql://postgres.nocalrcxlhwvypqnjuhm:dorSZu11%21t%2Bz@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require&uselibpqcompat=true
   ```
   - Pozostaw bez zmian (to samo co lokalnie)

2. **`PAYLOAD_SECRET`**
   ```
   8mdjPuFesLvWYn1pTvMTcgK9Ajo10+PL/+vC1R6F6bA=
   ```
   - Pozostaw bez zmian (to samo co lokalnie)

3. **`PAYLOAD_PUBLIC_SERVER_URL`** (opcjonalnie)
   ```
   https://twoja-aplikacja.vercel.app
   ```
   - **UWAGA**: Jeśli nie ustawisz tej zmiennej, aplikacja automatycznie użyje `VERCEL_URL` (która jest dostępna automatycznie)
   - Jeśli chcesz użyć własnej domeny, ustaw tutaj pełny URL (np. `https://edugrid.pl`)

### Automatyczne wykrywanie URL

Aplikacja automatycznie wykryje URL Vercel przez zmienną `VERCEL_URL`, więc **nie musisz** ustawiać `PAYLOAD_PUBLIC_SERVER_URL` jeśli używasz domyślnej domeny Vercel.

## Kroki deploymentu:

1. **Push kodu do GitHuba**
   ```bash
   git add .
   git commit -m "Przygotowanie do deploymentu"
   git push
   ```

2. **Połącz projekt z Vercel**
   - Przejdź do [vercel.com](https://vercel.com)
   - Importuj projekt z GitHuba
   - Vercel automatycznie wykryje Next.js

3. **Dodaj zmienne środowiskowe**
   - W ustawieniach projektu Vercel
   - Settings → Environment Variables
   - Dodaj: `DATABASE_URI`, `PAYLOAD_SECRET`
   - Opcjonalnie: `PAYLOAD_PUBLIC_SERVER_URL` (jeśli używasz własnej domeny)

4. **Deploy**
   - Vercel automatycznie zbuduje i wdroży aplikację
   - Po deployu sprawdź czy wszystko działa

## Uwagi:

- **Supabase**: Upewnij się, że Supabase pozwala na połączenia z IP Vercel (domyślnie powinno działać)
- **CORS**: Jeśli masz problemy z CORS, sprawdź ustawienia w Supabase
- **Build**: Build powinien przejść bez problemów (wszystkie błędy TypeScript zostały naprawione)

## Sprawdzenie po deploymencie:

1. Otwórz URL aplikacji na Vercel
2. Sprawdź czy Payload Admin działa: `https://twoja-aplikacja.vercel.app/admin`
3. Sprawdź czy API działa: `https://twoja-aplikacja.vercel.app/api/typy-szkol`

## Własna domena:

Jeśli chcesz użyć własnej domeny:
1. Dodaj domenę w ustawieniach Vercel (Settings → Domains)
2. Ustaw `PAYLOAD_PUBLIC_SERVER_URL=https://twoja-domena.pl`
3. Skonfiguruj DNS zgodnie z instrukcjami Vercel
