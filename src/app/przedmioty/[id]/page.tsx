'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PrzedmiotPage() {
  const params = useParams();
  const router = useRouter();
  const przedmiotId = params.id as string;

  const [dane, setDane] = useState<any>(null);
  const [ladowanie, setLadowanie] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (przedmiotId) {
      pobierzDane();
    }
  }, [przedmiotId]);

  const pobierzDane = async () => {
    setLadowanie(true);
    setError(null);
    try {
      const response = await fetch(`/api/przedmioty/${przedmiotId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setDane(data);
    } catch (err) {
      console.error('Błąd przy pobieraniu danych przedmiotu:', err);
      setError(err instanceof Error ? err.message : 'Nieznany błąd');
    } finally {
      setLadowanie(false);
    }
  };

  if (ladowanie) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Ładowanie danych przedmiotu...</p>
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

  return (
    <div className="p-6 space-y-6">
      {/* Nagłówek */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{dane.przedmiot.nazwa}</h1>
          <p className="text-gray-600 mt-1">
            {dane.przedmiot.typ_zajec} • {dane.przedmiot.poziom}
            {dane.przedmiot.kod_mein && ` • Kod MEiN: ${dane.przedmiot.kod_mein}`}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
        >
          ← Wróć do dashboardu
        </Link>
      </div>

      {/* Podsumowanie */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Podsumowanie</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded">
            <p className="text-sm text-gray-600">Łączna liczba godzin</p>
            <p className="text-2xl font-bold">{dane.podsumowanie.laczna_godziny}</p>
          </div>
          <div className="bg-green-50 p-4 rounded">
            <p className="text-sm text-gray-600">Liczba klas</p>
            <p className="text-2xl font-bold">{dane.podsumowanie.liczba_klas}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded">
            <p className="text-sm text-gray-600">Liczba nauczycieli</p>
            <p className="text-2xl font-bold">{dane.podsumowanie.liczba_nauczycieli}</p>
          </div>
        </div>
      </div>

      {/* Podział na klasy */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Podział na klasy</h2>
        <div className="space-y-4">
          {dane.klasy.map((klasaItem: any, index: number) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Link
                    href={`/klasy/${klasaItem.klasa.id}`}
                    className="text-lg font-semibold text-blue-600 hover:text-blue-800"
                  >
                    {klasaItem.klasa.nazwa}
                  </Link>
                  {klasaItem.klasa.profil && (
                    <p className="text-sm text-gray-600">Profil: {klasaItem.klasa.profil}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Godziny tygodniowo</p>
                  <p className="text-xl font-bold">{klasaItem.godziny_tyg}</p>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm font-semibold mb-2">Nauczyciele:</p>
                {klasaItem.nauczyciele.length > 0 ? (
                  <div className="space-y-2">
                    {klasaItem.nauczyciele.map((nauczyciel: any, nIndex: number) => (
                      <div key={nIndex} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <Link
                          href={`/nauczyciele/${nauczyciel.id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {nauczyciel.imie} {nauczyciel.nazwisko}
                        </Link>
                        <div className="text-sm text-gray-600">
                          {nauczyciel.godziny_tyg}h/tyg • {nauczyciel.godziny_roczne}h/rok
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">Brak przypisanych nauczycieli</p>
                )}
                <div className="mt-2 pt-2 border-t">
                  <p className="text-sm text-gray-600">
                    Razem: <span className="font-semibold">{klasaItem.godziny_roczne} godzin rocznie</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
