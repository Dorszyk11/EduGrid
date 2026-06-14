import { NextResponse } from "next/server";
import { DomainError, domainErrorToHttpStatus } from "@/lib/errors";

/**
 * Spójna odpowiedź błędu dla tras API.
 * - DomainError → kod + komunikat domenowy (bezpieczny do pokazania klientowi).
 * - Każdy inny błąd → 500 z generycznym komunikatem (bez wycieku szczegółów),
 *   pełny błąd trafia do logów serwera.
 */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof DomainError) {
    return NextResponse.json(
      { error: error.message },
      { status: domainErrorToHttpStatus(error) }
    );
  }
  console.error("Nieobsłużony błąd API:", error);
  return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
}
