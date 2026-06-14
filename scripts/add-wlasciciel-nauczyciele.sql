-- P0-1 izolacja multi-tenant: właściciel (konto twórcy) dla tabeli `nauczyciele`.
--
-- W dev kolumnę tworzy automatycznie Payload (auto-push) z definicji pola `wlasciciel`.
-- Na produkcji (bez działającego `payload migrate`) uruchom ten SQL ręcznie,
-- analogicznie do pozostałych skryptów w /scripts.
--
-- Nazwa kolumny wg konwencji Payload dla relacji: <pole>_id
-- (jak istniejąca kolumna `klasy.wlasciciel_id` — zweryfikuj nią, jeśli masz wątpliwość).

ALTER TABLE nauczyciele
  ADD COLUMN IF NOT EXISTS wlasciciel_id INTEGER REFERENCES users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS nauczyciele_wlasciciel_id_idx ON nauczyciele (wlasciciel_id);

-- BACKFILL — KONIECZNY do pełnej izolacji.
-- Dopóki istnieją wiersze z wlasciciel_id IS NULL, są widoczne dla WSZYSTKICH kont (tryb legacy).
-- Przypisz istniejących nauczycieli do właściwego konta (podstaw realne <ID_KONTA> z tabeli users):
--
--   UPDATE nauczyciele SET wlasciciel_id = <ID_KONTA> WHERE wlasciciel_id IS NULL;
