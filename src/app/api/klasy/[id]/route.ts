import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload.config";
import { getCurrentUserId } from "@/utils/auth";

/**
 * GET /api/klasy/[id] - Pobierz szczegóły klasy z przedmiotami i zgodnością MEiN
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload({ config });
    const { id: klasaId } = await params;

    // Pobierz klasę
    const klasa = await payload.findByID({
      collection: "klasy",
      id: klasaId,
    });

    if (!klasa) {
      return NextResponse.json(
        { error: "Klasa nie znaleziona" },
        { status: 404 }
      );
    }

    // Pobierz typ szkoły
    const typSzkoly = await payload.findByID({
      collection: "typy-szkol",
      id:
        typeof klasa.typ_szkoly === "string"
          ? klasa.typ_szkoly
          : klasa.typ_szkoly.id,
    });

    // Pobierz rozkład godzin dla tej klasy
    const rozkladGodzin = await payload.find({
      collection: "rozkład-godzin",
      where: {
        klasa: {
          equals: klasaId,
        },
      },
      limit: 1000,
      depth: 2, // Pobierz powiązane przedmioty i nauczycieli
    });

    // Pobierz siatki MEiN dla typu szkoły
    const siatkiMein = await payload.find({
      collection: "siatki-godzin-mein",
      where: {
        typ_szkoly: {
          equals: typSzkoly.id,
        },
      },
      limit: 1000,
      depth: 1,
    });

    // Oblicz zgodność dla każdego przedmiotu
    const przedmiotyZgodnosc = rozkladGodzin.docs.map((rozklad: any) => {
      const przedmiot = rozklad.przedmiot;
      const przedmiotId =
        typeof przedmiot === "string" ? przedmiot : przedmiot.id;

      // Znajdź wymagania MEiN dla tego przedmiotu
      const wymaganiaMein = siatkiMein.docs.find((siatka: any) => {
        const siatkaPrzedmiotId =
          typeof siatka.przedmiot === "string"
            ? siatka.przedmiot
            : siatka.przedmiot.id;
        return siatkaPrzedmiotId === przedmiotId;
      });

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

      return {
        przedmiot: {
          id: przedmiotId,
          nazwa: typeof przedmiot === "string" ? przedmiot : przedmiot.nazwa,
        },
        nauczyciel: rozklad.nauczyciel
          ? {
              id:
                typeof rozklad.nauczyciel === "string"
                  ? rozklad.nauczyciel
                  : rozklad.nauczyciel.id,
              imie:
                typeof rozklad.nauczyciel === "string"
                  ? ""
                  : rozklad.nauczyciel.imie,
              nazwisko:
                typeof rozklad.nauczyciel === "string"
                  ? ""
                  : rozklad.nauczyciel.nazwisko,
            }
          : null,
        godziny_tyg: rozklad.godziny_tyg || 0,
        godziny_roczne: planowaneGodziny,
        wymagane_mein: wymaganeGodziny,
        roznica,
        procent_realizacji: procentRealizacji,
        status,
      };
    });

    // Oblicz sumy
    const sumaGodzin = przedmiotyZgodnosc.reduce(
      (sum, p) => sum + p.godziny_roczne,
      0
    );
    const sumaWymaganych = przedmiotyZgodnosc.reduce(
      (sum, p) => sum + p.wymagane_mein,
      0
    );
    const sumaRoznica = sumaGodzin - sumaWymaganych;

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
        suma_roznica: sumaRoznica,
        procent_realizacji:
          sumaWymaganych > 0
            ? Math.round((sumaGodzin / sumaWymaganych) * 100)
            : 0,
      },
    });
  } catch (error) {
    console.error("Błąd przy pobieraniu danych klasy:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Nieznany błąd",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/klasy/[id] - Usuń klasę
 * Najpierw usuwa powiązane rekordy (przydział godzin wyboru, rozkład godzin),
 * żeby uniknąć błędu NOT NULL przy klasa_id.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getPayload({ config });
    const { id: klasaId } = await params;

    const klasa = await payload.findByID({
      collection: "klasy",
      id: klasaId,
    });

    if (!klasa) {
      return NextResponse.json(
        { error: "Klasa nie znaleziona" },
        { status: 404 }
      );
    }

    const userId = await getCurrentUserId(_request);
    if (!userId) {
      return NextResponse.json(
        { error: "Musisz być zalogowany, aby usunąć klasę." },
        { status: 401 }
      );
    }
    const wlascicielId = (klasa as { wlasciciel?: string | number | null }).wlasciciel;
    if (wlascicielId != null && String(wlascicielId) !== userId) {
      return NextResponse.json(
        { error: "Tylko konto, które utworzyło tę klasę, może ją usunąć." },
        { status: 403 }
      );
    }

    // Usuń rekordy przydziału godzin wyboru powiązane z tą klasą (klasa_id NOT NULL)
    const przydzialWybor = await payload.find({
      collection: "przydzial-godzin-wybor",
      where: { klasa: { equals: klasaId } },
      limit: 1000,
    });
    for (const doc of przydzialWybor.docs) {
      await payload.delete({
        collection: "przydzial-godzin-wybor",
        id: doc.id,
      });
    }

    // Usuń rekordy rozkładu godzin powiązane z tą klasą
    const rozkladGodzin = await payload.find({
      collection: "rozkład-godzin",
      where: { klasa: { equals: klasaId } },
      limit: 5000,
    });
    for (const doc of rozkladGodzin.docs) {
      await payload.delete({
        collection: "rozkład-godzin",
        id: doc.id,
      });
    }

    await payload.delete({
      collection: "klasy",
      id: klasaId,
    });

    return NextResponse.json({ ok: true, deleted: klasaId });
  } catch (error) {
    console.error("Błąd przy usuwaniu klasy:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nieznany błąd" },
      { status: 500 }
    );
  }
}
