import { getCurrentUserId } from "@/utils/auth";
import { AuthenticationError } from "@/lib/errors";

export { toOwnerId, ownerIdOf, canAccessOwned } from "./ownership";

/**
 * Zwraca ID zalogowanego konta albo rzuca AuthenticationError (→ 401).
 * Jedyne źródło tożsamości dla tras danych — używać na każdym endpoincie per-konto.
 */
export async function requireUserId(request: Request): Promise<string> {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    throw new AuthenticationError();
  }
  return userId;
}
