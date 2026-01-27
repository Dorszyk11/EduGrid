# Aktualizacja do Payload 3.x

## Zmiany

Zaktualizowano projekt do Payload 3.73.0, aby uzyskać pełne wsparcie dla PostgreSQL.

## Co zostało zmienione

### package.json

- `payload`: `^2.32.3` → `^3.73.0`
- `@payloadcms/db-postgres`: Dodano `^3.73.0`
- `@payloadcms/richtext-slate`: `^1.0.0` → `^3.0.0`

### payload.config.ts

- Zaktualizowano importy dla Payload 3.x
- Użyto `fileURLToPath` zamiast `__dirname` (ESM)

## Instalacja

```bash
npm install
```

Jeśli pojawią się błędy z peer dependencies, użyj:

```bash
npm install --legacy-peer-deps
```

## Sprawdzenie kompatybilności

Większość kodu powinna być kompatybilna, ponieważ:
- Kolekcje używają `CollectionConfig` (bez zmian)
- API jest podobne
- Tylko konfiguracja główna wymagała aktualizacji

## Ewentualne problemy

Jeśli pojawią się błędy:

1. **Błędy importów** - Sprawdź, czy wszystkie pakiety są zainstalowane
2. **Błędy TypeScript** - Uruchom `npm run generate:types`
3. **Błędy konfiguracji** - Sprawdź dokumentację Payload 3.x

## Następne kroki

1. Zainstaluj pakiety: `npm install`
2. Uruchom migracje: `npm run migrate`
3. Uruchom serwer: `npm run dev`

---

**Status**: Zaktualizowano do Payload 3.73.0
