'use client';

import Link from 'next/link';

interface BrakiKadroweListaProps {
  dane: {
      braki?: Array<{
      przedmiotId?: string;
      przedmiotNazwa: string;
      klasaId?: string;
      klasaNazwa: string;
      godzinyTygodniowo: number;
      powod: string;
      dostepniNauczyciele: number;
      sugerowaneRozwiazania: string[];
    }>;
    statystyki?: {
      lacznie: number;
      wedlugPrzedmiotu: Array<{
        przedmiotNazwa: string;
        liczbaKlas: number;
        laczneGodziny: number;
        powod: string;
        dostepniNauczyciele: number;
      }>;
      laczneGodziny: number;
      wymaganeEtaty: number;
    };
  };
}

export default function BrakiKadroweLista({ dane }: BrakiKadroweListaProps) {
  const braki = dane.braki || [];
  const statystyki = dane.statystyki;

  return (
    <div className="space-y-6">
      {/* Statystyki */}
      {statystyki && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Łącznie braków</p>
              <p className="text-2xl font-bold text-red-600">{statystyki.lacznie}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Łączne godziny</p>
              <p className="text-2xl font-bold text-red-600">
                {statystyki.laczneGodziny} h/tyg
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Wymagane etaty</p>
              <p className="text-2xl font-bold text-red-600">
                {statystyki.wymaganeEtaty}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Braki według przedmiotu */}
      {statystyki?.wedlugPrzedmiotu && statystyki.wedlugPrzedmiotu.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Braki według przedmiotu</h3>
          <div className="space-y-3">
            {statystyki.wedlugPrzedmiotu.map((przedmiot, index) => (
              <div
                key={index}
                className="border border-red-200 rounded-lg p-4 bg-red-50"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {przedmiot.przedmiotId ? (
                        <Link
                          href={`/przedmioty/${przedmiot.przedmiotId}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {przedmiot.przedmiotNazwa}
                        </Link>
                      ) : (
                        przedmiot.przedmiotNazwa
                      )}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {przedmiot.liczbaKlas} klas, {przedmiot.laczneGodziny} godzin tygodniowo
                    </p>
                    <p className="text-sm text-red-600 mt-1">
                      Powód: {przedmiot.powod}
                    </p>
                    {przedmiot.dostepniNauczyciele > 0 && (
                      <p className="text-sm text-blue-600 mt-1">
                        💡 {przedmiot.dostepniNauczyciele} nauczycieli ma kwalifikacje, ale brakuje
                        czasu
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Szczegółowa lista */}
      {braki.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Szczegółowa lista braków</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Przedmiot
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Klasa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Godziny
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Powód
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Rozwiązanie
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {braki.map((brak, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {brak.przedmiotId ? (
                        <Link
                          href={`/przedmioty/${brak.przedmiotId}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {brak.przedmiotNazwa}
                        </Link>
                      ) : (
                        brak.przedmiotNazwa
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {brak.klasaId ? (
                        <Link
                          href={`/klasy/${brak.klasaId}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {brak.klasaNazwa}
                        </Link>
                      ) : (
                        brak.klasaNazwa
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {brak.godzinyTygodniowo} h/tyg
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {brak.powod}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {brak.dostepniNauczyciele > 0 ? (
                        <span className="text-blue-600">
                          Zwiększ obciążenie {brak.dostepniNauczyciele} nauczycieli
                        </span>
                      ) : (
                        <span className="text-red-600">
                          Zatrudnij nowego nauczyciela lub dodaj kwalifikacje
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {braki.length === 0 && (
        <div className="text-center py-8 bg-green-50 rounded-lg">
          <p className="text-green-600 font-semibold">✅ Brak braków kadrowych!</p>
          <p className="text-sm text-gray-600 mt-2">
            Wszystkie przedmioty mają przypisanych nauczycieli.
          </p>
        </div>
      )}
    </div>
  );
}
