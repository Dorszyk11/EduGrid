import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import * as XLSX from 'xlsx';

/**
 * GET /api/export/xls - Eksport danych do arkusza organizacyjnego (XLS)
 * 
 * Parametry:
 * - typSzkolyId: ID typu szkoły
 * - rokSzkolny: Rok szkolny (np. 2024/2025)
 * - typ: typ eksportu ('arkusz-organizacyjny' | 'zgodnosc-mein' | 'obciazenia-nauczycieli')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typSzkolyId = searchParams.get('typSzkolyId');
    const rokSzkolny = searchParams.get('rokSzkolny') || '2024/2025';
    const typ = searchParams.get('typ') || 'arkusz-organizacyjny';

    if (!typSzkolyId) {
      return NextResponse.json(
        { error: 'typSzkolyId jest wymagany' },
        { status: 400 }
      );
    }

    const payload = await getPayload({ config });

    // Pobierz typ szkoły
    const typSzkoly = await payload.findByID({
      collection: 'typy-szkol',
      id: typSzkolyId,
    });

    // Pobierz klasy
    const klasy = await payload.find({
      collection: 'klasy',
      where: {
        typ_szkoly: {
          equals: typSzkolyId,
        },
        rok_szkolny: {
          equals: rokSzkolny,
        },
      },
      limit: 1000,
      depth: 1,
    });

    // Pobierz rozkład godzin
    const rozkladGodzin = await payload.find({
      collection: 'rozkład-godzin',
      where: {
        rok_szkolny: {
          equals: rokSzkolny,
        },
      },
      limit: 10000,
      depth: 2, // Pobierz powiązane przedmioty, klasy, nauczycieli
    });

    // Przygotuj dane do eksportu w zależności od typu
    let workbook: XLSX.WorkBook;
    let filename: string;

    if (typ === 'arkusz-organizacyjny') {
      // Arkusz organizacyjny - główny eksport
      workbook = XLSX.utils.book_new();

      // Arkusz 1: Rozkład godzin (przedmiot × klasa × nauczyciel)
      const rozkladData = rozkladGodzin.docs.map((rozklad: any) => {
        const przedmiot = typeof rozklad.przedmiot === 'object' ? rozklad.przedmiot : null;
        const klasa = typeof rozklad.klasa === 'object' ? rozklad.klasa : null;
        const nauczyciel = typeof rozklad.nauczyciel === 'object' ? rozklad.nauczyciel : null;

        return {
          'Klasa': klasa?.nazwa || 'Brak',
          'Przedmiot': przedmiot?.nazwa || 'Brak',
          'Nauczyciel': nauczyciel ? `${nauczyciel.imie} ${nauczyciel.nazwisko}` : 'Brak',
          'Godziny tygodniowo': rozklad.godziny_tyg || 0,
          'Godziny rocznie': rozklad.godziny_roczne || 0,
          'Rok szkolny': rozklad.rok_szkolny || rokSzkolny,
        };
      });

      const ws1 = XLSX.utils.json_to_sheet(rozkladData);
      XLSX.utils.book_append_sheet(workbook, ws1, 'Rozkład godzin');

      // Arkusz 2: Podsumowanie per klasa
      const podsumowanieKlas = klasy.docs.map((klasa: any) => {
        const rozkladKlasy = rozkladGodzin.docs.filter((r: any) => {
          const rKlasa = typeof r.klasa === 'object' ? r.klasa : null;
          return rKlasa?.id === klasa.id;
        });

        const sumaGodzin = rozkladKlasy.reduce((sum: number, r: any) => sum + (r.godziny_roczne || 0), 0);
        const liczbaPrzedmiotow = new Set(
          rozkladKlasy.map((r: any) => {
            const przedmiot = typeof r.przedmiot === 'object' ? r.przedmiot : null;
            return przedmiot?.id;
          }).filter(Boolean)
        ).size;

        return {
          'Klasa': klasa.nazwa,
          'Profil': klasa.profil || 'Brak',
          'Liczba przedmiotów': liczbaPrzedmiotow,
          'Suma godzin rocznie': sumaGodzin,
          'Rok szkolny': klasa.rok_szkolny,
        };
      });

      const ws2 = XLSX.utils.json_to_sheet(podsumowanieKlas);
      XLSX.utils.book_append_sheet(workbook, ws2, 'Podsumowanie klas');

      // Arkusz 3: Obciążenie nauczycieli
      const nauczyciele = await payload.find({
        collection: 'nauczyciele',
        where: {
          aktywny: {
            equals: true,
          },
        },
        limit: 1000,
      });

      const obciazeniaNauczycieli = nauczyciele.docs.map((nauczyciel: any) => {
        const rozkladNauczyciela = rozkladGodzin.docs.filter((r: any) => {
          const rNauczyciel = typeof r.nauczyciel === 'object' ? r.nauczyciel : null;
          return rNauczyciel?.id === nauczyciel.id;
        });

        const sumaGodzinTyg = rozkladNauczyciela.reduce((sum: number, r: any) => sum + (r.godziny_tyg || 0), 0);
        const sumaGodzinRocznie = rozkladNauczyciela.reduce((sum: number, r: any) => sum + (r.godziny_roczne || 0), 0);
        const maxObciazenie = nauczyciel.max_obciazenie || 18;
        const procentWykorzystania = maxObciazenie > 0 ? (sumaGodzinTyg / maxObciazenie) * 100 : 0;

        return {
          'Imię': nauczyciel.imie,
          'Nazwisko': nauczyciel.nazwisko,
          'Email': nauczyciel.email || '',
          'Max obciążenie': maxObciazenie,
          'Godziny tygodniowo': sumaGodzinTyg,
          'Godziny rocznie': sumaGodzinRocznie,
          'Procent wykorzystania': Math.round(procentWykorzystania * 100) / 100,
          'Etat': nauczyciel.etat || 'pełny',
        };
      });

      const ws3 = XLSX.utils.json_to_sheet(obciazeniaNauczycieli);
      XLSX.utils.book_append_sheet(workbook, ws3, 'Obciążenie nauczycieli');

      filename = `Arkusz_organizacyjny_${typSzkoly.nazwa}_${rokSzkolny.replace('/', '_')}.xlsx`;

    } else if (typ === 'zgodnosc-mein') {
      // Eksport zgodności z MEiN
      const { obliczZgodnoscDlaSzkoly } = await import('@/utils/zgodnoscMein');
      const zgodnosc = await obliczZgodnoscDlaSzkoly(payload, typSzkolyId, rokSzkolny);

      const zgodnoscData = zgodnosc.map((w: any) => ({
        'Przedmiot': w.przedmiot.nazwa,
        'Klasa': w.klasa.nazwa,
        'Wymagane MEiN': w.wymagane.godziny_w_cyklu || 0,
        'Planowane': w.planowane.godziny_w_cyklu || 0,
        'Różnica': w.roznica.roznica,
        'Procent realizacji': Math.round(w.roznica.procent_realizacji * 100) / 100,
        'Status': w.status,
      }));

      workbook = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(zgodnoscData);
      XLSX.utils.book_append_sheet(workbook, ws, 'Zgodność MEiN');
      filename = `Zgodnosc_MEiN_${typSzkoly.nazwa}_${rokSzkolny.replace('/', '_')}.xlsx`;

    } else {
      return NextResponse.json(
        { error: 'Nieznany typ eksportu' },
        { status: 400 }
      );
    }

    // Konwertuj do bufora
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Zwróć plik
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });

  } catch (error) {
    console.error('Błąd przy eksporcie do XLS:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Nieznany błąd',
      },
      { status: 500 }
    );
  }
}
