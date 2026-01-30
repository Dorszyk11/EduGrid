'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface TypSzkoly {
  id: string;
  nazwa: string;
}

interface Klasa {
  id: string;
  nazwa: string;
  profil: string | null;
}

interface Przedmiot {
  id: string;
  nazwa: string;
}

interface MacierzKlasa {
  klasaId: string;
  klasaNazwa: string;
  godzinyTygodniowo: number;
  godzinyRoczne: number;
  nauczycielId?: string;
  nauczycielNazwa?: string;
  liczbaNauczycieli: number;
}

interface MacierzWiersz {
  przedmiotId: string;
  przedmiotNazwa: string;
  klasy: MacierzKlasa[];
  sumaGodzinTygodniowo: number;
  sumaGodzinRocznie: number;
}

interface SiatkaSzkolyData {
  typSzkolyId: string;
  rokSzkolny: string;
  klasy: Klasa[];
  przedmioty: Przedmiot[];
  macierz: MacierzWiersz[];
}

export default function SiatkaSzkolyPage() {
  const router = useRouter();
  const [typySzkol, setTypySzkol] = useState<TypSzkoly[]>([]);
  const [typSzkolyId, setTypSzkolyId] = useState<string>('');
  const [rokSzkolny, setRokSzkolny] = useState<string>('2024/2025');
  const [dane, setDane] = useState<SiatkaSzkolyData | null>(null);
  const [ladowanie, setLadowanie] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pokazTylkoZPrzypisaniami, setPokazTylkoZPrzypisaniami] = useState(false);

  useEffect(() => {
    pobierzTypySzkol();
  }, []);

  useEffect(() => {
    if (typSzkolyId) {
      pobierzSiatke();
    } else {
      setDane(null);
    }
  }, [typSzkolyId, rokSzkolny]);

  const pobierzTypySzkol = async () => {
    try {
      const response = await fetch('/api/typy-szkol', { cache: 'no-store' });
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data?.typySzkol ?? []);
      setTypySzkol(list.map((t: { id: string; nazwa?: string }) => ({ id: String(t.id), nazwa: t.nazwa ?? 'Brak nazwy' })));
    } catch (error) {
      console.error('Błąd przy pobieraniu typów szkół:', error);
    }
  };

  const pobierzSiatke = async () => {
    if (!typSzkolyId) return;

    setLadowanie(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/siatka-szkoly?typSzkolyId=${typSzkolyId}&rokSzkolny=${rokSzkolny}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd przy pobieraniu danych');
      }

      const data = await response.json();
      setDane(data);
    } catch (error) {
      console.error('Błąd:', error);
      setError(error instanceof Error ? error.message : 'Nieznany błąd');
    } finally {
      setLadowanie(false);
    }
  };

  const przefiltrowanaMacierz = pokazTylkoZPrzypisaniami
    ? dane?.macierz.filter(w => w.sumaGodzinTygodniowo > 0) || []
    : dane?.macierz || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Siatka godzin szkoły</h1>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
        >
          ← Powrót do dashboardu
        </button>
      </div>

      {/* Formularz filtrowania */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Typ szkoły *
            </label>
            <select
              value={typSzkolyId}
              onChange={(e) => setTypSzkolyId(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Wybierz typ szkoły</option>
              {typySzkol.map(typ => (
                <option key={typ.id} value={typ.id}>{typ.nazwa}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rok szkolny
            </label>
            <input
              type="text"
              value={rokSzkolny}
              onChange={(e) => setRokSzkolny(e.target.value)}
              placeholder="2024/2025"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="flex items-center pt-6">
            <input
              type="checkbox"
              id="pokazTylkoZPrzypisaniami"
              checked={pokazTylkoZPrzypisaniami}
              onChange={(e) => setPokazTylkoZPrzypisaniami(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="pokazTylkoZPrzypisaniami" className="text-sm">
              Pokaż tylko przedmioty z przypisaniami
            </label>
          </div>
        </div>
      </div>

      {/* Komunikat błędu */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Tabela siatki */}
      {ladowanie ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      ) : dane && dane.macierz.length > 0 ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Siatka godzin ({przefiltrowanaMacierz.length} przedmiotów, {dane.klasy.length} klas)
            </h2>
            <div className="text-sm text-gray-600">
              Rok szkolny: {dane.rokSzkolny}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase sticky left-0 bg-gray-100 z-10">
                    Przedmiot
                  </th>
                  {dane.klasy.map(klasa => (
                    <th
                      key={klasa.id}
                      className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700"
                      title={klasa.profil || undefined}
                    >
                      <div>{klasa.nazwa}</div>
                      {klasa.profil && (
                        <div className="text-xs text-gray-500 font-normal">{klasa.profil}</div>
                      )}
                    </th>
                  ))}
                  <th className="border border-gray-300 px-4 py-3 text-center text-xs font-medium text-gray-700 bg-gray-50">
                    Suma
                  </th>
                </tr>
              </thead>
              <tbody>
                {przefiltrowanaMacierz.map((wiersz, index) => (
                  <tr key={wiersz.przedmiotId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-4 py-3 text-sm font-medium sticky left-0 bg-inherit z-10">
                      <Link
                        href={`/przedmioty/${wiersz.przedmiotId}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {wiersz.przedmiotNazwa}
                      </Link>
                    </td>
                    {wiersz.klasy.map((klasa) => (
                      <td
                        key={klasa.klasaId}
                        className={`border border-gray-300 px-3 py-2 text-center text-sm ${
                          klasa.godzinyTygodniowo === 0
                            ? 'text-gray-400 bg-gray-100'
                            : 'text-gray-900'
                        }`}
                      >
                        {klasa.godzinyTygodniowo > 0 ? (
                          <div>
                            <div className="font-medium">{klasa.godzinyTygodniowo}h/tyg</div>
                            <div className="text-xs text-gray-500">{klasa.godzinyRoczne}h/rok</div>
                            {klasa.nauczycielNazwa && (
                              <div className="text-xs text-blue-600 mt-1">
                                {klasa.nauczycielNazwa}
                                {klasa.liczbaNauczycieli > 1 && (
                                  <span className="text-gray-500"> +{klasa.liczbaNauczycieli - 1}</span>
                                )}
                              </div>
                            )}
                            {klasa.liczbaNauczycieli === 0 && (
                              <div className="text-xs text-red-600 mt-1">Brak nauczyciela</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    ))}
                    <td className="border border-gray-300 px-4 py-3 text-center text-sm font-medium bg-gray-50">
                      <div>{wiersz.sumaGodzinTygodniowo}h/tyg</div>
                      <div className="text-xs text-gray-500">{wiersz.sumaGodzinRocznie}h/rok</div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-semibold">
                  <td className="border border-gray-300 px-4 py-3 text-sm">Suma</td>
                  {dane.klasy.map(klasa => {
                    const suma = przefiltrowanaMacierz.reduce(
                      (sum, w) => sum + (w.klasy.find(k => k.klasaId === klasa.id)?.godzinyTygodniowo || 0),
                      0
                    );
                    return (
                      <td key={klasa.id} className="border border-gray-300 px-3 py-2 text-center text-sm">
                        {suma}h/tyg
                      </td>
                    );
                  })}
                  <td className="border border-gray-300 px-4 py-3 text-center text-sm bg-gray-200">
                    {przefiltrowanaMacierz.reduce((sum, w) => sum + w.sumaGodzinTygodniowo, 0)}h/tyg
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : dane && dane.macierz.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          Brak danych do wyświetlenia. Upewnij się, że wybrano typ szkoły i że istnieją przypisania godzin.
        </div>
      ) : null}
    </div>
  );
}
