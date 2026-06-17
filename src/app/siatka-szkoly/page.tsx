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
        <h1 className="font-display text-3xl font-bold text-ink tracking-tight">Siatka godzin szkoły</h1>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 bg-line hover:bg-line-strong rounded"
        >
          ← Powrót do dashboardu
        </button>
      </div>

      {/* Formularz filtrowania */}
      <div className="bg-surface rounded shadow-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-soft mb-1">
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
            <label className="block text-sm font-medium text-ink-soft mb-1">
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
        <div className="bg-danger-bg border border-danger text-danger px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Tabela siatki */}
      {ladowanie ? (
        <div className="bg-surface rounded shadow-card p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-line rounded w-1/4"></div>
            <div className="h-4 bg-line rounded w-1/2"></div>
            <div className="h-4 bg-line rounded w-3/4"></div>
          </div>
        </div>
      ) : dane && dane.macierz.length > 0 ? (
        <div className="bg-surface rounded shadow-card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Siatka godzin ({przefiltrowanaMacierz.length} przedmiotów, {dane.klasy.length} klas)
            </h2>
            <div className="text-sm text-ink-soft">
              Rok szkolny: {dane.rokSzkolny}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-line">
              <thead>
                <tr className="bg-surface-2">
                  <th className="border border-line px-4 py-3 text-left text-xs font-medium text-ink-soft uppercase sticky left-0 bg-surface-2 z-10">
                    Przedmiot
                  </th>
                  {dane.klasy.map(klasa => (
                    <th
                      key={klasa.id}
                      className="border border-line px-3 py-2 text-center text-xs font-medium text-ink-soft"
                      title={klasa.profil || undefined}
                    >
                      <div>{klasa.nazwa}</div>
                      {klasa.profil && (
                        <div className="text-xs text-ink-faint font-normal">{klasa.profil}</div>
                      )}
                    </th>
                  ))}
                  <th className="border border-line px-4 py-3 text-center text-xs font-medium text-ink-soft bg-surface-2">
                    Suma
                  </th>
                </tr>
              </thead>
              <tbody>
                {przefiltrowanaMacierz.map((wiersz, index) => (
                  <tr key={wiersz.przedmiotId} className={index % 2 === 0 ? 'bg-surface' : 'bg-surface-2'}>
                    <td className="border border-line px-4 py-3 text-sm font-medium sticky left-0 bg-inherit z-10">
                      <Link
                        href={`/przedmioty/${wiersz.przedmiotId}`}
                        className="text-accent hover:text-accent-strong hover:underline"
                      >
                        {wiersz.przedmiotNazwa}
                      </Link>
                    </td>
                    {wiersz.klasy.map((klasa) => (
                      <td
                        key={klasa.klasaId}
                        className={`border border-line px-3 py-2 text-center text-sm ${
                          klasa.godzinyTygodniowo === 0
                            ? 'text-ink-faint bg-surface-2'
                            : 'text-ink'
                        }`}
                      >
                        {klasa.godzinyTygodniowo > 0 ? (
                          <div>
                            <div className="font-medium">{klasa.godzinyTygodniowo}h/tyg</div>
                            <div className="text-xs text-ink-faint">{klasa.godzinyRoczne}h/rok</div>
                            {klasa.nauczycielNazwa && (
                              <div className="text-xs text-accent mt-1">
                                {klasa.nauczycielNazwa}
                                {klasa.liczbaNauczycieli > 1 && (
                                  <span className="text-ink-faint"> +{klasa.liczbaNauczycieli - 1}</span>
                                )}
                              </div>
                            )}
                            {klasa.liczbaNauczycieli === 0 && (
                              <div className="text-xs text-danger mt-1">Brak nauczyciela</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-ink-faint">-</span>
                        )}
                      </td>
                    ))}
                    <td className="border border-line px-4 py-3 text-center text-sm font-medium bg-surface-2">
                      <div>{wiersz.sumaGodzinTygodniowo}h/tyg</div>
                      <div className="text-xs text-ink-faint">{wiersz.sumaGodzinRocznie}h/rok</div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-2 font-semibold">
                  <td className="border border-line px-4 py-3 text-sm">Suma</td>
                  {dane.klasy.map(klasa => {
                    const suma = przefiltrowanaMacierz.reduce(
                      (sum, w) => sum + (w.klasy.find(k => k.klasaId === klasa.id)?.godzinyTygodniowo || 0),
                      0
                    );
                    return (
                      <td key={klasa.id} className="border border-line px-3 py-2 text-center text-sm">
                        {suma}h/tyg
                      </td>
                    );
                  })}
                  <td className="border border-line px-4 py-3 text-center text-sm bg-line">
                    {przefiltrowanaMacierz.reduce((sum, w) => sum + w.sumaGodzinTygodniowo, 0)}h/tyg
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : dane && dane.macierz.length === 0 ? (
        <div className="bg-surface rounded shadow-card p-6 text-center text-ink-faint">
          Brak danych do wyświetlenia. Upewnij się, że wybrano typ szkoły i że istnieją przypisania godzin.
        </div>
      ) : null}
    </div>
  );
}
