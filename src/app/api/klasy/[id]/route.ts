import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload.config";
import { requireUserId, canAccessOwned, ownerIdOf } from "@/lib/api/guard";
import { errorResponse } from "@/lib/api/respond";
import { NotFoundError } from "@/lib/errors";
import type { Id, Ref, RozkladRow } from "@/types/domain";

type KlasaDetailRow = {
  id: Id;
  nazwa?: string;
  profil?: string | null;
  rok_szkolny?: string;
  numer_klasy?: number;
  wlasciciel?: Id | { id: Id } | null;
  typ_szkoly?: Ref<{ nazwa?: string; liczba_lat?: number }>;
};
type TypSzkolyRow = { id: Id; nazwa?: string; liczba_lat?: number };
type SiatkaMeinRow = { id: Id; przedmiot?: Ref; godziny_w_cyklu?: number };

function nazwaOf(ref: Ref<{ nazwa?: string }> | null | undefined): string {
  return typeof ref === "object" && ref !== null ? (ref.nazwa ?? "") : "";
}

/**
 * GET /api/klasy/[id] - szczegóły klasy z przedmiotami i zgodnością MEiN.
 * Tylko klasa należąca do zalogowanego konta (lub legacy bez właściciela).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(request);
    const { id: klasaId } = await params;
    const payload = await getPayload({ config });

    const klasa = (await payload
      .findByID({ collection: "klasy", id: klasaId })
      .catch(() => null)) as KlasaDetailRow | null;
    if (!klasa || !canAccessOwned(klasa.wlasciciel, userId)) {
      throw new NotFoundError("Klasa", klasaId);
    }

    const typRef = klasa.typ_szkoly;
    const typId = typeof typRef === "object" && typRef ? typRef.id : typRef;
    const typSzkoly = (await payload
      .findByID({ collection: "typy-szkol", id: typId as Id })
      .catch(() => null)) as TypSzkolyRow | null;
    if (!typSzkoly) {
      throw new NotFoundError("Typ szkoły", String(typId));
    }

    const rozkladGodzin = await payload.find({
      collection: "rozkład-godzin",
      where: { klasa: { equals: klasaId } },
      limit: 1000,
      depth: 2,
    });
    const siatkiMein = await payload.find({
      collection: "siatki-godzin-mein",
      where: { typ_szkoly: { equals: typSzkoly.id } },
      limit: 1000,
      depth: 1,
    });
    const siatki = siatkiMein.docs as unknown as SiatkaMeinRow[];

    const przedmiotyZgodnosc = (rozkladGodzin.docs as unknown as RozkladRow[]).map(
      (rozklad) => {
        const przedmiotId = ownerIdOf(rozklad.przedmiot);
        const wymaganiaMein = siatki.find(
          (s) => ownerIdOf(s.przedmiot) === przedmiotId
        );
        const wymaganeGodziny = wymaganiaMein?.godziny_w_cyklu || 0;
        const planowaneGodziny = rozklad.godziny_roczne || 0;
        const roznica = planowaneGodziny - wymaganeGodziny;
        const procentRealizacji =
          wymaganeGodziny > 0
            ? Math.round((planowaneGodziny / wymaganeGodziny) * 100)
            : 0;
        let status = "OK";
        if (roznica < 0) status = "BRAK";
        else if (roznica > 0) status = "NADWYŻKA";

        const nauczyciel = rozklad.nauczyciel;
        return {
          przedmiot: { id: przedmiotId, nazwa: nazwaOf(rozklad.przedmiot) },
          nauczyciel: nauczyciel
            ? {
                id: ownerIdOf(nauczyciel),
                imie:
                  typeof nauczyciel === "object" ? (nauczyciel.imie ?? "") : "",
                nazwisko:
                  typeof nauczyciel === "object"
                    ? (nauczyciel.nazwisko ?? "")
                    : "",
              }
            : null,
          godziny_tyg: rozklad.godziny_tyg || 0,
          godziny_roczne: planowaneGodziny,
          wymagane_mein: wymaganeGodziny,
          roznica,
          procent_realizacji: procentRealizacji,
          status,
        };
      }
    );

    const sumaGodzin = przedmiotyZgodnosc.reduce(
      (s, p) => s + p.godziny_roczne,
      0
    );
    const sumaWymaganych = przedmiotyZgodnosc.reduce(
      (s, p) => s + p.wymagane_mein,
      0
    );

    return NextResponse.json({
      klasa: {
        id: klasa.id,
        nazwa: klasa.nazwa,
        profil: klasa.profil,
        rok_szkolny: klasa.rok_szkolny,
        numer_klasy: klasa.numer_klasy,
        typ_szkoly: {
          id: typSzkoly.id,
          nazwa: typSzkoly.nazwa,
          liczba_lat: typSzkoly.liczba_lat,
        },
      },
      przedmioty: przedmiotyZgodnosc,
      podsumowanie: {
        suma_godzin: sumaGodzin,
        suma_wymaganych: sumaWymaganych,
        suma_roznica: sumaGodzin - sumaWymaganych,
        procent_realizacji:
          sumaWymaganych > 0
            ? Math.round((sumaGodzin / sumaWymaganych) * 100)
            : 0,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * DELETE /api/klasy/[id] - usuń klasę konta wraz z powiązaniami
 * (przydział godzin wyboru, rozkład godzin), by uniknąć błędu NOT NULL.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId(request);
    const { id: klasaId } = await params;
    const payload = await getPayload({ config });

    const klasa = (await payload
      .findByID({ collection: "klasy", id: klasaId })
      .catch(() => null)) as KlasaDetailRow | null;
    if (!klasa || !canAccessOwned(klasa.wlasciciel, userId)) {
      throw new NotFoundError("Klasa", klasaId);
    }

    const przydzialWybor = await payload.find({
      collection: "przydzial-godzin-wybor",
      where: { klasa: { equals: klasaId } },
      limit: 1000,
    });
    for (const doc of przydzialWybor.docs as unknown as { id: Id }[]) {
      await payload.delete({ collection: "przydzial-godzin-wybor", id: doc.id });
    }

    const rozkladGodzin = await payload.find({
      collection: "rozkład-godzin",
      where: { klasa: { equals: klasaId } },
      limit: 5000,
    });
    for (const doc of rozkladGodzin.docs as unknown as { id: Id }[]) {
      await payload.delete({ collection: "rozkład-godzin", id: doc.id });
    }

    await payload.delete({ collection: "klasy", id: klasaId });
    return NextResponse.json({ ok: true, deleted: klasaId });
  } catch (error) {
    return errorResponse(error);
  }
}
