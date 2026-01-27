# Instrukcja wypełniania bazy danymi testowymi

## Metoda 1: Przez API (najłatwiejsza) ⭐

1. Uruchom serwer deweloperski:
   ```bash
   npm run dev
   ```

2. Otwórz w przeglądarce:
   ```
   http://localhost:3000/api/seed
   ```

3. Sprawdź odpowiedź JSON - powinna zawierać podsumowanie dodanych danych.

**UWAGA**: Działa tylko w środowisku deweloperskim (NODE_ENV !== 'production').

---

## Metoda 2: Przez skrypt Node.js

1. Upewnij się, że serwer Next.js NIE jest uruchomiony (lub użyj innego terminala)

2. Uruchom skrypt:
   ```bash
   node scripts/seed-test-data.js
   ```

**UWAGA**: Ta metoda może wymagać dodatkowej konfiguracji, jeśli Payload używa ESM.

---

## Metoda 3: Ręcznie przez panel admin

1. Otwórz http://localhost:3000/admin
2. Przejdź do odpowiednich kolekcji
3. Dodaj dane zgodnie z `DANE_TESTOWE.md`

---

## Co zostanie dodane:

- ✅ 3 typy szkół (Liceum, Technikum, Branżowa)
- ✅ 13 przedmiotów (podstawowe + rozszerzone)
- ✅ 5 nauczycieli
- ✅ 6 kwalifikacji
- ✅ 3 klasy
- ✅ 4 siatki godzin MEiN
- ✅ 4 rekordy rozkładu godzin

---

## Rozwiązywanie problemów

### Błąd: "Seed jest dostępny tylko w środowisku deweloperskim"
- Upewnij się, że `NODE_ENV` nie jest ustawione na `production`
- W `.env` nie ustawiaj `NODE_ENV=production`

### Błąd: "Cannot find module"
- Upewnij się, że wszystkie zależności są zainstalowane: `npm install`
- Sprawdź, czy `payload.config.ts` jest poprawnie skonfigurowany

### Błąd: "Duplicate entry"
- Dane już istnieją w bazie
- Usuń istniejące dane lub użyj innej bazy danych

---

**Gotowe!** Po seedowaniu możesz testować system z danymi testowymi. 🚀
