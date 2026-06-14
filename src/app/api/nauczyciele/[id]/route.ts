import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload.config";
import { requireUserId, canAccessOwned } from "@/lib/api/guard";
import { errorResponse } from "@/lib/api/respond";
import { NotFoundError } from "@/lib/errors";
import type {
  NauczycielRow,
  RozkladRow,
  KwalifikacjaRow,
  Ref,
} from "@/types/domain";

function refId(ref: Ref | null | undefined): string {
  if (ref == null) return "";
  return typeof ref === "object" ? String(ref.id) : String(ref);
}
function refNazwa(ref: Ref<{ nazwa?: string }> | null | undefined): string {
  return typeof ref === "object" && ref !== null ? (ref.nazwa ?? "") : "";
}

/**
 * GET /api/nauczyciele/[id] - szczegóły nauczyciela z obciążeniem.
 * Tylko nauczyciel należący do zalogowanego konta (lub legacy bez właściciela).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(request);
    const { id: nauczycielId } = await params;
    const payload = await getPayload({ config });

    const nauczyciel = (await payload
      .findByID({ collection: "nauczyciele", id: nauczycielId })
      .catch(() => null)) as NauczycielRow | null;
    if (!nauczyciel || !canAccessOwned(nauczyciel.wlasciciel, userId)) {
      throw new NotFoundError("Nauczyciel", nauczycielId);
    }

    const kwalifikacjeRes = await payload.find({
      collection: "kwalifikacje",
      where: { nauczyciel: { equals: nauczycielId } },
      limit: 100,
      depth: 1,
    });
    const rozkladRes = await payload.find({
      collection: "rozkład-godzin",
      where: { nauczyciel: { equals: nauczycielId } },
      limit: 1000,
      depth: 2,
    });

    const kwalifikacje = (
      kwalifikacjeRes.docs as unknown as KwalifikacjaRow[]
    ).map((k) => ({
      przedmiot: { id: refId(k.przedmiot), nazwa: refNazwa(k.przedmiot) },
      stopien: k.stopien,
      specjalizacja: k.specjalizacja,
    }));

    const obciazenie = (rozkladRes.docs as unknown as RozkladRow[]).map((r) => ({
      id: r.id,
      klasa: { id: refId(r.klasa), nazwa: refNazwa(r.klasa) },
      przedmiot: { id: refId(r.przedmiot), nazwa: refNazwa(r.przedmiot) },
      godziny_tyg: r.godziny_tyg || 0,
      godziny_roczne: r.godziny_roczne || 0,
      rok_szkolny: r.rok_szkolny,
      rok: r.rok ?? "",
    }));

    const sumaGodzinTyg = obciazenie.reduce((s, o) => s + o.godziny_tyg, 0);
    const sumaGodzinRocznie = obciazenie.reduce(
      (s, o) => s + o.godziny_roczne,
      0
    );
    const maxObciazenie = nauczyciel.max_obciazenie || 18;
    const roznica = sumaGodzinTyg - maxObciazenie;
    const procentObciazenia =
      maxObciazenie > 0 ? Math.round((sumaGodzinTyg / maxObciazenie) * 100) : 0;
    let status = "OK";
    if (roznica > 0) status = "PRZECIĄŻENIE";
    else if (sumaGodzinTyg < maxObciazenie * 0.5) status = "NIEDOCIĄŻENIE";

    return NextResponse.json({
      nauczyciel: {
        id: nauczyciel.id,
        imie: nauczyciel.imie,
        nazwisko: nauczyciel.nazwisko,
        email: nauczyciel.email,
        telefon: nauczyciel.telefon,
        max_obciazenie: maxObciazenie,
        etat: nauczyciel.etat,
        aktywny: nauczyciel.aktywny,
      },
      kwalifikacje,
      obciazenie,
      podsumowanie: {
        suma_godzin_tyg: sumaGodzinTyg,
        suma_godzin_rocznie: sumaGodzinRocznie,
        max_obciazenie: maxObciazenie,
        roznica,
        procent_obciazenia: procentObciazenia,
        status,
        liczba_klas: new Set(obciazenie.map((o) => o.klasa.id)).size,
        liczba_przedmiotow: new Set(obciazenie.map((o) => o.przedmiot.id)).size,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * DELETE /api/nauczyciele/[id] - usuń nauczyciela należącego do konta.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(request);
    const { id } = await params;
    const payload = await getPayload({ config });

    const nauczyciel = (await payload
      .findByID({ collection: "nauczyciele", id })
      .catch(() => null)) as NauczycielRow | null;
    if (!nauczyciel || !canAccessOwned(nauczyciel.wlasciciel, userId)) {
      throw new NotFoundError("Nauczyciel", id);
    }

    await payload.delete({ collection: "nauczyciele", id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
