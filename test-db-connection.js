/**
 * Skrypt testowy do sprawdzenia połączenia z bazą danych PostgreSQL
 * Uruchom: node test-db-connection.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URI;

if (!connectionString) {
  console.error('❌ BŁĄD: DATABASE_URI nie jest ustawione w .env');
  process.exit(1);
}

console.log('🔍 Testowanie połączenia z bazą danych...');
console.log('📋 Connection string:', connectionString.replace(/:[^:@]+@/, ':****@')); // Ukryj hasło

const pool = new Pool({
  connectionString: connectionString,
});

pool.query('SELECT NOW() as current_time, current_database() as database_name, current_user as user_name')
  .then((result) => {
    console.log('✅ Połączenie udane!');
    console.log('📊 Informacje o bazie:');
    console.log('   - Czas serwera:', result.rows[0].current_time);
    console.log('   - Baza danych:', result.rows[0].database_name);
    console.log('   - Użytkownik:', result.rows[0].user_name);
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Błąd połączenia:');
    console.error('   Typ:', error.code || 'UNKNOWN');
    console.error('   Wiadomość:', error.message);
    console.log('🧩 pg config:', pool.options);

    
    if (error.code === '28P01') {
      console.error('\n💡 Problem: Błędne hasło lub użytkownik');
      console.error('   Rozwiązanie:');
      console.error('   1. Sprawdź hasło w pliku .env');
      console.error('   2. Jeśli używasz Dockera, upewnij się, że kontener został utworzony z hasłem "password"');
      console.error('   3. Jeśli używasz lokalnej instalacji, sprawdź rzeczywiste hasło użytkownika postgres');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Problem: PostgreSQL nie jest uruchomiony');
      console.error('   Rozwiązanie:');
      console.error('   1. Uruchom Docker Desktop i kontener PostgreSQL');
      console.error('   2. Lub uruchom lokalną instalację PostgreSQL');
    } else if (error.code === '3D000') {
      console.error('\n💡 Problem: Baza danych nie istnieje');
      console.error('   Rozwiązanie:');
      console.error('   1. Utwórz bazę danych: CREATE DATABASE edugrid;');
    }
    
    pool.end();
    process.exit(1);
  });
