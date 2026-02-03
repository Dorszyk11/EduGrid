-- =============================================================================
-- Ręczna migracja dla EduGrid (Payload 3 + PostgreSQL)
-- Uruchom w swojej bazie: psql, pgAdmin, Supabase SQL Editor itp.
-- Najpierw sprawdź nazwy tabel: \dt (w psql) lub lista tabel w bazie.
-- Payload może tworzyć tabele z myślnikami w nazwie (np. "rozkład-godzin") –
-- wtedy w SQL używaj cudzysłowów: "nauczyciele_rels".
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Relacja nauczyciele.przedmioty (hasMany) – tabela _rels
-- Payload 3 domyślnie używa sufiksu _rels (relationshipsSuffix).
-- Jeśli Twoja tabela nauczycieli ma inną nazwę (np. z myślnikiem), zamień
-- "nauczyciele" i "nauczyciele_rels" na faktyczne nazwy (w cudzysłowach).
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS nauczyciele_rels (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL,
  path VARCHAR(255) NOT NULL DEFAULT 'przedmioty',
  "order" INTEGER,
  przedmioty_id INTEGER,
  CONSTRAINT nauczyciele_rels_parent_fk
    FOREIGN KEY (parent_id) REFERENCES nauczyciele(id) ON DELETE CASCADE,
  CONSTRAINT nauczyciele_rels_przedmioty_fk
    FOREIGN KEY (przedmioty_id) REFERENCES przedmioty(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_nauczyciele_rels_parent
  ON nauczyciele_rels(parent_id);
CREATE INDEX IF NOT EXISTS idx_nauczyciele_rels_path
  ON nauczyciele_rels(path);
CREATE INDEX IF NOT EXISTS idx_nauczyciele_rels_przedmioty_id
  ON nauczyciele_rels(przedmioty_id);

COMMENT ON TABLE nauczyciele_rels IS 'Relacje nauczyciele.przedmioty (Payload 3 _rels)';


-- -----------------------------------------------------------------------------
-- 2) Opcjonalnie: kolumna wlasciciel w tabeli klasy (właściciel = twórca klasy)
-- Odkomentuj, jeśli jeszcze nie masz tej kolumny i używasz kontroli dostępu.
-- -----------------------------------------------------------------------------

-- ALTER TABLE klasy
--   ADD COLUMN IF NOT EXISTS wlasciciel_id INTEGER REFERENCES users(id);
-- CREATE INDEX IF NOT EXISTS idx_klasy_wlasciciel ON klasy(wlasciciel_id);


-- -----------------------------------------------------------------------------
-- Jeśli Payload w Twojej bazie używa tabel w cudzysłowach (np. "rozkład-godzin"),
-- użyj wersji z cudzysłowami:
--
-- CREATE TABLE IF NOT EXISTS "nauczyciele_rels" (
--   id SERIAL PRIMARY KEY,
--   parent_id INTEGER NOT NULL REFERENCES "nauczyciele"(id) ON DELETE CASCADE,
--   path VARCHAR(255) NOT NULL DEFAULT 'przedmioty',
--   "order" INTEGER,
--   przedmioty_id INTEGER REFERENCES "przedmioty"(id) ON DELETE CASCADE
-- );
-- CREATE INDEX IF NOT EXISTS idx_nauczyciele_rels_parent ON "nauczyciele_rels"(parent_id);
-- CREATE INDEX IF NOT EXISTS idx_nauczyciele_rels_path ON "nauczyciele_rels"(path);
-- CREATE INDEX IF NOT EXISTS idx_nauczyciele_rels_przedmioty ON "nauczyciele_rels"(przedmioty_id);
-- =============================================================================
