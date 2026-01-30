'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { 
  WynikAutomatycznegoRozdzialu, 
  Przypisanie, 
  BrakKadrowy 
} from '@/utils/automatycznyRozdzialGodzin';

interface TypSzkoly {
  id: string;
  nazwa: string;
}

export default function PrzydzialPage() {
  const router = useRouter();
  const [typySzkol, setTypySzkol] = useState<TypSzkoly[]>([]);
  const [typSzkolyId, setTypSzkolyId] = useState<string>('');
  const [rokSzkolny, setRokSzkolny] = useState<string>('2024/2025');
  const [parametry, setParametry] = useState({
    wymagajKwalifikacji: true,
    maksymalnePrzekroczenie: 0,
    preferujKontynuacje: true,
    minimalneObciazenie: 0,
  });
  const [ladowanie, setLadowanie] = useState(false);
  const [wynik, setWynik] = useState<WynikAutomatycznegoRozdzialu | null>(null);
  const [zapisywanie, setZapisywanie] = useState(false);
  const [komunikat, setKomunikat] = useState<{ typ: 'success' | 'error'; tekst: string } | null>(null);

  useEffect(() => {
    pobierzTypySzkol();
  }, []);

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

  const generujPrzydzial = async () => {
    if (!rokSzkolny) {
      setKomunikat({ typ: 'error', tekst: 'Wybierz rok szkolny' });
      return;
    }

    setLadowanie(true);
    setKomunikat(null);
    setWynik(null);

    try {
      const response = await fetch('/api/przydzial/generuj', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          typSzkolyId: typSzkolyId || undefined,
          rokSzkolny,
          ...parametry,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Błąd przy generowaniu przydziału');
      }

      setWynik(data.wynik);
      setKomunikat({
        typ: 'success',
        tekst: `Wygenerowano ${data.wynik.przypisania.length} przypisań`,
      });
    } catch (error) {
      console.error('Błąd:', error);
      setKomunikat({
        typ: 'error',
        tekst: error instanceof Error ? error.message : 'Nieznany błąd',
      });
    } finally {
      setLadowanie(false);
    }
  };

  const zapiszPrzydzial = async () => {
    if (!wynik || !wynik.przypisania.length) {
      setKomunikat({ typ: 'error', tekst: 'Brak przypisań do zapisania' });
      return;
    }

    setZapisywanie(true);
    setKomunikat(null);

    try {
      const response = await fetch('/api/przydzial/zapisz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          przypisania: wynik.przypisania,
          rokSzkolny,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Błąd przy zapisywaniu');
      }

      setKomunikat({
        typ: 'success',
        tekst: `Zapisano ${data.utworzone} przypisań${data.bledy > 0 ? ` (${data.bledy} błędów)` : ''}`,
      });

      // Odśwież wyniki po zapisaniu
      setTimeout(() => {
        generujPrzydzial();
      }, 1000);
    } catch (error) {
      console.error('Błąd:', error);
      setKomunikat({
        typ: 'error',
        tekst: error instanceof Error ? error.message : 'Nieznany błąd',
      });
    } finally {
      setZapisywanie(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Generator przydziału godzin</h1>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
        >
          ← Powrót do dashboardu
        </button>
      </div>

      {/* Formularz parametrów */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Parametry generowania</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Typ szkoły (opcjonalnie)
            </label>
            <select
              value={typSzkolyId}
              onChange={(e) => setTypSzkolyId(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Wszystkie typy</option>
              {typySzkol.map(typ => (
                <option key={typ.id} value={typ.id}>{typ.nazwa}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rok szkolny *
            </label>
            <input
              type="text"
              value={rokSzkolny}
              onChange={(e) => setRokSzkolny(e.target.value)}
              placeholder="2024/2025"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="wymagajKwalifikacji"
              checked={parametry.wymagajKwalifikacji}
              onChange={(e) => setParametry({ ...parametry, wymagajKwalifikacji: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="wymagajKwalifikacji" className="text-sm">
              Wymagaj kwalifikacji
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="preferujKontynuacje"
              checked={parametry.preferujKontynuacje}
              onChange={(e) => setParametry({ ...parametry, preferujKontynuacje: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="preferujKontynuacje" className="text-sm">
              Preferuj kontynuacje (nauczyciele już uczący przedmiotu)
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maksymalne przekroczenie obciążenia (godziny)
            </label>
            <input
              type="number"
              value={parametry.maksymalnePrzekroczenie}
              onChange={(e) => setParametry({ ...parametry, maksymalnePrzekroczenie: Number(e.target.value) })}
              min="0"
              step="0.5"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimalne obciążenie nauczyciela (godziny)
            </label>
            <input
              type="number"
              value={parametry.minimalneObciazenie}
              onChange={(e) => setParametry({ ...parametry, minimalneObciazenie: Number(e.target.value) })}
              min="0"
              step="0.5"
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={generujPrzydzial}
            disabled={ladowanie}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {ladowanie ? 'Generowanie...' : 'Generuj przydział'}
          </button>
        </div>
      </div>

      {/* Komunikat */}
      {komunikat && (
        <div
          className={`p-4 rounded ${
            komunikat.typ === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {komunikat.tekst}
        </div>
      )}

      {/* Wyniki */}
      {wynik && (
        <div className="space-y-6">
          {/* Statystyki */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Statystyki</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Łącznie zadań</p>
                <p className="text-2xl font-bold">{wynik.metryki.lacznieZadan}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Udane przypisania</p>
                <p className="text-2xl font-bold text-green-600">{wynik.metryki.udanePrzypisania}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Nieudane</p>
                <p className="text-2xl font-bold text-red-600">{wynik.metryki.nieudanePrzypisania}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Średnie obciążenie</p>
                <p className="text-2xl font-bold">{wynik.metryki.srednieObciazenie.toFixed(1)}h</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Współczynnik wyrównania</p>
                <p className="text-2xl font-bold">{(wynik.metryki.wspolczynnikWyrównania * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Ostrzeżenia */}
          {wynik.ostrzezenia.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Ostrzeżenia</h3>
              <ul className="list-disc list-inside space-y-1">
                {wynik.ostrzezenia.map((ostrzezenie, index) => (
                  <li key={index} className="text-yellow-700">{ostrzezenie}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Przypisania */}
          {wynik.przypisania.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  Przypisania ({wynik.przypisania.length})
                </h2>
                <button
                  onClick={zapiszPrzydzial}
                  disabled={zapisywanie}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                >
                  {zapisywanie ? 'Zapisywanie...' : 'Zapisz przypisania'}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Klasa</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Przedmiot</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nauczyciel</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Godziny/tyg</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Godziny/rok</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Powód</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {wynik.przypisania.map((przypisanie, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{przypisanie.klasaNazwa}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{przypisanie.przedmiotNazwa}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{przypisanie.nauczycielNazwa}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{przypisanie.godzinyTygodniowo}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{przypisanie.godzinyRoczne}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{przypisanie.powod}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Braki kadrowe */}
          {wynik.brakiKadrowe.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-red-600">
                Braki kadrowe ({wynik.brakiKadrowe.length})
              </h2>
              <div className="space-y-4">
                {wynik.brakiKadrowe.map((brak, index) => (
                  <div key={index} className="border border-red-200 rounded p-4 bg-red-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-red-800">
                          {brak.przedmiotNazwa} - {brak.klasaNazwa}
                        </h3>
                        <p className="text-sm text-red-600 mt-1">
                          {brak.godzinyTygodniowo} godzin tygodniowo
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{brak.powod}</p>
                        {brak.sugerowaneRozwiazania.length > 0 && (
                          <ul className="list-disc list-inside mt-2 text-sm text-gray-700">
                            {brak.sugerowaneRozwiazania.map((rozwiazanie, i) => (
                              <li key={i}>{rozwiazanie}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {brak.dostepniNauczyciele} dostępnych nauczycieli
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Statystyki obciążeń */}
          {wynik.statystykiObciazenia.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Obciążenia nauczycieli</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nauczyciel</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Przed</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Po</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Różnica</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wykorzystanie</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Przypisania</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {wynik.statystykiObciazenia.map((stat, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{stat.nauczycielNazwa}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{stat.maxObciazenie}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{stat.przedObciazenie.toFixed(1)}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          stat.poObciazeniu > stat.maxObciazenie ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {stat.poObciazeniu.toFixed(1)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                          stat.roznica > 0 ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          {stat.roznica > 0 ? '+' : ''}{stat.roznica.toFixed(1)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {stat.procentWykorzystania.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">{stat.przypisania}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
