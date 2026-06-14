/**
 * Czyste helpery izolacji per-konto — bez zależności od auth/jose, więc w pełni
 * testowalne jednostkowo. `guard.ts` re-eksportuje je razem z `requireUserId`.
 */
import type { Where } from "payload";

/**
 * ID właściciela w formacie oczekiwanym przez relację Payload→users w Postgresie
 * (liczba dla numerycznych ID, w innym wypadku string).
 */
export function toOwnerId(userId: string): number | string {
  return /^\d+$/.test(userId) ? Number(userId) : userId;
}

/** Normalizuje pole relacji (id albo obiekt z depth) do stringa lub null. */
export function ownerIdOf(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "object") {
    const id = (value as { id?: unknown }).id;
    return id == null ? null : String(id);
  }
  return String(value);
}

/** True, gdy rekord należy do konta lub jest rekordem legacy (bez właściciela). */
export function canAccessOwned(ownerValue: unknown, userId: string): boolean {
  const owner = ownerIdOf(ownerValue);
  return owner === null || owner === userId;
}

/**
 * Klauzula `where` Payload ograniczająca wyniki do konta zalogowanego użytkownika
 * (lub rekordów legacy bez właściciela). Pole `wlasciciel` musi istnieć w kolekcji.
 */
export function ownerScope(userId: string): Where {
  return {
    or: [
      { wlasciciel: { equals: toOwnerId(userId) } },
      { wlasciciel: { exists: false } },
    ],
  };
}
