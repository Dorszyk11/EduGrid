/**
 * Usuwa folder .next (bufor Next.js).
 * Uruchom: node scripts/clean-next.js
 * UWAGA: Zatrzymaj najpierw serwer deweloperski (pnpm dev)!
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const nextDir = path.join(__dirname, '..', '.next');
if (fs.existsSync(nextDir)) {
  try {
    if (process.platform === 'win32') {
      execSync(`rd /s /q "${nextDir.replace(/\//g, '\\')}"`, { stdio: 'inherit' });
    } else {
      execSync(`rm -rf "${nextDir}"`, { stdio: 'inherit' });
    }
    console.log('Usunięto folder .next');
  } catch (e) {
    console.error('Błąd usuwania .next');
    console.error('Zatrzymaj serwer dev (Ctrl+C) i spróbuj ponownie.');
    process.exit(1);
  }
} else {
  console.log('Folder .next nie istnieje');
}
