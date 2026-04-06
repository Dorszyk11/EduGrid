import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload.config";
import { ROK_SZKOLNY_WSZYSTKIE } from "@/lib/siatkaSzkoly";
import { pobierzMapeGodzinZPlanuIPrzydzialu } from "@/utils/godzinyPlanIPrzydzial";

function najnowszyRokSzkolny(lata: string[]): string {
  return [...lata].sort((a, b) => b.localeCompare(a, "pl"))[0] ?? "";
}

/**
 * Dla trybu „wszystkie lata”: z przypisań tej samej klasy i przedmiotu zostaw tylko wpisy
 * z najnowszego roku szkolnego (żeby nie sumować wielokrotnie tych samych zajęć).
 */
function przydzialyDlaNajnowszegoRoku(
  przypisania: any[]
): any[] {
  if (przypisania.length === 0) return [];
  const lata = przypisania
    .map((r: any) => r.rok_szkolny)
    .filter((x: unknown): x is string => typeof x === "string");
  const najnowszy = najnowszyRokSzkolny(lata);
  if (!najnowszy) return przypisania;
  return przypisania.filter((r: any) => r.rok_szkolny === najnowszy);
}

/**
 * GET /api/siatka-szkoly - Pobiera dane siatki szkoły w formacie tabelarycznym (przedmiot × klasa)
 *
 * Parametry:
 * - typSzkolyId: ID typu szkoły
 * - rokSzkolny: Rok szkolny (np. 2024/2025) lub „wszystkie” — wtedy wszystkie aktywne oddziały
 *   typu szkoły i dla każdej pary (klasa, przedmiot) używany jest najnowszy rok z bazy
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const typSzkolyId = searchParams.get("typSzkolyId");
    const rokSzkolnyRaw = searchParams.get("rokSzkolny");
    const rokSzkolny =
      rokSzkolnyRaw === null || rokSzkolnyRaw === ""
        ? "2024/2025"
        : rokSzkolnyRaw;
    const klasaId = searchParams.get("klasaId") || null;
    const trybWszystkieLata = rokSzkolny === ROK_SZKOLNY_WSZYSTKIE;

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

    // Rok z parametru (np. "2024/2025" → 2024) – do filtrowania klas po zakresie (poza trybem „wszystkie”)
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

    // Filtruj klasy: w trybie „wszystkie” — każdy aktywny oddział typu; inaczej po zakresie cyklu / roku
    let klasyFiltered = trybWszystkieLata
      ? klasyWszystkie.docs.filter((k: any) => Boolean(k.rok_szkolny))
      : klasyWszystkie.docs.filter((k: any) => {
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

    // Pobierz rozkład godzin (jeden rok albo wszystkie lata z bazy)
    const rozkladGodzin = await payload.find({
      collection: "rozkład-godzin",
      ...(trybWszystkieLata
        ? {}
        : {
            where: {
              rok_szkolny: {
                equals: rokSzkolny,
              },
            },
          }),
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

    const GODZINY_NA_TYPOWY_ETAT = 18;
    const nauczycieleDlaPrzedmiotu = new Map<string, Set<string>>();
    const maxWpisowWDzialeDlaPrzedmiotu = new Map<string, number>();

    const mapaGodzinPlanPrzydzial = await pobierzMapeGodzinZPlanuIPrzydzialu(
      payload,
      klasy.docs as { id: string | number; nazwa?: string; numer_klasy?: number; rok_szkolny?: string }[],
      nazwaTypuSzkoly
    );

    // Utwórz macierz: przedmiot × klasa
    const macierz: Array<{
      przedmiotId: string;
      przedmiotNazwa: string;
      klasy: Array<{
        klasaId: string;
        klasaNazwa: string;
        godzinyTygodniowo: number;
        godzinyRoczne: number;
        godzinyWRozkladzie: number;
        godzinyZPlanuPrzydzialu: number;
        brakWRozkladzie: boolean;
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
        godzinyWRozkladzie: number;
        godzinyZPlanuPrzydzialu: number;
        brakWRozkladzie: boolean;
        nauczycielId?: string;
        nauczycielNazwa?: string;
        liczbaNauczycieli: number;
      }> = [];

      for (const klasa of klasy.docs) {
        const kluczPlan = `${klasa.id}__${przedmiot.id}`;
        const godzinyZPlanuPrzydzialu =
          mapaGodzinPlanPrzydzial.get(kluczPlan) ?? 0;

        // Znajdź wszystkie przypisania tego przedmiotu w tej klasie
        let przypisania = rozkladFiltrowany.filter((r: any) => {
          const rPrzedmiot =
            typeof r.przedmiot === "object" ? r.przedmiot : null;
          const rKlasa = typeof r.klasa === "object" ? r.klasa : null;
          return rPrzedmiot?.id === przedmiot.id && rKlasa?.id === klasa.id;
        });

        if (trybWszystkieLata) {
          przypisania = przydzialyDlaNajnowszegoRoku(przypisania);
        }

        const pid = String(przedmiot.id);
        if (!nauczycieleDlaPrzedmiotu.has(pid)) {
          nauczycieleDlaPrzedmiotu.set(pid, new Set());
        }
        const zbiorNaucz = nauczycieleDlaPrzedmiotu.get(pid)!;
        for (const r of przypisania) {
          const n = r.nauczyciel;
          const nid =
            typeof n === "object" && n?.id != null
              ? String(n.id)
              : n != null
                ? String(n)
                : "";
          if (nid) zbiorNaucz.add(nid);
        }

        const godzinyWRozkladzie = przypisania.reduce(
          (sum: number, r: any) => sum + (r.godziny_tyg || 0),
          0
        );
        const godzinyTygodniowo = Math.max(
          godzinyWRozkladzie,
          godzinyZPlanuPrzydzialu
        );
        const wpisyRozklad = przypisania.length;
        const efektywneWpisow =
          wpisyRozklad > 0 ? wpisyRozklad : godzinyZPlanuPrzydzialu > 0 ? 1 : 0;
        const popMax = maxWpisowWDzialeDlaPrzedmiotu.get(pid) ?? 0;
        maxWpisowWDzialeDlaPrzedmiotu.set(
          pid,
          Math.max(popMax, efektywneWpisow)
        );

        let sumaGodzinRocznie = przypisania.reduce(
          (sum: number, r: any) => sum + (r.godziny_roczne || 0),
          0
        );
        if (godzinyTygodniowo > godzinyWRozkladzie) {
          sumaGodzinRocznie += Math.round(
            (godzinyTygodniowo - godzinyWRozkladzie) * 30
          );
        }

        const brakWRozkladzie =
          godzinyTygodniowo > 0 && przypisania.length === 0;

        if (przypisania.length > 0) {
          const pierwszyNauczyciel = przypisania[0];
          const nauczyciel =
            typeof pierwszyNauczyciel.nauczyciel === "object"
              ? pierwszyNauczyciel.nauczyciel
              : null;

          klasyPrzedmiotu.push({
            klasaId: String(klasa.id),
            klasaNazwa: klasa.nazwa,
            godzinyTygodniowo,
            godzinyRoczne: sumaGodzinRocznie,
            godzinyWRozkladzie,
            godzinyZPlanuPrzydzialu,
            brakWRozkladzie,
            nauczycielId: nauczyciel?.id,
            nauczycielNazwa: nauczyciel
              ? `${nauczyciel.imie} ${nauczyciel.nazwisko}`
              : undefined,
            liczbaNauczycieli: przypisania.length,
          });
        } else {
          klasyPrzedmiotu.push({
            klasaId: String(klasa.id),
            klasaNazwa: klasa.nazwa,
            godzinyTygodniowo,
            godzinyRoczne: sumaGodzinRocznie,
            godzinyWRozkladzie: 0,
            godzinyZPlanuPrzydzialu,
            brakWRozkladzie,
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

    const zatrudnienieWgPrzedmiotu = macierz.map((w) => {
      const pid = w.przedmiotId;
      const roznychWRozkladzie = nauczycieleDlaPrzedmiotu.get(pid)?.size ?? 0;
      const maxWpisow = maxWpisowWDzialeDlaPrzedmiotu.get(pid) ?? 0;
      const oddzialyZZajeciami = w.klasy.filter(
        (k) => k.godzinyTygodniowo > 0
      ).length;
      const etatyZSumyGodzin =
        w.sumaGodzinTygodniowo > 0
          ? Math.ceil(w.sumaGodzinTygodniowo / GODZINY_NA_TYPOWY_ETAT)
          : 0;
      const sugerowanaPotrzebaNauczycieli = Math.max(
        etatyZSumyGodzin,
        maxWpisow
      );
      const brakujeNauczycieli = Math.max(
        0,
        sugerowanaPotrzebaNauczycieli - roznychWRozkladzie
      );

      return {
        przedmiotId: pid,
        przedmiotNazwa: w.przedmiotNazwa,
        sumaGodzinTygodniowo: w.sumaGodzinTygodniowo,
        sumaGodzinRocznie: w.sumaGodzinRocznie,
        oddzialyZZajeciami,
        roznychNauczycieliWRozkladzie: roznychWRozkladzie,
        maxRownoleglychWpisowWJednymOddziale: maxWpisow,
        etatyZSumyGodzin,
        sugerowanaPotrzebaNauczycieli,
        brakujeNauczycieli,
      };
    });

    zatrudnienieWgPrzedmiotu.sort((a, b) => {
      if (b.brakujeNauczycieli !== a.brakujeNauczycieli) {
        return b.brakujeNauczycieli - a.brakujeNauczycieli;
      }
      return b.sugerowanaPotrzebaNauczycieli - a.sugerowanaPotrzebaNauczycieli;
    });

    const wszyscyNauczycieleIds = new Set<string>();
    nauczycieleDlaPrzedmiotu.forEach((set) => {
      set.forEach((id) => wszyscyNauczycieleIds.add(id));
    });
    const naiwnaSumaPotrzebZPrzedmiotow = zatrudnienieWgPrzedmiotu
      .filter((z) => z.sumaGodzinTygodniowo > 0)
      .reduce((s, z) => s + z.sugerowanaPotrzebaNauczycieli, 0);
    const lacznaSumaGodzinTygodniowo = macierz.reduce(
      (s, w) => s + w.sumaGodzinTygodniowo,
      0
    );
    const roznychNauczycieliWRozkladzie = wszyscyNauczycieleIds.size;
    const laczoneRolePrzedmiotow = Math.max(
      0,
      naiwnaSumaPotrzebZPrzedmiotow - roznychNauczycieliWRozkladzie
    );

    const podsumowanieCalejSzkoly = {
      roznychNauczycieliWRozkladzie,
      lacznaSumaGodzinTygodniowo,
      naiwnaSumaPotrzebZPrzedmiotow,
      laczoneRolePrzedmiotow,
      minimalnaOsobZLacznychGodzin:
        lacznaSumaGodzinTygodniowo > 0
          ? Math.ceil(lacznaSumaGodzinTygodniowo / GODZINY_NA_TYPOWY_ETAT)
          : 0,
    };

    return NextResponse.json({
      typSzkolyId,
      rokSzkolny,
      trybWszystkieLata,
      liczbaLat,
      nazwaTypuSzkoly,
      godzinNaTypowyEtat: GODZINY_NA_TYPOWY_ETAT,
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
      zatrudnienieWgPrzedmiotu,
      podsumowanieCalejSzkoly,
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
