'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';

type TypRaportu = 'zgodnosc-mein' | 'obciazenia' | 'braki-kadrowe' | 'arkusz-organizacyjny';

interface RaportZgodnoscMein {
  wyniki: Array<{
    przedmiot: { id: string; nazwa: string };
    klasa: { id: string; nazwa: string };
    wymagane: { godziny_w_cyklu: number };
    planowane: { godziny_w_cyklu: number };
    roznica: { roznica: number; procent_realizacji: number };
    status: 'OK' | 'BRAK' | 'NADWYŻKA';
  }>;
  statystyki: {
    lacznie: number;
    zgodne: number;
    zBrakami: number;
    zNadwyzkami: number;
    sredniProcent: number;
  };
}

interface RaportObciazenia {
  obciazenia: Array<{
    nauczycielId: string;
    nauczycielNazwa: string;
    aktualneObciazenie: number;
    maxObciazenie: number;
    procentWykorzystania: number;
    przypisania: number;
  }>;
  statystyki: {
    lacznie: number;
    przekroczone: number;
    pelne: number;
    niskie: number;
    srednieObciazenie: number;
  };
}

interface RaportBrakiKadrowe {
  braki: Array<{
    przedmiotId: string;
    przedmiotNazwa: string;
    klasaId: string;
    klasaNazwa: string;
    godzinyTygodniowo: number;
    powod: string;
    dostepniNauczyciele: number;
    sugerowaneRozwiazania: string[];
  }>;
  statystyki: {
    lacznie: number;
    laczneGodziny: number;
    wymaganeEtaty: number;
  };
}

export default function RaportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const typSzkolyId = searchParams.get('typSzkolyId') || '';
  const rokSzkolny = searchParams.get('rokSzkolny') || '2024/2025';
  
  const [typ, setTyp] = useState<TypRaportu | null>(null);
  const [dane, setDane] = useState<any>(null);
  const [ladowanie, setLadowanie] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Pobierz typ z URL
    const typZUrl = pathname?.split('/').pop() as TypRaportu;
    if (typZUrl && ['zgodnosc-mein', 'obciazenia', 'braki-kadrowe', 'arkusz-organizacyjny'].includes(typZUrl)) {
      setTyp(typZUrl);
      
      if (typSzkolyId) {
        pobierzRaport(typZUrl);
      } else {
        setLadowanie(false);
      }
    }
  }, [pathname, typSzkolyId, rokSzkolny]);

  const pobierzRaport = async (typRaportu: TypRaportu) => {
    if (!typSzkolyId && typRaportu !== 'obciazenia') {
      setError('Wybierz typ szkoły');
      setLadowanie(false);
      return;
    }

    setLadowanie(true);
    setError(null);

    try {
      let url = '';
      switch (typRaportu) {
        case 'zgodnosc-mein':
          url = `/api/dashboard/zgodnosc-mein?typSzkolyId=${typSzkolyId}&rokSzkolny=${rokSzkolny}`;
          break;
        case 'obciazenia':
          url = `/api/dashboard/obciazenie-nauczycieli?rokSzkolny=${rokSzkolny}`;
          break;
        case 'braki-kadrowe':
          url = `/api/dashboard/braki-kadrowe?typSzkolyId=${typSzkolyId}&rokSzkolny=${rokSzkolny}`;
          break;
        default:
          setError('Nieznany typ raportu');
          return;
      }

      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd przy pobieraniu raportu');
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

  const eksportujDoXLS = async () => {
    if (!typSzkolyId) return;

    const url = `/api/export/xls?typSzkolyId=${typSzkolyId}&rokSzkolny=${rokSzkolny}&typ=${
      typ === 'zgodnosc-mein' ? 'zgodnosc-mein' : 'arkusz-organizacyjny'
    }`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Błąd przy eksporcie');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `Raport_${typ}_${rokSzkolny.replace('/', '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Błąd eksportu:', error);
      alert('Błąd przy eksporcie do XLS');
    }
  };

  if (ladowanie) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
        <button
          onClick={() => router.push('/raporty')}
          className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
        >
          ← Powrót do raportów
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          {typ === 'zgodnosc-mein' && 'Raport zgodności MEiN'}
          {typ === 'obciazenia' && 'Raport obciążeń nauczycieli'}
          {typ === 'braki-kadrowe' && 'Raport braków kadrowych'}
          {typ === 'arkusz-organizacyjny' && 'Arkusz organizacyjny'}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={eksportujDoXLS}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            📥 Eksportuj do XLS
          </button>
          <button
            onClick={() => router.push('/raporty')}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            ← Powrót
          </button>
        </div>
      </div>

      {/* Raport zgodności MEiN */}
      {typ === 'zgodnosc-mein' && dane && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Statystyki</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-gray-600">Łącznie</p>
                <p className="text-2xl font-bold">{dane.statystyki.lacznie}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Zgodne</p>
                <p className="text-2xl font-bold text-green-600">{dane.statystyki.zgodne}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Z brakami</p>
                <p className="text-2xl font-bold text-red-600">{dane.statystyki.zBrakami}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Z nadwyżkami</p>
                <p className="text-2xl font-bold text-yellow-600">{dane.statystyki.zNadwyzkami}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Średni % realizacji</p>
                <p className="text-2xl font-bold">{dane.statystyki.sredniProcent.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Szczegóły ({dane.wyniki.length})</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Przedmiot</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Klasa</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Wymagane</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Planowane</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Różnica</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Realizacja</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dane.wyniki.map((w: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link href={`/przedmioty/${w.przedmiot.id}`} className="text-blue-600 hover:underline">
                          {w.przedmiot.nazwa}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link href={`/klasy/${w.klasa.id}`} className="text-blue-600 hover:underline">
                          {w.klasa.nazwa}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">{w.wymagane.godziny_w_cyklu}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">{w.planowane.godziny_w_cyklu}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-center font-medium ${
                        w.roznica.roznica < 0 ? 'text-red-600' : w.roznica.roznica > 0 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {w.roznica.roznica > 0 ? '+' : ''}{w.roznica.roznica}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">{w.roznica.procent_realizacji.toFixed(1)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          w.status === 'OK' ? 'bg-green-100 text-green-800' :
                          w.status === 'BRAK' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {w.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Raport obciążeń */}
      {typ === 'obciazenia' && dane && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Statystyki</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-gray-600">Łącznie</p>
                <p className="text-2xl font-bold">{dane.statystyki.lacznie}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Przekroczone</p>
                <p className="text-2xl font-bold text-red-600">{dane.statystyki.przekroczone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Pełne</p>
                <p className="text-2xl font-bold text-green-600">{dane.statystyki.pelne}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Niskie</p>
                <p className="text-2xl font-bold text-yellow-600">{dane.statystyki.niskie}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Średnie obciążenie</p>
                <p className="text-2xl font-bold">{dane.statystyki.srednieObciazenie.toFixed(1)}h</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Obciążenia nauczycieli ({dane.obciazenia.length})</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nauczyciel</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Obciążenie</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Max</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Wykorzystanie</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Przypisania</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dane.obciazenia.map((obc: any) => (
                    <tr key={obc.nauczycielId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link href={`/nauczyciele/${obc.nauczycielId}`} className="text-blue-600 hover:underline font-medium">
                          {obc.nauczycielNazwa}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium">{obc.aktualneObciazenie}h</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">{obc.maxObciazenie}h</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">{obc.procentWykorzystania.toFixed(1)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">{obc.przypisania || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          obc.aktualneObciazenie > obc.maxObciazenie ? 'bg-red-100 text-red-800' :
                          obc.procentWykorzystania >= 90 ? 'bg-green-100 text-green-800' :
                          obc.procentWykorzystania < 50 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {obc.aktualneObciazenie > obc.maxObciazenie ? 'Przekroczone' :
                           obc.procentWykorzystania >= 90 ? 'Pełne' :
                           obc.procentWykorzystania < 50 ? 'Niskie' : 'OK'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Raport braków kadrowych */}
      {typ === 'braki-kadrowe' && dane && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Statystyki</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Łącznie braków</p>
                <p className="text-2xl font-bold text-red-600">{dane.statystyki.lacznie}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Łączne godziny</p>
                <p className="text-2xl font-bold">{dane.statystyki.laczneGodziny}h</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Wymagane etaty</p>
                <p className="text-2xl font-bold">{dane.statystyki.wymaganeEtaty}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-red-600">Braki kadrowe ({dane.braki.length})</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Przedmiot</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Klasa</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Godziny/tyg</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Powód</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Dostępni</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sugestie</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dane.braki.map((brak: any, index: number) => (
                    <tr key={index} className="hover:bg-red-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link href={`/przedmioty/${brak.przedmiotId}`} className="text-blue-600 hover:underline font-medium">
                          {brak.przedmiotNazwa}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link href={`/klasy/${brak.klasaId}`} className="text-blue-600 hover:underline">
                          {brak.klasaNazwa}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium">{brak.godzinyTygodniowo}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{brak.powod}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">{brak.dostepniNauczyciele}</td>
                      <td className="px-6 py-4 text-sm">
                        <ul className="list-disc list-inside text-gray-600">
                          {brak.sugerowaneRozwiazania?.slice(0, 2).map((s: string, i: number) => (
                            <li key={i} className="text-xs">{s}</li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
