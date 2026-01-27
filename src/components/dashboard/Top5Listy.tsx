'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Top5ListyProps {
  typSzkolyId: string;
  rokSzkolny: string;
}

export default function Top5Listy({ typSzkolyId, rokSzkolny }: Top5ListyProps) {
  const [dane, setDane] = useState<{
    przedmiotyZBrakiem?: Array<{ przedmiotId: string; przedmiotNazwa: string; brakGodzin: number; klasaNazwa: string }>;
    nauczycieleZObciazeniem?: Array<{ nauczycielId: string; nauczycielNazwa: string; obciazenie: number; procent: number }>;
    klasyNiezgodne?: Array<{ klasaId: string; klasaNazwa: string; procentRealizacji: number; brakGodzin: number }>;
  }>({});
  const [ladowanie, setLadowanie] = useState(true);

  useEffect(() => {
    if (typSzkolyId) {
      pobierzDane();
    }
  }, [typSzkolyId, rokSzkolny]);

  const pobierzDane = async () => {
    setLadowanie(true);
    try {
      const [zgodnosc, obciazenia, braki] = await Promise.all([
        fetch(`/api/dashboard/zgodnosc-mein?typSzkolyId=${typSzkolyId}&rokSzkolny=${rokSzkolny}`),
        fetch(`/api/dashboard/obciazenie-nauczycieli?rokSzkolny=${rokSzkolny}`),
        fetch(`/api/dashboard/braki-kadrowe?typSzkolyId=${typSzkolyId}&rokSzkolny=${rokSzkolny}`),
      ]);

      const [zgodnoscData, obciazeniaData, brakiData] = await Promise.all([
        zgodnosc.json(),
        obciazenia.json(),
        braki.json(),
      ]);

      // Top 5 przedmiotów z brakami
      const przedmiotyZBrakiem = zgodnoscData.wyniki
        ?.filter((w: any) => w.status === 'BRAK' && w.roznica.roznica < 0)
        .map((w: any) => ({
          przedmiotId: w.przedmiot.id,
          przedmiotNazwa: w.przedmiot.nazwa,
          brakGodzin: Math.abs(w.roznica.roznica),
          klasaNazwa: w.klasa.nazwa,
        }))
        .sort((a: any, b: any) => b.brakGodzin - a.brakGodzin)
        .slice(0, 5) || [];

      // Top 5 nauczycieli z największym obciążeniem
      const nauczycieleZObciazeniem = obciazeniaData.obciazenia
        ?.sort((a: any, b: any) => b.aktualneObciazenie - a.aktualneObciazenie)
        .slice(0, 5)
        .map((o: any) => ({
          nauczycielId: o.nauczycielId,
          nauczycielNazwa: o.nauczycielNazwa,
          obciazenie: o.aktualneObciazenie,
          procent: Math.round(o.procentWykorzystania * 100) / 100,
        })) || [];

      // Top 5 klas najbliżej niezgodności (najniższy procent realizacji)
      const klasyNiezgodne = zgodnoscData.wyniki
        ?.map((w: any) => ({
          klasaId: w.klasa.id,
          klasaNazwa: w.klasa.nazwa,
          procentRealizacji: w.roznica.procent_realizacji,
          brakGodzin: w.status === 'BRAK' ? Math.abs(w.roznica.roznica) : 0,
        }))
        .filter((k: any) => k.procentRealizacji < 100)
        .sort((a: any, b: any) => a.procentRealizacji - b.procentRealizacji)
        .slice(0, 5) || [];

      setDane({
        przedmiotyZBrakiem,
        nauczycieleZObciazeniem,
        klasyNiezgodne,
      });
    } catch (error) {
      console.error('Błąd przy pobieraniu Top 5:', error);
    } finally {
      setLadowanie(false);
    }
  };

  if (ladowanie) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="h-4 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Top 5 przedmiotów z brakami */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-red-600">
          🔴 Top 5 przedmiotów z brakami
        </h3>
        {dane.przedmiotyZBrakiem && dane.przedmiotyZBrakiem.length > 0 ? (
          <div className="space-y-2">
            {dane.przedmiotyZBrakiem.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-red-50 rounded hover:bg-red-100"
              >
                <div className="flex-1">
                  <Link
                    href={`/przedmioty/${item.przedmiotId}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {item.przedmiotNazwa}
                  </Link>
                  <p className="text-xs text-gray-500">{item.klasaNazwa}</p>
                </div>
                <span className="text-sm font-bold text-red-600">
                  -{item.brakGodzin}h
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Brak przedmiotów z brakami</p>
        )}
      </div>

      {/* Top 5 nauczycieli z obciążeniem */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-orange-600">
          📊 Top 5 nauczycieli z obciążeniem
        </h3>
        {dane.nauczycieleZObciazeniem && dane.nauczycieleZObciazeniem.length > 0 ? (
          <div className="space-y-2">
            {dane.nauczycieleZObciazeniem.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-orange-50 rounded hover:bg-orange-100"
              >
                <div className="flex-1">
                  <Link
                    href={`/nauczyciele/${item.nauczycielId}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {item.nauczycielNazwa}
                  </Link>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold">{item.obciazenie}h</span>
                  <p className="text-xs text-gray-500">{item.procent}%</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Brak danych</p>
        )}
      </div>

      {/* Top 5 klas najbliżej niezgodności */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-yellow-600">
          ⚠️ Klasy najbliżej niezgodności
        </h3>
        {dane.klasyNiezgodne && dane.klasyNiezgodne.length > 0 ? (
          <div className="space-y-2">
            {dane.klasyNiezgodne.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-yellow-50 rounded hover:bg-yellow-100"
              >
                <div className="flex-1">
                  <Link
                    href={`/klasy/${item.klasaId}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {item.klasaNazwa}
                  </Link>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold">{item.procentRealizacji.toFixed(1)}%</span>
                  {item.brakGodzin > 0 && (
                    <p className="text-xs text-red-600">-{item.brakGodzin}h</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Wszystkie klasy zgodne</p>
        )}
      </div>
    </div>
  );
}
