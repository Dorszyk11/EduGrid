import type { Payload } from '@/types/payload';

/**
 * Mapuje nazwę z MEiN na nazwę używaną w szkole
 * 
 * @param payload - Instancja Payload CMS
 * @param nazwaMein - Nazwa z dokumentacji MEiN
 * @param typ - Typ mapowania ('przedmiot' | 'typ_szkoly')
 * @returns Zmapowana nazwa lub null jeśli nie znaleziono
 */
export async function mapujNazweMein(
  payload: Payload,
  nazwaMein: string,
  typ: 'przedmiot' | 'typ_szkoly'
): Promise<string | null> {
  // Najpierw sprawdź dokładne dopasowanie
  const dokladne = await payload.find({
    collection: 'mapowania-nazw',
    where: {
      and: [
        {
          nazwa_mein: {
            equals: nazwaMein,
          },
        },
        {
          typ: {
            equals: typ,
          },
        },
        {
          aktywne: {
            equals: true,
          },
        },
      ],
    },
    limit: 1,
  });

  if (dokladne.docs.length > 0) {
    return dokladne.docs[0].nazwa_szkola;
  }

  // Sprawdź częściowe dopasowanie (case-insensitive)
  const czesciowe = await payload.find({
    collection: 'mapowania-nazw',
    where: {
      and: [
        {
          typ: {
            equals: typ,
          },
        },
        {
          aktywne: {
            equals: true,
          },
        },
      ],
    },
    limit: 100,
  });

  const nazwaMeinLower = nazwaMein.toLowerCase().trim();
  for (const mapowanie of czesciowe.docs) {
    const nazwaMeinMap = (mapowanie.nazwa_mein || '').toLowerCase().trim();
    if (nazwaMeinMap.includes(nazwaMeinLower) || nazwaMeinLower.includes(nazwaMeinMap)) {
      return mapowanie.nazwa_szkola;
    }
  }

  return null;
}

/**
 * Znajduje przedmiot w bazie używając mapowania nazw
 * 
 * @param payload - Instancja Payload CMS
 * @param nazwaMein - Nazwa z dokumentacji MEiN
 * @returns ID przedmiotu lub null
 */
export async function znajdzPrzedmiotPrzezMapowanie(
  payload: Payload,
  nazwaMein: string
): Promise<string | null> {
  // Najpierw spróbuj mapowania
  const zmapowanaNazwa = await mapujNazweMein(payload, nazwaMein, 'przedmiot');
  
  if (zmapowanaNazwa) {
    // Znajdź przedmiot po zmapowanej nazwie
    const przedmioty = await payload.find({
      collection: 'przedmioty',
      where: {
        nazwa: {
          equals: zmapowanaNazwa,
        },
      },
      limit: 1,
    });

    if (przedmioty.docs.length > 0) {
      return String(przedmioty.docs[0].id);
    }

    // Sprawdź czy mapowanie ma bezpośrednie powiązanie z przedmiotem
    const mapowanie = await payload.find({
      collection: 'mapowania-nazw',
      where: {
        and: [
          {
            nazwa_mein: {
              equals: nazwaMein,
            },
          },
          {
            typ: {
              equals: 'przedmiot',
            },
          },
          {
            aktywne: {
              equals: true,
            },
          },
        ],
      },
      depth: 1,
      limit: 1,
    });

    if (mapowanie.docs.length > 0 && mapowanie.docs[0].przedmiot) {
      const przedmiot = typeof mapowanie.docs[0].przedmiot === 'object' 
        ? mapowanie.docs[0].przedmiot 
        : null;
      return przedmiot?.id ? String(przedmiot.id) : null;
    }
  }

  return null;
}

/**
 * Znajduje typ szkoły w bazie używając mapowania nazw
 * 
 * @param payload - Instancja Payload CMS
 * @param nazwaMein - Nazwa z dokumentacji MEiN
 * @returns ID typu szkoły lub null
 */
export async function znajdzTypSzkolyPrzezMapowanie(
  payload: Payload,
  nazwaMein: string
): Promise<string | null> {
  // Najpierw spróbuj mapowania
  const zmapowanaNazwa = await mapujNazweMein(payload, nazwaMein, 'typ_szkoly');
  
  if (zmapowanaNazwa) {
    // Znajdź typ szkoły po zmapowanej nazwie
    const typySzkol = await payload.find({
      collection: 'typy-szkol',
      where: {
        nazwa: {
          equals: zmapowanaNazwa,
        },
      },
      limit: 1,
    });

    if (typySzkol.docs.length > 0) {
      return String(typySzkol.docs[0].id);
    }

    // Sprawdź czy mapowanie ma bezpośrednie powiązanie z typem szkoły
    const mapowanie = await payload.find({
      collection: 'mapowania-nazw',
      where: {
        and: [
          {
            nazwa_mein: {
              equals: nazwaMein,
            },
          },
          {
            typ: {
              equals: 'typ_szkoly',
            },
          },
          {
            aktywne: {
              equals: true,
            },
          },
        ],
      },
      depth: 1,
      limit: 1,
    });

    if (mapowanie.docs.length > 0 && mapowanie.docs[0].typ_szkoly) {
      const typSzkoly = typeof mapowanie.docs[0].typ_szkoly === 'object' 
        ? mapowanie.docs[0].typ_szkoly 
        : null;
      return typSzkoly?.id ? String(typSzkoly.id) : null;
    }
  }

  return null;
}
