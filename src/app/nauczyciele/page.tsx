'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface NauczycielListItem {
  id: string | number;
  imie: string;
  nazwisko: string;
  przedmioty: Array<{ id: string | number; nazwa?: string | null }>;
}

interface ObciazenieItem {
  id?: string | number;
  klasa: { id: string | number; nazwa: string };
  przedmiot: { id: string | number; nazwa: string };
  godziny_tyg: number;
  godziny_roczne: number;
  rok_szkolny: string;
  /** Rok w cyklu (I, II, III itd.) */
  rok?: string;
}

interface NauczycielDetail {
  nauczyciel: {
    id: string | number;
    imie: string;
    nazwisko: string;
    email?: string;
    telefon?: string;
    etat?: string;
    max_obciazenie?: number;
  };
  obciazenie: ObciazenieItem[];
  podsumowanie?: {
    suma_godzin_tyg: number;
    suma_godzin_rocznie: number;
    max_obciazenie: number;
    roznica: number;
    procent_obciazenia: number;
    status: string;
    liczba_klas: number;
    liczba_przedmiotow: number;
  };
  kwalifikacje?: Array<{
    przedmiot: { id: string | number; nazwa: string };
    stopien?: string;
    specjalizacja?: string;
  }>;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'OK': return 'bg-green-100 text-green-800';
    case 'PRZECIĄŻENIE': return 'bg-red-100 text-red-800';
    case 'NIEDOCIĄŻENIE': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'OK': return '✅';
    case 'PRZECIĄŻENIE': return '❌';
    case 'NIEDOCIĄŻENIE': return '⚠️';
    default: return '';
  }
}

/** Unikalna para klasa + rok (do wyboru w select) */
function uniqueKlasyRok(obciazenie: ObciazenieItem[]): { klasaId: string; klasaNazwa: string; rokSzkolny: string }[] {
  const seen = new Set<string>();
  const out: { klasaId: string; klasaNazwa: string; rokSzkolny: string }[] = [];
  for (const o of obciazenie) {
    const key = `${o.klasa.id}-${o.rok_szkolny}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      klasaId: String(o.klasa.id),
      klasaNazwa: o.klasa.nazwa,
      rokSzkolny: o.rok_szkolny || '',
    });
  }
  out.sort((a, b) => {
    const cmpKlasa = a.klasaNazwa.localeCompare(b.klasaNazwa);
    if (cmpKlasa !== 0) return cmpKlasa;
    return a.rokSzkolny.localeCompare(b.rokSzkolny);
  });
  return out;
}

export default function NauczycielePage() {
  const [nauczyciele, setNauczyciele] = useState<NauczycielListItem[]>([]);
  const [wybranyNauczycielId, setWybranyNauczycielId] = useState<string>('');
  const [wybranaKlasaRok, setWybranaKlasaRok] = useState<string>('');
  const [daneNauczyciela, setDaneNauczyciela] = useState<NauczycielDetail | null>(null);
  const [ladowanieListy, setLadowanieListy] = useState(true);
  const [ladowanieSzczegoly, setLadowanieSzczegoly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usuwanieId, setUsuwanieId] = useState<string | number | null>(null);

  useEffect(() => {
    fetch('/api/nauczyciele', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setNauczyciele(data);
        else setNauczyciele([]);
      })
      .catch(() => setNauczyciele([]))
      .finally(() => setLadowanieListy(false));
  }, []);

  useEffect(() => {
    if (!wybranyNauczycielId) {
      setDaneNauczyciela(null);
      setWybranaKlasaRok('');
      return;
    }
    setLadowanieSzczegoly(true);
    setError(null);
    setWybranaKlasaRok('');
    fetch(`/api/nauczyciele/${wybranyNauczycielId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setDaneNauczyciela(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Błąd pobierania');
        setDaneNauczyciela(null);
      })
      .finally(() => setLadowanieSzczegoly(false));
  }, [wybranyNauczycielId]);

  const opcjeKlasyRok = daneNauczyciela ? uniqueKlasyRok(daneNauczyciela.obciazenie) : [];
  const [klasaIdSel, rokSzkolnySel] = wybranaKlasaRok ? wybranaKlasaRok.split('::') : [null, null];

  const usunPrzypisanie = async (rozkładId: string | number) => {
    if (!wybranyNauczycielId) return;
    setUsuwanieId(rozkładId);
    setError(null);
    try {
      const res = await fetch(`/api/nauczyciele/obciazenie/${rozkładId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Błąd usuwania');
      const next = await fetch(`/api/nauczyciele/${wybranyNauczycielId}`).then((r) => r.json());
      if (next.error) throw new Error(next.error);
      setDaneNauczyciela(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd usuwania');
    } finally {
      setUsuwanieId(null);
    }
  };

  const obciazenieFiltrowane =
    daneNauczyciela && klasaIdSel && rokSzkolnySel
      ? daneNauczyciela.obciazenie.filter(
          (o) => String(o.klasa.id) === klasaIdSel && (o.rok_szkolny || '') === rokSzkolnySel
        )
      : daneNauczyciela?.obciazenie ?? [];

  const sumaGodzinTyg = obciazenieFiltrowane.reduce((s, o) => s + o.godziny_tyg, 0);
  const liczbaKlas = new Set(obciazenieFiltrowane.map((o) => o.klasa.id)).size;
  const liczbaPrzedmiotow = new Set(obciazenieFiltrowane.map((o) => o.przedmiot.id)).size;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Nauczyciele</h1>
        <Link href="/dashboard" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded">
          ← Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Wybierz nauczyciela, klasę i rok</h2>

        {/* 1. Nauczyciel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nauczyciel</label>
          <select
            value={wybranyNauczycielId}
            onChange={(e) => setWybranyNauczycielId(e.target.value)}
            className="w-full max-w-md border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
            disabled={ladowanieListy}
          >
            <option value="">— wybierz nauczyciela —</option>
            {nauczyciele.map((n) => (
              <option key={String(n.id)} value={String(n.id)}>
                {n.imie} {n.nazwisko}
              </option>
            ))}
          </select>
        </div>

        {ladowanieSzczegoly && (
          <p className="text-sm text-gray-500">Ładowanie obciążenia nauczyciela…</p>
        )}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* 2. Klasa i rok (na podstawie obciążenia wybranego nauczyciela) */}
        {daneNauczyciela && opcjeKlasyRok.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Klasa i rok szkolny</label>
            <select
              value={wybranaKlasaRok}
              onChange={(e) => setWybranaKlasaRok(e.target.value)}
              className="w-full max-w-md border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">— wybierz klasę i rok —</option>
              {opcjeKlasyRok.map((opt) => {
                const val = `${opt.klasaId}::${opt.rokSzkolny}`;
                return (
                  <option key={val} value={val}>
                    {opt.klasaNazwa} — {opt.rokSzkolny || 'brak roku'}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {daneNauczyciela && opcjeKlasyRok.length === 0 && daneNauczyciela.obciazenie.length === 0 && (
          <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded">
            Ten nauczyciel nie ma przypisanych godzin w rozkładzie. Przydziel godziny w module Przydział.
          </p>
        )}
      </div>

      {/* Widok nauczyciel + przedmiot per klasa + sumarycznie */}
      {daneNauczyciela && (
        <div className="space-y-6">
          {/* 1. Widok nauczyciel (szczegóły) */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Nauczyciel</h2>
            <div>
              <p className="text-xl font-medium">
                {daneNauczyciela.nauczyciel.imie} {daneNauczyciela.nauczyciel.nazwisko}
              </p>
              {(daneNauczyciela.nauczyciel.email || daneNauczyciela.nauczyciel.telefon) && (
                <p className="text-gray-600 mt-1">
                  {[daneNauczyciela.nauczyciel.email, daneNauczyciela.nauczyciel.telefon].filter(Boolean).join(' • ')}
                </p>
              )}
              {(daneNauczyciela.nauczyciel.etat != null || daneNauczyciela.nauczyciel.max_obciazenie != null) && (
                <p className="text-sm text-gray-500 mt-1">
                  Etat: {daneNauczyciela.nauczyciel.etat ?? '—'} • Max obciążenie: {daneNauczyciela.nauczyciel.max_obciazenie ?? '—'}h/tyg
                </p>
              )}
            </div>
          </div>

          {/* Podsumowanie obciążenia (z API) */}
          {daneNauczyciela.podsumowanie && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Podsumowanie obciążenia</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Godziny tygodniowo</p>
                  <p className="text-2xl font-bold text-blue-900">{daneNauczyciela.podsumowanie.suma_godzin_tyg}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Procent obciążenia</p>
                  <p className="text-2xl font-bold text-purple-900">{daneNauczyciela.podsumowanie.procent_obciazenia}%</p>
                </div>
                <div className={`p-4 rounded-lg ${getStatusColor(daneNauczyciela.podsumowanie.status)}`}>
                  <p className="text-sm font-semibold">Status</p>
                  <p className="text-xl font-bold">
                    {getStatusIcon(daneNauczyciela.podsumowanie.status)} {daneNauczyciela.podsumowanie.status}
                  </p>
                </div>
              </div>
              {daneNauczyciela.podsumowanie.roznica !== 0 && (
                <div className={`mt-4 p-3 rounded-lg ${
                  daneNauczyciela.podsumowanie.roznica > 0 ? 'bg-red-50 text-red-800' : 'bg-yellow-50 text-yellow-800'
                }`}>
                  <p className="font-semibold">
                    {daneNauczyciela.podsumowanie.roznica > 0 ? 'Przekroczono' : 'Niedociążenie'} o {Math.abs(daneNauczyciela.podsumowanie.roznica)} godz./tyg
                  </p>
                </div>
              )}
              <div className="mt-4 flex gap-6 text-sm text-gray-600">
                <span>Liczba klas: <span className="font-semibold">{daneNauczyciela.podsumowanie.liczba_klas}</span></span>
                <span>Liczba przedmiotów: <span className="font-semibold">{daneNauczyciela.podsumowanie.liczba_przedmiotow}</span></span>
              </div>
            </div>
          )}

          {/* Kwalifikacje */}
          {daneNauczyciela.kwalifikacje && daneNauczyciela.kwalifikacje.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Kwalifikacje</h2>
              <div className="space-y-2">
                {daneNauczyciela.kwalifikacje.map((kwal, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                    <div>
                      <p className="font-semibold">{kwal.przedmiot?.nazwa}</p>
                      {(kwal.specjalizacja || kwal.stopien) && (
                        <p className="text-sm text-gray-600">{[kwal.specjalizacja, kwal.stopien].filter(Boolean).join(' • ')}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Przedmiot per klasa */}
          {obciazenieFiltrowane.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Przedmiot per klasa
                {wybranaKlasaRok && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    — {opcjeKlasyRok.find((o) => `${o.klasaId}::${o.rokSzkolny}` === wybranaKlasaRok)?.klasaNazwa},{' '}
                    {rokSzkolnySel}
                  </span>
                )}
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Klasa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Przedmiot
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rok
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Godz./tyg
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                        {' '}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {obciazenieFiltrowane.map((obc, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/klasy/${obc.klasa.id}`}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {obc.klasa.nazwa}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/przedmioty/${obc.przedmiot.id}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {obc.przedmiot.nazwa}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-gray-700">
                          {obc.rok ? obc.rok : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">{obc.godziny_tyg}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {obc.id != null ? (
                            <button
                              type="button"
                              onClick={() => usunPrzypisanie(obc.id!)}
                              disabled={usuwanieId === obc.id}
                              className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                            >
                              {usuwanieId === obc.id ? '…' : 'Usuń'}
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. Sumarycznie */}
          {daneNauczyciela && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Sumarycznie</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Godziny tygodniowo</p>
                  <p className="text-2xl font-bold text-blue-900">{sumaGodzinTyg}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Liczba klas</p>
                  <p className="text-2xl font-bold text-gray-900">{liczbaKlas}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Liczba przedmiotów</p>
                  <p className="text-2xl font-bold text-gray-900">{liczbaPrzedmiotow}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
