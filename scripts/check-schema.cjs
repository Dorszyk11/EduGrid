/**
 * Read-only diagnostyka izolacji per-konto. NIC nie zmienia w bazie.
 * Uruchom:  node scripts/check-schema.cjs
 *
 * Pokazuje, które tabele mają już kolumnę `wlasciciel_id` oraz ile rekordów
 * ma właściciela vs jest „legacy" (NULL) — potrzebne do oceny izolacji i backfillu.
 */
const fs = require('fs');
const path = require('path');
const dns = require('dns');
dns.setServers(['1.1.1.1', '1.0.0.1']);

try {
  const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m && process.env[m[1].trim()] == null) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
} catch (e) {}

const { Pool } = require('pg');
const cs = process.env.DATABASE_URI;
if (!cs) {
  console.error('Brak DATABASE_URI w .env');
  process.exit(1);
}
const pool = new Pool({
  connectionString: cs,
  ssl: cs.includes('supabase') ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  const cols = await pool.query(
    `SELECT table_name, column_name FROM information_schema.columns
     WHERE table_name IN ('nauczyciele','klasy','rozkład-godzin','przydzial-godzin-wybor')
       AND column_name LIKE 'wlasciciel%'
     ORDER BY table_name, column_name`
  );
  console.log('Kolumny wlasciciel_*:', cols.rows.length ? cols.rows : '(brak)');

  for (const t of ['nauczyciele', 'klasy']) {
    const has = cols.rows.some((r) => r.table_name === t);
    if (!has) {
      console.log(`  ${t}: BRAK kolumny wlasciciel_id`);
      continue;
    }
    const c = await pool.query(
      `SELECT count(*)::int total, count(wlasciciel_id)::int z_wlascicielem FROM ${t}`
    );
    console.log(`  ${t}: total=${c.rows[0].total}, z właścicielem=${c.rows[0].z_wlascicielem}`);
  }
}

main()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Błąd:', e.code || '', e.message);
    pool.end().finally(() => process.exit(1));
  });
