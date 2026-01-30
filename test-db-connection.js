/**
 * Skrypt testowy do sprawdzenia połączenia z bazą danych PostgreSQL
 * Uruchom: node test-db-connection.js
 */

const fs = require('fs');
const path = require('path');
const dns = require('dns');

// 🔥 WYMUSZENIE DNS (Node ma ENOTFOUND mimo że nslookup działa)
dns.setServers(['1.1.1.1', '1.0.0.1']);

// Ładuj .env (bez zewn. zależności)
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    for (const line of env.split('\n')) {
      const m = line.match(/^\s*([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
} catch (e) {}
try { require('dotenv').config(); } catch (e) {}

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
  ...(connectionString.includes('supabase') && { ssl: { rejectUnauthorized: false } }),
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
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Problem: PostgreSQL nie jest uruchomiony / port zablokowany');
    } else if (error.code === '3D000') {
      console.error('\n💡 Problem: Baza danych nie istnieje');
    } else if (error.code === 'ENOTFOUND') {
      console.error('\n💡 Problem: DNS w Node nie rozwiązuje hosta (mimo że nslookup działa).');
      console.error('   Rozwiązanie: DNS wymuszony w kodzie / VPN z pełnym tunelowaniem DNS.');
    }

    pool.end();
    process.exit(1);
  });
