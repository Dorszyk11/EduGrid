'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function KlasaPage() {
  const params = useParams();
  const router = useRouter();
  const klasaId = params.id as string;

  const [dane, setDane] = useState<any>(null);
  const [ladowanie, setLadowanie] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (klasaId) {
      pobierzDane();
    }
  }, [klasaId]);

  const pobierzDane = async () => {
    setLadowanie(true);
    setError(null);
    try {
      const response = await fetch(`/api/klasy/${klasaId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setDane(data);
    } catch (err) {
      console.error('Błąd przy pobieraniu danych klasy:', err);
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
            <p className="mt-4 text-gray-600">Ładowanie danych klasy...</p>
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
      case 'BRAK':
        return 'bg-red-100 text-red-800';
      case 'NADWYŻKA':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OK':
        return '✅';
      case 'BRAK':
        return '❌';
      case 'NADWYŻKA':
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
          <h1 className="text-3xl font-bold">Klasa {dane.klasa.nazwa}</h1>
          {dane.klasa.profil && (
            <p className="text-gray-600 mt-1">Profil: {dane.klasa.profil}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">
            {dane.klasa.typ_szkoly.nazwa} • Rok szkolny: {dane.klasa.rok_szkolny}
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded">
            <p className="text-sm text-gray-600">Planowane godziny</p>
            <p className="text-2xl font-bold">{dane.podsumowanie.suma_godzin}</p>
          </div>
          <div className="bg-green-50 p-4 rounded">
            <p className="text-sm text-gray-600">Wymagane MEiN</p>
            <p className="text-2xl font-bold">{dane.podsumowanie.suma_wymaganych}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded">
            <p className="text-sm text-gray-600">Różnica</p>
            <p className={`text-2xl font-bold ${
              dane.podsumowanie.suma_roznica < 0 ? 'text-red-600' : 
              dane.podsumowanie.suma_roznica > 0 ? 'text-yellow-600' : 
              'text-green-600'
            }`}>
              {dane.podsumowanie.suma_roznica > 0 ? '+' : ''}{dane.podsumowanie.suma_roznica}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded">
            <p className="text-sm text-gray-600">Realizacja</p>
            <p className="text-2xl font-bold">{dane.podsumowanie.procent_realizacji}%</p>
          </div>
        </div>
      </div>

      {/* Tabela przedmiotów */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Przedmioty i nauczyciele</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Przedmiot
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nauczyciel
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Godz./tyg
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Godz./rok
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wymagane MEiN
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Różnica
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Realizacja
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dane.przedmioty.map((przedmiot: any, index: number) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/przedmioty/${przedmiot.przedmiot.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {przedmiot.przedmiot.nazwa}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {przedmiot.nauczyciel ? (
                      <Link
                        href={`/nauczyciele/${przedmiot.nauczyciel.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {przedmiot.nauczyciel.imie} {przedmiot.nauczyciel.nazwisko}
                      </Link>
                    ) : (
                      <span className="text-gray-400">Brak przypisania</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {przedmiot.godziny_tyg}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {przedmiot.godziny_roczne}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {przedmiot.wymagane_mein}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={
                      przedmiot.roznica < 0 ? 'text-red-600 font-semibold' :
                      przedmiot.roznica > 0 ? 'text-yellow-600 font-semibold' :
                      'text-green-600 font-semibold'
                    }>
                      {przedmiot.roznica > 0 ? '+' : ''}{przedmiot.roznica}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {przedmiot.procent_realizacji}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(przedmiot.status)}`}>
                      {getStatusIcon(przedmiot.status)} {przedmiot.status}
                    </span>
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
