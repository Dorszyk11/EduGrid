import crypto from 'crypto';

/**
 * Parametry pbkdf2 zgodne z Payload CMS (pbkdf2, 25000 iteracji, 512 bajtów, sha256).
 * Muszą pozostać identyczne, aby hashe utworzone przez Payload weryfikowały się tu i odwrotnie.
 */
const PBKDF2_ITERATIONS = 25000;
const PBKDF2_KEYLEN = 512;
const PBKDF2_DIGEST = 'sha256';

/**
 * Weryfikuje hasło względem hashu i soli z bazy (format Payload).
 * Porównanie stałoczasowe (crypto.timingSafeEqual) — bez wycieku przez czas wykonania.
 */
export function verifyPassword(password: string, salt: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST, (err, derived) => {
      if (err) return reject(err);
      let expected: Buffer;
      try {
        expected = Buffer.from(hash, 'hex');
      } catch {
        return resolve(false);
      }
      // Różna długość → timingSafeEqual rzuca; traktujemy jako brak dopasowania.
      if (expected.length !== derived.length) return resolve(false);
      resolve(crypto.timingSafeEqual(derived, expected));
    });
  });
}

/**
 * Tworzy hash i sól w formacie Payload (do testów / ścieżek pomocniczych).
 */
export function hashPassword(password: string, salt?: string): Promise<{ salt: string; hash: string }> {
  const usedSalt = salt ?? crypto.randomBytes(32).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, usedSalt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST, (err, derived) => {
      if (err) return reject(err);
      resolve({ salt: usedSalt, hash: derived.toString('hex') });
    });
  });
}
