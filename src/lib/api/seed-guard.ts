/**
 * Bramka tras seedujących/resetujących (operacje destrukcyjne na bazie).
 * Fail-closed: dozwolone wyłącznie w dev/test albo gdy jawnie włączone ALLOW_DESTRUCTIVE_SEED=true.
 * Chroni przed odsłonięciem resetu/seedowania bazy przy błędnie ustawionym NODE_ENV
 * (np. preview/staging, gdzie poprzednia bramka `!== 'production'` przepuszczała żądania).
 */
export function seedDozwolony(): boolean {
  if (process.env.ALLOW_DESTRUCTIVE_SEED === 'true') return true;
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
}
