# Rozwiązywanie problemów z Payload CMS

## Problem: Module not found '@payloadcms/db-postgres'

### Przyczyna

Pakiet `@payloadcms/db-postgres` nie jest zainstalowany lub jest niekompatybilny z wersją Payload.

### Rozwiązanie 1: Instalacja pakietu (zalecane)

```bash
npm install @payloadcms/db-postgres
```

Jeśli to nie działa, sprawdź kompatybilność wersji.

### Rozwiązanie 2: Użyj mongoose (MongoDB) jako alternatywy

Jeśli PostgreSQL nie działa z Payload 2.x, możesz użyć MongoDB:

```bash
npm install @payloadcms/db-mongoose mongoose
```

Następnie zaktualizuj `payload.config.ts`:

```typescript
import { mongooseAdapter } from '@payloadcms/db-mongoose';

export default buildConfig({
  // ...
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || 'mongodb://localhost:27017/edugrid',
  }),
  // ...
});
```

### Rozwiązanie 3: Zaktualizuj do Payload 3.x

Payload 3.x ma pełne wsparcie dla PostgreSQL:

```bash
npm install payload@latest @payloadcms/db-postgres@latest
```

**UWAGA**: To może wymagać zmian w kodzie kolekcji.

## Problem: Kompatybilność wersji

### Payload 2.x vs 3.x

- **Payload 2.x**: Może nie mieć pełnego wsparcia dla PostgreSQL
- **Payload 3.x**: Pełne wsparcie dla PostgreSQL przez `@payloadcms/db-postgres`

### Sprawdzenie kompatybilności

```bash
npm view @payloadcms/db-postgres peerDependencies
```

## Problem: Błąd połączenia z bazą danych

### Sprawdź:

1. **Czy PostgreSQL jest uruchomiony?**
   ```bash
   docker ps  # Dla Dockera
   # lub
   psql -h localhost -U postgres  # Dla lokalnej instalacji
   ```

2. **Czy DATABASE_URI jest poprawne?**
   ```env
   DATABASE_URI=postgresql://postgres:password@localhost:5432/edugrid
   ```

3. **Czy baza danych istnieje?**
   ```sql
   CREATE DATABASE edugrid;
   ```

## Problem: Błędy TypeScript

### Sprawdź `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Problem: Błędy importów

### Sprawdź ścieżki:

- Używaj `@/` dla importów z `src/`
- Upewnij się, że pliki istnieją
- Sprawdź, czy `package.json` ma wszystkie zależności

---

**Aktualizacja**: Pakiet `@payloadcms/db-postgres` został dodany do `package.json`. Uruchom `npm install`, aby go zainstalować.
