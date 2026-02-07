'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PlanMeinTabela from '@/components/dashboard/PlanMeinTabela';

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
  const [typySzkol, setTypySzkol] = useState<TypSzkoly[]>([]);
  const [typSzkolyId, setTypSzkolyId] = useState<string>('');
  const [klasaList, setKlasaList] = useState<KlasaItem[]>([]);
  const [selectedRocznik, setSelectedRocznik] = useState<string>('');
  const [selectedLitera, setSelectedLitera] = useState<string>('');
  const [ladowanieTypow, setLadowanieTypow] = useState(true);
  const [ladowanieKlas, setLadowanieKlas] = useState(false);
  const [ladowanie, setLadowanie] = useState(false);
  const [resetowanie, setResetowanie] = useState(false);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const [komunikat, setKomunikat] = useState<{ typ: 'success' | 'error'; tekst: string } | null>(null);
  const [pokazPotwierdzenieReset, setPokazPotwierdzenieReset] = useState(false);
  const [trybPrzydzielGodzine, setTrybPrzydzielGodzine] = useState(false);
  const [trybPrzydzielDyrektor, setTrybPrzydzielDyrektor] = useState(false);
  const [trybUsunGodzine, setTrybUsunGodzine] = useState(false);
  const [trybDodajRozszerzenia, setTrybDodajRozszerzenia] = useState(false);
  const [trybPrzydzielGodzinyRozszerzen, setTrybPrzydzielGodzinyRozszerzen] = useState(false);
  const [trybPodzielNaGrupy, setTrybPodzielNaGrupy] = useState(false);

  const roczniki = [...new Set(klasaList.map((k) => k.rok_szkolny))].filter(Boolean).sort();
  const literki = selectedRocznik
    ? [...new Set(klasaList.filter((k) => k.rok_szkolny === selectedRocznik).map((k) => k.nazwa))].filter(Boolean).sort()
    : [];
  const selectedClass = klasaList.find(
    (k) => k.rok_szkolny === selectedRocznik && k.nazwa === selectedLitera
  );
  const nazwaTypuSzkoly = typySzkol.find((t) => t.id === typSzkolyId)?.nazwa ?? '';
  /** Tylko szkoła branżowa i technikum mają „Przydziel godzinę” (godziny do wyboru). */
  const maGodzinyDoWyboru = /branżowa|technikum/i.test(nazwaTypuSzkoly);
  /** Liceum i Technikum mają przedmioty w zakresie rozszerzonym (pula godzin rozszerzeń). */
  const maRozszerzenia = /liceum|technikum/i.test(nazwaTypuSzkoly);
  /** Szkoła podstawowa 1–3 nie ma przycisku „Generuj przydział”. */
  const ukryjGenerujPrzydzial = /podstawowa/i.test(nazwaTypuSzkoly) && /1-3|1–3|1—3/.test(nazwaTypuSzkoly);

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
    setLadowanieTypow(true);
    try {
      const response = await fetch('/api/typy-szkol', { cache: 'no-store' });
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data?.typySzkol ?? []);
      setTypySzkol(list.map((t: { id: string; nazwa?: string }) => ({ id: String(t.id), nazwa: t.nazwa ?? 'Brak nazwy' })));
    } catch (error) {
      console.error('Błąd przy pobieraniu typów szkół:', error);
    } finally {
      setLadowanieTypow(false);
    }
  };

  /** Przydziela godziny do wyboru do przedmiotów po kolei (po latach) i zapisuje do bazy. */
  const generujPrzydzial = async () => {
    if (!typSzkolyId) {
      setKomunikat({ typ: 'error', tekst: 'Wybierz typ szkoły' });
      return;
    }
    if (!selectedClass?.id) {
      setKomunikat({ typ: 'error', tekst: 'Wybierz klasę (rocznik i literę)' });
      return;
    }

    setLadowanie(true);
    setKomunikat(null);

    try {
      const klasaId = String(selectedClass.id);
      const typId = String(typSzkolyId);
      const url = `/api/przydzial/generuj?klasaId=${encodeURIComponent(klasaId)}&typSzkolyId=${encodeURIComponent(typId)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ klasaId, typSzkolyId: typId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Błąd przy generowaniu przydziału');
      }

      setKomunikat({
        typ: 'success',
        tekst: data.komunikat ?? 'Przydzielono godziny do wyboru do przedmiotów (po latach po kolei).',
      });
      setRefetchTrigger((t) => t + 1);
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

  /** Otwiera okno potwierdzenia resetu. */
  const otworzPotwierdzenieReset = () => {
    if (!selectedClass?.id) {
      setKomunikat({ typ: 'error', tekst: 'Wybierz klasę (rocznik i literę)' });
      return;
    }
    setPokazPotwierdzenieReset(true);
  };

  /** Wykonuje reset po potwierdzeniu (Tak). */
  const wykonajReset = async () => {
    if (!selectedClass?.id) return;
    setPokazPotwierdzenieReset(false);
    setResetowanie(true);
    setKomunikat(null);

    try {
      const response = await fetch('/api/przydzial-godzin-wybor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          klasaId: selectedClass.id,
          przydzial: {},
          doradztwo: {},
          dyrektor: {},
          rozszerzenia: [],
          rozszerzeniaGodziny: {},
          rozszerzeniaPrzydzial: {},
          podzialNaGrupy: {},
          przydzialGrupy: {},
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Błąd przy resetowaniu');
      }

      setKomunikat({
        typ: 'success',
        tekst: 'Przydział godzin dla tej klasy został zresetowany.',
      });
      setRefetchTrigger((t) => t + 1);
    } catch (error) {
      console.error('Błąd:', error);
      setKomunikat({
        typ: 'error',
        tekst: error instanceof Error ? error.message : 'Nieznany błąd',
      });
    } finally {
      setResetowanie(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center sm:flex-wrap">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Przydział</h1>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 flex-1 min-w-0">
          <Link
            href="/plany-mein"
            className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium border border-gray-300"
          >
            Zobacz plany MEiN
          </Link>
          {!ukryjGenerujPrzydzial && (
            <button
              onClick={generujPrzydzial}
              disabled={ladowanie || resetowanie || !typSzkolyId || !selectedClass?.id}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {ladowanie ? 'Generowanie...' : 'Generuj przydział'}
            </button>
          )}
          <button
            onClick={otworzPotwierdzenieReset}
            disabled={ladowanie || resetowanie || !selectedClass?.id}
            className="px-4 py-2.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed font-medium border border-red-200"
          >
            {resetowanie ? 'Resetowanie...' : 'Reset'}
          </button>
          {selectedClass?.id && (
            <>
              <span className="hidden sm:inline text-gray-400 text-sm mx-1">|</span>
              {maGodzinyDoWyboru && (
                <button
                  type="button"
                  onClick={() => {
                    setTrybPrzydzielDyrektor(false);
                    setTrybUsunGodzine(false);
                    setTrybDodajRozszerzenia(false);
                    setTrybPrzydzielGodzinyRozszerzen(false);
                    setTrybPodzielNaGrupy(false);
                    setTrybPrzydzielGodzine((v) => !v);
                  }}
                  className={`px-3 py-2.5 rounded-lg font-medium transition-colors text-sm whitespace-nowrap ${
                    trybPrzydzielGodzine ? 'bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-400' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Przydziel godzinę
                </button>
              )}
              <button
                type="button"
                  onClick={() => {
                    setTrybPrzydzielGodzine(false);
                    setTrybUsunGodzine(false);
                    setTrybDodajRozszerzenia(false);
                    setTrybPrzydzielGodzinyRozszerzen(false);
                    setTrybPodzielNaGrupy(false);
                    setTrybPrzydzielDyrektor((v) => !v);
                  }}
                className={`px-3 py-2.5 rounded-lg font-medium transition-colors text-sm whitespace-nowrap ${
                  trybPrzydzielDyrektor ? 'bg-sky-600 text-white hover:bg-sky-700 ring-2 ring-sky-400' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Godz. dyrektorskie
              </button>
              {maRozszerzenia && (
                <>
                  <span className="hidden sm:inline text-gray-400 text-sm mx-1">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTrybPrzydzielGodzine(false);
                      setTrybPrzydzielDyrektor(false);
                      setTrybUsunGodzine(false);
                      setTrybPrzydzielGodzinyRozszerzen(false);
                      setTrybPodzielNaGrupy(false);
                      setTrybDodajRozszerzenia((v) => !v);
                    }}
                    className={`px-3 py-2.5 rounded-lg font-medium transition-colors text-sm whitespace-nowrap ${
                      trybDodajRozszerzenia ? 'bg-violet-600 text-white hover:bg-violet-700 ring-2 ring-violet-400' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Dodaj rozszerzenia
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTrybPrzydzielGodzine(false);
                      setTrybPrzydzielDyrektor(false);
                      setTrybDodajRozszerzenia(false);
                      setTrybUsunGodzine(false);
                      setTrybPodzielNaGrupy(false);
                      setTrybPrzydzielGodzinyRozszerzen((v) => !v);
                    }}
                    className={`px-3 py-2.5 rounded-lg font-medium transition-colors text-sm whitespace-nowrap ${
                      trybPrzydzielGodzinyRozszerzen ? 'bg-violet-600 text-white hover:bg-violet-700 ring-2 ring-violet-400' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Przydziel godziny rozszerzeń
                  </button>
                </>
              )}
              <span className="hidden sm:inline text-gray-400 text-sm mx-1">|</span>
              <button
                type="button"
                onClick={() => {
                  setTrybPrzydzielGodzine(false);
                  setTrybPrzydzielDyrektor(false);
                  setTrybDodajRozszerzenia(false);
                  setTrybPrzydzielGodzinyRozszerzen(false);
                  setTrybUsunGodzine(false);
                  setTrybPodzielNaGrupy((v) => !v);
                }}
                className={`px-3 py-2.5 rounded-lg font-medium transition-colors text-sm whitespace-nowrap ${
                  trybPodzielNaGrupy ? 'bg-amber-600 text-white hover:bg-amber-700 ring-2 ring-amber-400' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Podziel na grupy (1 i 2)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTrybPrzydzielGodzine(false);
                  setTrybPrzydzielDyrektor(false);
                  setTrybDodajRozszerzenia(false);
                  setTrybPrzydzielGodzinyRozszerzen(false);
                  setTrybPodzielNaGrupy(false);
                  setTrybUsunGodzine((v) => !v);
                }}
                className={`px-3 py-2.5 rounded-lg font-medium transition-colors text-sm whitespace-nowrap ${
                  trybUsunGodzine ? 'bg-red-600 text-white hover:bg-red-700 ring-2 ring-red-400' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Usuń godziny
              </button>
            </>
          )}
        </div>
      </div>

      {komunikat && (
        <div
          className={`p-4 rounded-lg ${
            komunikat.typ === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {komunikat.tekst}
        </div>
      )}

      {/* Okno potwierdzenia resetu – Tak / Nie */}
      {pokazPotwierdzenieReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Czy na pewno?</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Zresetować przydział godzin dla tej klasy? Zostaną wyzerowane: godziny do wyboru, zajęcia z zakresu doradztwa zawodowego, godziny dyrektorskie, rozszerzenia, godziny rozszerzeń oraz podziały na grupy.
            </p>
            <div className="flex flex-row gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setPokazPotwierdzenieReset(false)}
                className="px-4 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
              >
                Nie
              </button>
              <button
                type="button"
                onClick={wykonajReset}
                className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Tak
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:flex-nowrap sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
        <select
          value={typSzkolyId}
          onChange={(e) => setTypSzkolyId(e.target.value)}
          disabled={ladowanieTypow}
          className="w-full sm:w-[200px] sm:min-w-0 border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-white disabled:opacity-60"
        >
          <option value="">{ladowanieTypow ? 'Ładowanie...' : 'Wybierz typ szkoły'}</option>
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
          <option value="">{ladowanieKlas ? 'Ładowanie...' : 'Rocznik'}</option>
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

      {nazwaTypuSzkoly && (
        <div className="space-y-2 min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Plan ramowy MEiN – godziny do wyboru i dyrektorskie</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Wybierz typ szkoły i klasę. Przycisk „Generuj przydział” przydziela godziny do wyboru do przedmiotów po kolei (po latach: I, II, III… lub IV, V, VI…). Możesz też ręcznie dodawać/usuwać godziny w tabeli.
          </p>
          <PlanMeinTabela
            nazwaTypuSzkoly={nazwaTypuSzkoly}
            klasaId={selectedClass?.id}
            refetchTrigger={refetchTrigger}
            trybPrzydzielGodzine={trybPrzydzielGodzine}
            trybPrzydzielDyrektor={trybPrzydzielDyrektor}
            trybUsunGodzine={trybUsunGodzine}
            trybDodajRozszerzenia={trybDodajRozszerzenia}
            trybPrzydzielGodzinyRozszerzen={trybPrzydzielGodzinyRozszerzen}
            trybPodzielNaGrupy={trybPodzielNaGrupy}
          />
        </div>
      )}
    </div>
  );
}
