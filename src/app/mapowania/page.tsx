'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Mapowanie {
  id: string;
  nazwa_mein: string;
  nazwa_szkola: string;
  typ: 'przedmiot' | 'typ_szkoly';
  aktywne: boolean;
  uwagi?: string;
}

export default function MapowaniaPage() {
  const router = useRouter();
  const [mapowania, setMapowania] = useState<Mapowanie[]>([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [filtrTyp, setFiltrTyp] = useState<'wszystkie' | 'przedmiot' | 'typ_szkoly'>('wszystkie');
  const [tylkoAktywne, setTylkoAktywne] = useState(true);

  useEffect(() => {
    pobierzMapowania();
  }, [filtrTyp, tylkoAktywne]);

  const pobierzMapowania = async () => {
    setLadowanie(true);
    try {
      const params = new URLSearchParams();
      if (filtrTyp !== 'wszystkie') {
        params.append('typ', filtrTyp);
      }
      if (tylkoAktywne) {
        params.append('aktywne', 'true');
      }

      const response = await fetch(`/api/mapowania?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Błąd przy pobieraniu mapowań');
      }

      const data = await response.json();
      setMapowania(data.mapowania || []);
    } catch (error) {
      console.error('Błąd:', error);
    } finally {
      setLadowanie(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Mapowania nazw MEiN ↔ szkoła</h1>
        <div className="flex gap-2">
          <Link
            href="/panel-admin"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            ➕ Dodaj mapowanie
          </Link>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            ← Powrót
          </button>
        </div>
      </div>

      {/* Filtry */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Typ mapowania
            </label>
            <select
              value={filtrTyp}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'wszystkie' || value === 'przedmiot' || value === 'typ_szkoly') {
                  setFiltrTyp(value);
                }
              }}
              className="w-full border rounded px-3 py-2"
            >
              <option value="wszystkie">Wszystkie</option>
              <option value="przedmiot">Przedmioty</option>
              <option value="typ_szkoly">Typy szkół</option>
            </select>
          </div>

          <div className="flex items-center pt-6">
            <input
              type="checkbox"
              id="tylkoAktywne"
              checked={tylkoAktywne}
              onChange={(e) => setTylkoAktywne(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="tylkoAktywne" className="text-sm">
              Tylko aktywne
            </label>
          </div>
        </div>
      </div>

      {/* Lista mapowań */}
      {ladowanie ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      ) : mapowania.length > 0 ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            Mapowania ({mapowania.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nazwa MEiN</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nazwa w szkole</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Typ</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uwagi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mapowania.map((mapowanie) => (
                  <tr key={mapowanie.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {mapowanie.nazwa_mein}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {mapowanie.nazwa_szkola}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        mapowanie.typ === 'przedmiot' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {mapowanie.typ === 'przedmiot' ? 'Przedmiot' : 'Typ szkoły'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        mapowanie.aktywne 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {mapowanie.aktywne ? 'Aktywne' : 'Nieaktywne'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {mapowanie.uwagi || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          Brak mapowań. Dodaj pierwsze mapowanie w panelu administracyjnym.
        </div>
      )}

      {/* Informacja */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">ℹ️ Jak działa mapowanie?</h3>
        <p className="text-sm text-blue-700">
          Mapowania pozwalają na automatyczne dopasowanie nazw z dokumentacji MEiN do nazw używanych w szkole.
          Podczas importu siatki godzin MEiN z PDF, system automatycznie użyje mapowań do znalezienia odpowiednich
          przedmiotów i typów szkół w bazie.
        </p>
      </div>
    </div>
  );
}
