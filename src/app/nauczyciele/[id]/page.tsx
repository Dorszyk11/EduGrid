'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NauczycielPage() {
  const params = useParams();
  const router = useRouter();
  const nauczycielId = params.id as string;

  const [dane, setDane] = useState<any>(null);
  const [ladowanie, setLadowanie] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usuwanieId, setUsuwanieId] = useState<string | number | null>(null);

  useEffect(() => {
    if (nauczycielId) {
      pobierzDane();
    }
  }, [nauczycielId]);

  const pobierzDane = async () => {
    setLadowanie(true);
    setError(null);
    try {
      const response = await fetch(`/api/nauczyciele/${nauczycielId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setDane(data);
    } catch (err) {
      console.error('Błąd przy pobieraniu danych nauczyciela:', err);
      setError(err instanceof Error ? err.message : 'Nieznany błąd');
    } finally {
      setLadowanie(false);
    }
  };

  const usunPrzypisanie = async (rozkładId: string | number) => {
    setUsuwanieId(rozkładId);
    setError(null);
    try {
      const res = await fetch(`/api/nauczyciele/obciazenie/${rozkładId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Błąd usuwania');
      await pobierzDane();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd usuwania');
    } finally {
      setUsuwanieId(null);
    }
  };

  if (ladowanie) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Ładowanie danych nauczyciela...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold">Błąd:</p>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Wróć
          </button>
        </div>
      </div>
    );
  }

  if (!dane) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OK':
        return 'bg-green-100 text-green-800';
      case 'PRZECIĄŻENIE':
        return 'bg-red-100 text-red-800';
      case 'NIEDOCIĄŻENIE':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OK':
        return '✅';
      case 'PRZECIĄŻENIE':
        return '❌';
      case 'NIEDOCIĄŻENIE':
        return '⚠️';
      default:
        return '';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Nagłówek */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {dane.nauczyciel.imie} {dane.nauczyciel.nazwisko}
          </h1>
          <p className="text-gray-600 mt-1">
            {dane.nauczyciel.email} • {dane.nauczyciel.telefon}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Etat: {dane.nauczyciel.etat} • Max obciążenie: {dane.nauczyciel.max_obciazenie}h/tyg
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
        >
          ← Wróć do dashboardu
        </Link>
      </div>

      {/* Podsumowanie obciążenia */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Podsumowanie obciążenia</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded">
            <p className="text-sm text-gray-600">Godziny tygodniowo</p>
            <p className="text-2xl font-bold">{dane.podsumowanie.suma_godzin_tyg}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded">
            <p className="text-sm text-gray-600">Procent obciążenia</p>
            <p className="text-2xl font-bold">{dane.podsumowanie.procent_obciazenia}%</p>
          </div>
          <div className={`p-4 rounded ${getStatusColor(dane.podsumowanie.status)}`}>
            <p className="text-sm font-semibold">Status</p>
            <p className="text-xl font-bold">
              {getStatusIcon(dane.podsumowanie.status)} {dane.podsumowanie.status}
            </p>
          </div>
        </div>
        {dane.podsumowanie.roznica !== 0 && (
          <div className={`mt-4 p-3 rounded ${
            dane.podsumowanie.roznica > 0 ? 'bg-red-50 text-red-800' : 'bg-yellow-50 text-yellow-800'
          }`}>
            <p className="font-semibold">
              {dane.podsumowanie.roznica > 0 ? 'Przekroczono' : 'Niedociążenie'} o {Math.abs(dane.podsumowanie.roznica)} godzin tygodniowo
            </p>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="text-sm text-gray-600">
            Liczba klas: <span className="font-semibold">{dane.podsumowanie.liczba_klas}</span>
          </div>
          <div className="text-sm text-gray-600">
            Liczba przedmiotów: <span className="font-semibold">{dane.podsumowanie.liczba_przedmiotow}</span>
          </div>
        </div>
      </div>

      {/* Kwalifikacje */}
      {dane.kwalifikacje.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Kwalifikacje</h2>
          <div className="space-y-2">
            {dane.kwalifikacje.map((kwal: any, index: number) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                <div>
                  <p className="font-semibold">{kwal.przedmiot.nazwa}</p>
                  <p className="text-sm text-gray-600">{kwal.specjalizacja} • {kwal.stopien}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Obciążenie szczegółowe */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Obciążenie szczegółowe</h2>
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
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rok szkolny
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  {' '}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dane.obciazenie.map((obc: any, index: number) => (
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
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {obc.godziny_tyg}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {obc.rok_szkolny}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {obc.id != null ? (
                      <button
                        type="button"
                        onClick={() => usunPrzypisanie(obc.id)}
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
    </div>
  );
}
