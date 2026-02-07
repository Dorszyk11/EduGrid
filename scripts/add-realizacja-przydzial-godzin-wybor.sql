-- Dodaje kolumnę "realizacja" (JSONB) do tabeli przydziału godzin wyboru (dla zakładki Realizacja).
-- Uruchom ręcznie, jeśli npm run migrate nie dodało kolumny po dodaniu pola w kolekcji PrzydzialGodzinWybor.
--
-- 1) Sprawdź nazwę tabeli w swojej bazie (Payload często zamienia myślniki na podkreślenia):
--
--    SELECT table_name
--    FROM information_schema.tables
--    WHERE table_schema = 'public'
--      AND ( table_name LIKE '%przydzial%' OR table_name LIKE '%godzin%wybor%' );
--
-- 2) Albo znajdź tabelę po istniejącej kolumnie (np. "klasa" lub "przydzial"):
--
--    SELECT table_name
--    FROM information_schema.columns
--    WHERE table_schema = 'public' AND column_name = 'przydzial';
--
-- 3) Dodaj kolumnę (użyj dokładnej nazwy tabeli z kroku 1 lub 2).
--    Typ JSONB – w środku: { "planId_Przedmiot": { "I": 3, "II": 2 }, ... }
--

-- Wariant A: tabela nazywa się "przydzial_godzin_wybor" (slug z podkreśleniami):
ALTER TABLE przydzial_godzin_wybor ADD COLUMN IF NOT EXISTS realizacja JSONB;

-- Wariant B: jeśli Payload trzyma slug z myślnikami w cudzysłowiu:
-- ALTER TABLE "przydzial-godzin-wybor" ADD COLUMN IF NOT EXISTS realizacja JSONB;

-- Opcjonalnie: ustaw domyślną wartość dla istniejących wierszy (pusty obiekt):
-- UPDATE przydzial_godzin_wybor SET realizacja = '{}' WHERE realizacja IS NULL;
-- (odkomentuj powyższą linię tylko jeśli Twoja tabela to przydzial_godzin_wybor)
