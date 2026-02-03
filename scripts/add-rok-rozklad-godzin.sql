-- Dodaje kolumnę "rok" (I, II, III…) do tabeli rozkładu godzin, żeby „Do przydzielenia” w Dyspozycji działało per rok w cyklu.
-- Uruchom po dodaniu pola "rok" w kolekcji RozkladGodzin, jeśli npm run migrate nie dodało kolumny.
-- Nazwa tabeli w Postgres może być np. "rozklad_godzin" lub "rozkład_godzin" – sprawdź w bazie i zamień poniżej.

-- Przykład (dostosuj nazwę tabeli):
-- ALTER TABLE rozklad_godzin ADD COLUMN IF NOT EXISTS rok TEXT;

-- Odnalezienie tabeli po kolumnach (w razie wątpliwości):
-- SELECT table_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'godziny_tyg' AND table_name LIKE '%godzin%';
