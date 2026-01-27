import { getPayload } from 'payload';
import config from '@/payload.config';
import { ParsedTableRow, MappedMeinData } from './types';
import {
  znajdzPrzedmiotPrzezMapowanie,
  znajdzTypSzkolyPrzezMapowanie,
} from '../mapowanieNazw';

/**
 * Mapuje sparsowane dane do struktury bazy danych
 * Wyszukuje przedmioty i typy szkół w bazie
 */
export async function mapToDatabaseStructure(
  parsedRows: ParsedTableRow[],
  defaultTypSzkolyId?: string,
  defaultRokSzkolny?: string
): Promise<MappedMeinData[]> {
  const payload = await getPayload({ config });
  const mapped: MappedMeinData[] = [];

  // Pobierz wszystkie przedmioty i typy szkół do cache
  const [przedmioty, typySzkol] = await Promise.all([
    payload.find({ collection: 'przedmioty', limit: 1000 }),
    payload.find({ collection: 'typy-szkol', limit: 100 }),
  ]);

  // Utwórz mapy dla szybkiego wyszukiwania
  const przedmiotyMap = new Map<string, string>();
  przedmioty.docs.forEach((p: any) => {
    const nazwa = p.nazwa?.toLowerCase() || '';
    przedmiotyMap.set(nazwa, p.id);
    // Dodaj też warianty nazwy (bez polskich znaków, skróty)
    if (p.kod_mein) {
      przedmiotyMap.set(p.kod_mein.toLowerCase(), p.id);
    }
  });

  const typySzkolMap = new Map<string, string>();
  typySzkol.docs.forEach((t: any) => {
    const nazwa = t.nazwa?.toLowerCase() || '';
    typySzkolMap.set(nazwa, t.id);
    if (t.kod_mein) {
      typySzkolMap.set(t.kod_mein.toLowerCase(), t.id);
    }
  });

  for (const row of parsedRows) {
    // Znajdź przedmiot w bazie (po nazwie)
    let przedmiotId = przedmiotyMap.get(row.przedmiot.toLowerCase());
    
    // Jeśli nie znaleziono, spróbuj mapowania nazw MEiN
    if (!przedmiotId) {
      przedmiotId = await znajdzPrzedmiotPrzezMapowanie(payload, row.przedmiot);
    }
    
    // Jeśli nadal nie znaleziono, spróbuj częściowego dopasowania
    if (!przedmiotId) {
      for (const [nazwa, id] of przedmiotyMap.entries()) {
        if (nazwa.includes(row.przedmiot.toLowerCase()) || 
            row.przedmiot.toLowerCase().includes(nazwa)) {
          przedmiotId = id;
          break;
        }
      }
    }
    
    if (!przedmiotId) {
      console.warn(`Nie znaleziono przedmiotu: ${row.przedmiot}`);
      // Opcjonalnie: utwórz nowy przedmiot
      // await createPrzedmiot(row.przedmiot);
      continue;
    }

    // Znajdź typ szkoły
    let typSzkolyId = defaultTypSzkolyId;
    if (row.typSzkoly) {
      typSzkolyId = typySzkolMap.get(row.typSzkoly.toLowerCase());
      
      // Jeśli nie znaleziono, spróbuj mapowania nazw MEiN
      if (!typSzkolyId) {
        typSzkolyId = await znajdzTypSzkolyPrzezMapowanie(payload, row.typSzkoly);
      }
      
      // Jeśli nadal nie znaleziono, spróbuj częściowego dopasowania
      if (!typSzkolyId) {
        for (const [nazwa, id] of typySzkolMap.entries()) {
          if (nazwa.includes(row.typSzkoly.toLowerCase()) || 
              row.typSzkoly.toLowerCase().includes(nazwa)) {
            typSzkolyId = id;
            break;
          }
        }
      }
    }
    
    if (!typSzkolyId) {
      console.warn(`Nie znaleziono typu szkoły: ${row.typSzkoly || 'domyślny'}`);
      continue;
    }

    // Mapuj dane
    mapped.push({
      przedmiotId,
      typSzkolyId,
      klasa: row.klasa,
      godziny_w_cyklu: row.godzinyWCyklu,
      godziny_tygodniowo_min: row.godzinyTygodniowo?.min,
      godziny_tygodniowo_max: row.godzinyTygodniowo?.max,
      obowiazkowe: row.obowiazkowe,
      data_obowiazywania_od: new Date().toISOString().split('T')[0], // Dziś
      data_obowiazywania_do: undefined,
    });
  }

  return mapped;
}
