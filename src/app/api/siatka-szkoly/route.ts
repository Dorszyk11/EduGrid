import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload.config";

/**
 * GET /api/siatka-szkoly - Pobiera dane siatki szkoły w formacie tabelarycznym (przedmiot × klasa)
 *
 * Parametry:
 * - typSzkolyId: ID typu szkoły
 * - rokSzkolny: Rok szkolny (np. 2024/2025)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const typSzkolyId = searchParams.get("typSzkolyId");
    const rokSzkolny = searchParams.get("rokSzkolny") || "2024/2025";
    const klasaId = searchParams.get("klasaId") || null;

    if (!typSzkolyId) {
      return NextResponse.json(
        { error: "typSzkolyId jest wymagany" },
        { status: 400 }
      );
    }

    const payload = await getPayload({ config });

    // Pobierz typ szkoły (liczba_lat, nazwa – do nagłówka tabeli)
    const typSzkoly = await payload
      .findByID({
        collection: "typy-szkol",
        id: typSzkolyId,
      })
      .catch(() => null);

    const liczbaLat =
      typSzkoly && typeof typSzkoly === "object" && "liczba_lat" in typSzkoly
        ? (typSzkoly as { liczba_lat?: number }).liczba_lat
        : 0;
    const nazwaTypuSzkoly =
      typSzkoly && typeof typSzkoly === "object" && "nazwa" in typSzkoly
        ? String((typSzkoly as { nazwa?: string }).nazwa || "")
        : "";

    // Rok z parametru (np. "2024/2025" → 2024) – do filtrowania klas po zakresie
    const rokZParametru = (() => {
      const m = rokSzkolny.match(/^(\d{4})/);
      return m ? Number(m[1]) : new Date().getFullYear();
    })();

    // Pobierz wszystkie klasy danego typu (bez filtra roku)
    const klasyWszystkie = await payload.find({
      collection: "klasy",
      where: {
        and: [
          { typ_szkoly: { equals: typSzkolyId } },
          { aktywna: { equals: true } },
        ],
      },
      limit: 1000,
      depth: 1,
      sort: "nazwa",
    });

    // Filtruj klasy: zakres YYYY-YYYY (rok w środku) lub dokładne dopasowanie YYYY/YYYY
    let klasyFiltered = klasyWszystkie.docs.filter((k: any) => {
      const rs = k.rok_szkolny;
      if (!rs) return false;
      const rangeMatch = String(rs).match(/^(\d{4})-(\d{4})$/);
      if (rangeMatch) {
        const start = Number(rangeMatch[1]);
        const end = Number(rangeMatch[2]);
        return rokZParametru >= start && rokZParametru <= end;
      }
      return rs === rokSzkolny;
    });
    // Opcjonalnie: tylko jedna klasa (dla widoku „siatka dla jednej klasy”)
    if (klasaId) {
      klasyFiltered = klasyFiltered.filter(
        (k: any) => String(k.id) === String(klasaId)
      );
    }
    const klasy = { ...klasyWszystkie, docs: klasyFiltered };

    // Pobierz rozkład godzin dla tych klas
    const rozkladGodzin = await payload.find({
      collection: "rozkład-godzin",
      where: {
        and: [
          {
            rok_szkolny: {
              equals: rokSzkolny,
            },
          },
        ],
      },
      limit: 10000,
      depth: 2, // Pobierz powiązane przedmioty, klasy, nauczycieli
    });

    // Filtruj tylko rozkłady dla klas z wybranego typu szkoły
    const klasaIds = klasy.docs.map((k) => k.id);
    const rozkladFiltrowany = rozkladGodzin.docs.filter((r: any) => {
      const rKlasa = typeof r.klasa === "object" ? r.klasa : null;
      return rKlasa && klasaIds.includes(rKlasa.id);
    });

    // Pobierz wszystkie przedmioty (aktywne)
    const przedmioty = await payload.find({
      collection: "przedmioty",
      where: {
        aktywny: {
          equals: true,
        },
      },
      limit: 1000,
      sort: "nazwa",
    });

    // Utwórz macierz: przedmiot × klasa
    const macierz: Array<{
      przedmiotId: string;
      przedmiotNazwa: string;
      klasy: Array<{
        klasaId: string;
        klasaNazwa: string;
        godzinyTygodniowo: number;
        godzinyRoczne: number;
        nauczycielId?: string;
        nauczycielNazwa?: string;
        liczbaNauczycieli: number;
      }>;
      sumaGodzinTygodniowo: number;
      sumaGodzinRocznie: number;
    }> = [];

    for (const przedmiot of przedmioty.docs) {
      const klasyPrzedmiotu: Array<{
        klasaId: string;
        klasaNazwa: string;
        godzinyTygodniowo: number;
        godzinyRoczne: number;
        nauczycielId?: string;
        nauczycielNazwa?: string;
        liczbaNauczycieli: number;
      }> = [];

      for (const klasa of klasy.docs) {
        // Znajdź wszystkie przypisania tego przedmiotu w tej klasie
        const przypisania = rozkladFiltrowany.filter((r: any) => {
          const rPrzedmiot =
            typeof r.przedmiot === "object" ? r.przedmiot : null;
          const rKlasa = typeof r.klasa === "object" ? r.klasa : null;
          return rPrzedmiot?.id === przedmiot.id && rKlasa?.id === klasa.id;
        });

        if (przypisania.length > 0) {
          const sumaGodzinTyg = przypisania.reduce(
            (sum: number, r: any) => sum + (r.godziny_tyg || 0),
            0
          );
          const sumaGodzinRocznie = przypisania.reduce(
            (sum: number, r: any) => sum + (r.godziny_roczne || 0),
            0
          );

          // Jeśli jest więcej niż jeden nauczyciel, pokaż pierwszego + liczbę
          const pierwszyNauczyciel = przypisania[0];
          const nauczyciel =
            typeof pierwszyNauczyciel.nauczyciel === "object"
              ? pierwszyNauczyciel.nauczyciel
              : null;

          klasyPrzedmiotu.push({
            klasaId: String(klasa.id),
            klasaNazwa: klasa.nazwa,
            godzinyTygodniowo: sumaGodzinTyg,
            godzinyRoczne: sumaGodzinRocznie,
            nauczycielId: nauczyciel?.id,
            nauczycielNazwa: nauczyciel
              ? `${nauczyciel.imie} ${nauczyciel.nazwisko}`
              : undefined,
            liczbaNauczycieli: przypisania.length,
          });
        } else {
          // Brak przypisania - pokaż 0
          klasyPrzedmiotu.push({
            klasaId: String(klasa.id),
            klasaNazwa: klasa.nazwa,
            godzinyTygodniowo: 0,
            godzinyRoczne: 0,
            liczbaNauczycieli: 0,
          });
        }
      }

      const sumaGodzinTygodniowo = klasyPrzedmiotu.reduce(
        (sum, k) => sum + k.godzinyTygodniowo,
        0
      );
      const sumaGodzinRocznie = klasyPrzedmiotu.reduce(
        (sum, k) => sum + k.godzinyRoczne,
        0
      );

      // Dodaj tylko jeśli są jakieś godziny lub jeśli chcemy pokazać wszystkie przedmioty
      macierz.push({
        przedmiotId: String(przedmiot.id),
        przedmiotNazwa: przedmiot.nazwa,
        klasy: klasyPrzedmiotu,
        sumaGodzinTygodniowo,
        sumaGodzinRocznie,
      });
    }

    return NextResponse.json({
      typSzkolyId,
      rokSzkolny,
      liczbaLat,
      nazwaTypuSzkoly,
      klasy: klasy.docs.map((k) => ({
        id: String(k.id),
        nazwa: k.nazwa,
        profil: k.profil || null,
        numerKlasy: (k as { numer_klasy?: number }).numer_klasy,
      })),
      przedmioty: przedmioty.docs.map((p) => ({
        id: String(p.id),
        nazwa: p.nazwa,
      })),
      macierz,
    });
  } catch (error) {
    console.error("Błąd przy pobieraniu siatki szkoły:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Nieznany błąd",
      },
      { status: 500 }
    );
  }
}
