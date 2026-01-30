'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PlanMeinTabela from '@/components/dashboard/PlanMeinTabela';
import type { 
  WynikAutomatycznegoRozdzialu, 
  Przypisanie, 
  BrakKadrowy 
} from '@/utils/automatycznyRozdzialGodzin';

interface TypSzkoly {
  id: string;
  nazwa: string;
}

interface KlasaItem {
  id: string;
  nazwa: string;
  rok_szkolny: string;
  typ_szkoly: { id: string; nazwa?: string } | null;
}

export default function PrzydzialPage() {
  const router = useRouter();
  const [typySzkol, setTypySzkol] = useState<TypSzkoly[]>([]);
  const [typSzkolyId, setTypSzkolyId] = useState<string>('');
  const [klasaList, setKlasaList] = useState<KlasaItem[]>([]);
  const [selectedRocznik, setSelectedRocznik] = useState<string>('');
  const [selectedLitera, setSelectedLitera] = useState<string>('');
  const [ladowanieKlas, setLadowanieKlas] = useState(false);
  const [ladowanie, setLadowanie] = useState(false);
  const [wynik, setWynik] = useState<WynikAutomatycznegoRozdzialu | null>(null);
  const [diagnostyka, setDiagnostyka] = useState<{
    liczbaKlas: number;
    liczbaKlasTylkoRok: number;
    liczbaSiatekMein: number;
    rokSzkolny: string;
    typSzkolyId: string | undefined;
    nazwyKlas: string[];
  } | null>(null);
  const [zapisywanie, setZapisywanie] = useState(false);
  const [komunikat, setKomunikat] = useState<{ typ: 'success' | 'error'; tekst: string } | null>(null);

  const roczniki = [...new Set(klasaList.map((k) => k.rok_szkolny))].filter(Boolean).sort();
  const literki = selectedRocznik
    ? [...new Set(klasaList.filter((k) => k.rok_szkolny === selectedRocznik).map((k) => k.nazwa))].filter(Boolean).sort()
    : [];
  const selectedClass = klasaList.find(
    (k) => k.rok_szkolny === selectedRocznik && k.nazwa === selectedLitera
  );
  const nazwaTypuSzkoly = typySzkol.find((t) => t.id === typSzkolyId)?.nazwa ?? '';

  useEffect(() => {
    pobierzTypySzkol();
  }, []);

  useEffect(() => {
    if (typSzkolyId) {
      setLadowanieKlas(true);
      setSelectedRocznik('');
      setSelectedLitera('');
      fetch(`/api/klasy?typSzkolyId=${typSzkolyId}`)
        .then((res) => res.json())
        .then((data) => {
          setKlasaList(data.klasy ?? []);
        })
        .catch(() => setKlasaList([]))
        .finally(() => setLadowanieKlas(false));
    } else {
      setKlasaList([]);
      setSelectedRocznik('');
      setSelectedLitera('');
    }
  }, [typSzkolyId]);

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
    // Używamy wybranego rocznika (zakres np. 2022-2027), żeby zapytanie o klasy znalazło rekordy w bazie
    const rokSzkolny = selectedRocznik || '2024/2025';
    if (!typSzkolyId) {
      setKomunikat({ typ: 'error', tekst: 'Wybierz typ szkoły' });
      return;
    }
    if (!selectedRocznik) {
      setKomunikat({ typ: 'error', tekst: 'Wybierz rocznik (zakres klas)' });
      return;
    }

    setLadowanie(true);
    setKomunikat(null);
    setWynik(null);
    setDiagnostyka(null);

    try {
      const response = await fetch('/api/przydzial/generuj', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          typSzkolyId: typSzkolyId || undefined,
          rokSzkolny,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Błąd przy generowaniu przydziału');
      }

      setWynik(data.wynik);
      setDiagnostyka(data.diagnostyka ?? null);
      setKomunikat({
        typ: 'success',
        tekst:
          data.wynik.przypisania.length > 0
            ? `Wygenerowano ${data.wynik.przypisania.length} przypisań`
            : 'Brak zadań do przydziału – sprawdź diagnostykę poniżej.',
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

    const rokSzkolnyDoZapisu = selectedRocznik || '2024/2025';
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
          rokSzkolny: rokSzkolnyDoZapisu,
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
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center sm:flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Generator przydziału godzin</h1>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={generujPrzydzial}
            disabled={ladowanie}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
          >
            {ladowanie ? 'Generowanie...' : 'Generuj przydział'}
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
          >
            ← Powrót do dashboardu
          </button>
        </div>
      </div>

      {/* Komunikat sukcesu/błędu – na górze */}
      {komunikat && (
        <div
          className={`p-4 rounded-lg ${
            komunikat.typ === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {komunikat.tekst}
        </div>
      )}

      {/* Selectory: typ szkoły, rocznik, klasa – jak na dashboardzie */}
      <div className="flex flex-col sm:flex-row sm:flex-nowrap sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
        <select
          value={typSzkolyId}
          onChange={(e) => setTypSzkolyId(e.target.value)}
          className="w-full sm:w-[200px] sm:min-w-0 border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-white"
        >
          <option value="">Wybierz typ szkoły</option>
          {typySzkol.map((typ) => (
            <option key={typ.id} value={typ.id}>{typ.nazwa}</option>
          ))}
        </select>
        <select
          value={selectedRocznik}
          onChange={(e) => {
            setSelectedRocznik(e.target.value);
            setSelectedLitera('');
          }}
          disabled={!typSzkolyId || ladowanieKlas || roczniki.length === 0}
          className="w-full sm:w-[140px] sm:min-w-0 border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-white disabled:opacity-60"
        >
          <option value="">Rocznik</option>
          {roczniki.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          value={selectedLitera}
          onChange={(e) => setSelectedLitera(e.target.value)}
          disabled={!selectedRocznik || literki.length === 0}
          className="w-full sm:w-[100px] sm:min-w-0 border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-white disabled:opacity-60"
        >
          <option value="">Klasa</option>
          {literki.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        {selectedClass && (
          <span className="text-sm text-gray-600 block sm:inline sm:whitespace-nowrap mt-1 sm:mt-0">
            Wybrana klasa: <strong>{selectedClass.nazwa}</strong> ({selectedRocznik})
          </span>
        )}
      </div>

      {/* Plan MEiN – te same opcje przydzielania co na dashboardzie */}
      {nazwaTypuSzkoly && (
        <div className="space-y-2 min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Plan ramowy MEiN – przydział godzin do wyboru i dyrektorskich</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Wybierz typ szkoły i klasę powyżej, aby przydzielać godziny do wyboru oraz godziny dyrektorskie. Następnie użyj przycisku „Generuj przydział” u góry.
          </p>
          <PlanMeinTabela
            nazwaTypuSzkoly={nazwaTypuSzkoly}
            klasaId={selectedClass?.id}
          />
        </div>
      )}

      {/* Diagnostyka gdy 0 przypisań */}
      {wynik && wynik.przypisania.length === 0 && diagnostyka && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-800 mb-2">🔍 Diagnostyka – dlaczego brak przypisań?</h3>
          <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
            <li>
              Klasy (typ + rocznik „{diagnostyka.rokSzkolny}”): <strong>{diagnostyka.liczbaKlas}</strong>
            </li>
            <li>
              Klasy tylko po roczniku (bez filtra typu): <strong>{diagnostyka.liczbaKlasTylkoRok}</strong>
            </li>
            <li>
              Siatki MEiN (obowiązujące dziś): <strong>{diagnostyka.liczbaSiatekMein}</strong>
            </li>
            {diagnostyka.nazwyKlas.length > 0 && (
              <li>Znalezione klasy: {diagnostyka.nazwyKlas.join(', ')}</li>
            )}
          </ul>
          <p className="text-sm text-amber-700 mt-3">
            {diagnostyka.liczbaKlas === 0 && diagnostyka.liczbaKlasTylkoRok === 0 && (
              <>Brak klas dla rocznika „{diagnostyka.rokSzkolny}”. Dodaj klasy w panelu admin (np. rok_szkolny: {diagnostyka.rokSzkolny}) lub wybierz inny rocznik w dropdownie.</>
            )}
            {diagnostyka.liczbaKlas === 0 && diagnostyka.liczbaKlasTylkoRok > 0 && (
              <>Są klasy dla tego rocznika, ale żadna nie ma wybranego typu szkoły. Sprawdź w panelu admin, czy klasy mają przypisany typ_szkoly zgodny z wybranym typem (ID: {diagnostyka.typSzkolyId}).</>
            )}
            {diagnostyka.liczbaKlas > 0 && diagnostyka.liczbaSiatekMein === 0 && (
              <>Są klasy, ale brak siatek MEiN. W panelu admin dodaj wpisy w kolekcji „siatki-godzin-mein” dla tego typu szkoły (data obowiązywania od w przeszłości, obowiązuje do puste lub w przyszłości).</>
            )}
            {diagnostyka.liczbaKlas > 0 && diagnostyka.liczbaSiatekMein > 0 && (
              <>Klasy i siatki są – możliwe że wszystkie godziny są już przypisane (istniejące przypisania w rozkład-godzin) lub typ_szkoly w siatkach nie zgadza się z typem klas. Sprawdź w panelu admin typ_szkoly w siatkach i w klasach.</>
            )}
          </p>
        </div>
      )}

      {/* Wyniki */}
      {wynik && (
        <div className="space-y-6">
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
        </div>
      )}
    </div>
  );
}
