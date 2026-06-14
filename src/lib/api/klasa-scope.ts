import type { Payload } from "@/types/payload";
import { ownerScope, canAccessOwned } from "./ownership";
import { NotFoundError } from "@/lib/errors";
import type { Id } from "@/types/domain";

/**
 * Pobiera klasę i sprawdza dostęp konta (własna lub legacy bez właściciela).
 * Rzuca NotFoundError dla cudzej/nieistniejącej — bez ujawniania, że id istnieje.
 */
export async function assertKlasaAccess(
  payload: Payload,
  klasaId: Id,
  userId: string
): Promise<{ id: Id; wlasciciel?: unknown }> {
  const klasa = (await payload
    .findByID({ collection: "klasy", id: klasaId })
    .catch(() => null)) as { id: Id; wlasciciel?: unknown } | null;
  if (!klasa || !canAccessOwned(klasa.wlasciciel, userId)) {
    throw new NotFoundError("Klasa", String(klasaId));
  }
  return klasa;
}

/**
 * Zbiór id rekordów kolekcji należących do konta (własne + legacy bez właściciela).
 * Używane do izolacji kolekcji-dzieci (np. rozkład-godzin po klasie/nauczycielu).
 */
export async function ownedIds(
  payload: Payload,
  collection: "klasy" | "nauczyciele",
  userId: string
): Promise<Set<string>> {
  const res = await payload.find({
    collection,
    where: ownerScope(userId),
    limit: 2000,
    depth: 0,
  });
  return new Set((res.docs as Array<{ id: Id }>).map((d) => String(d.id)));
}
