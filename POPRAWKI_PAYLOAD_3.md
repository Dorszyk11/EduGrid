# Poprawki dla Payload 3.x

## Zmiany w importach

### 1. buildConfig

**Przed (Payload 2.x):**
```typescript
import { buildConfig } from 'payload/config';
```

**Po (Payload 3.x):**
```typescript
import { buildConfig } from 'payload';
```

### 2. CollectionConfig

W Payload 3.x `CollectionConfig` może być importowane z:
- `'payload/types'` - powinno działać
- Lub bezpośrednio z `'payload'` - jeśli dostępne

### 3. getPayload

**Przed i Po (bez zmian):**
```typescript
import { getPayload } from 'payload';
```

## Sprawdzenie instalacji

Upewnij się, że masz zainstalowane:
```bash
npm install payload@^3.73.0 @payloadcms/db-postgres@^3.73.0 @payloadcms/richtext-slate@^3.0.0
```

## Jeśli nadal są błędy

1. **Usuń node_modules i package-lock.json:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Sprawdź wersje:**
   ```bash
   npm list payload @payloadcms/db-postgres
   ```

3. **Użyj --legacy-peer-deps jeśli potrzeba:**
   ```bash
   npm install --legacy-peer-deps
   ```

---

**Status**: Import `buildConfig` został poprawiony z `'payload/config'` na `'payload'`.
