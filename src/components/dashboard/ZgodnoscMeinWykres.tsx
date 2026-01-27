'use client';

interface ZgodnoscMeinWykresProps {
  dane: {
    wyniki?: Array<{
      przedmiotNazwa: string;
      klasaNazwa?: string;
      roznica: {
        procent_realizacji: number;
        godziny: number;
      };
      status: 'OK' | 'BRAK' | 'NADWYŻKA' | 'BRAK_DANYCH';
    }>;
    statystyki?: {
      lacznie: number;
      zgodne: number;
      zBrakami: number;
      zNadwyzkami: number;
      sredniProcent: number;
    };
  };
}

export default function ZgodnoscMeinWykres({ dane }: ZgodnoscMeinWykresProps) {
  const wyniki = dane.wyniki || [];
  const statystyki = dane.statystyki;

  // Grupuj według statusu
  const zgodne = wyniki.filter(w => w.status === 'OK');
  const zBrakami = wyniki.filter(w => w.status === 'BRAK');
  const zNadwyzkami = wyniki.filter(w => w.status === 'NADWYŻKA');

  // Top 10 najgorszych (najniższy procent realizacji)
  const najgorsze = [...wyniki]
    .sort((a, b) => a.roznica.procent_realizacji - b.roznica.procent_realizacji)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Statystyki */}
      {statystyki && (
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded">
            <p className="text-2xl font-bold text-green-600">{statystyki.zgodne}</p>
            <p className="text-sm text-gray-600">Zgodne</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded">
            <p className="text-2xl font-bold text-red-600">{statystyki.zBrakami}</p>
            <p className="text-sm text-gray-600">Z brakami</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded">
            <p className="text-2xl font-bold text-yellow-600">{statystyki.zNadwyzkami}</p>
            <p className="text-sm text-gray-600">Z nadwyżkami</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded">
            <p className="text-2xl font-bold text-blue-600">
              {statystyki.sredniProcent.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600">Średni % realizacji</p>
          </div>
        </div>
      )}

      {/* Wykres kołowy (prosty) */}
      <div className="flex items-center justify-center">
        <div className="relative w-64 h-64">
          <svg className="w-64 h-64 transform -rotate-90">
            {/* Tło */}
            <circle
              cx="128"
              cy="128"
              r="100"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="20"
            />
            {/* Zgodne */}
            {statystyki && (
              <circle
                cx="128"
                cy="128"
                r="100"
                fill="none"
                stroke="#10b981"
                strokeWidth="20"
                strokeDasharray={`${(statystyki.zgodne / statystyki.lacznie) * 628} 628`}
                strokeDashoffset="0"
              />
            )}
            {/* Z brakami */}
            {statystyki && (
              <circle
                cx="128"
                cy="128"
                r="100"
                fill="none"
                stroke="#ef4444"
                strokeWidth="20"
                strokeDasharray={`${(statystyki.zBrakami / statystyki.lacznie) * 628} 628`}
                strokeDashoffset={`-${(statystyki.zgodne / statystyki.lacznie) * 628}`}
              />
            )}
            {/* Z nadwyżkami */}
            {statystyki && (
              <circle
                cx="128"
                cy="128"
                r="100"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="20"
                strokeDasharray={`${(statystyki.zNadwyzkami / statystyki.lacznie) * 628} 628`}
                strokeDashoffset={`-${((statystyki.zgodne + statystyki.zBrakami) / statystyki.lacznie) * 628}`}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-3xl font-bold">
                {statystyki?.sredniProcent.toFixed(0) || 0}%
              </p>
              <p className="text-sm text-gray-600">Realizacji</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela najgorszych */}
      {najgorsze.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Przedmioty wymagające uwagi</h3>
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
                    Procent realizacji
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Różnica
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {najgorsze.map((wynik, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {wynik.przedmiotNazwa}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {wynik.klasaNazwa || 'Wszystkie'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full ${
                              wynik.roznica.procent_realizacji >= 100
                                ? 'bg-green-500'
                                : wynik.roznica.procent_realizacji >= 80
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{
                              width: `${Math.min(100, wynik.roznica.procent_realizacji)}%`,
                            }}
                          />
                        </div>
                        <span className="text-gray-900">
                          {wynik.roznica.procent_realizacji.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {wynik.roznica.godziny > 0 ? '+' : ''}
                      {wynik.roznica.godziny} h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          wynik.status === 'OK'
                            ? 'bg-green-100 text-green-800'
                            : wynik.status === 'BRAK'
                            ? 'bg-red-100 text-red-800'
                            : wynik.status === 'NADWYŻKA'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {wynik.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
