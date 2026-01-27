'use client';

import Link from 'next/link';

interface ObciazenieNauczycieliTabelaProps {
  dane: {
    obciazenia?: Array<{
      nauczycielId: string;
      nauczycielNazwa: string;
      maxObciazenie: number;
      aktualneObciazenie: number;
      dostepneObciazenie: number;
      procentWykorzystania: number;
      status: 'PRZEKROCZONE' | 'PEŁNE' | 'NISKIE' | 'OK';
      liczbaPrzypisan: number;
    }>;
    statystyki?: {
      lacznie: number;
      przekroczone: number;
      pelne: number;
      niskie: number;
      srednieObciazenie: number;
    };
  };
}

export default function ObciazenieNauczycieliTabela({ dane }: ObciazenieNauczycieliTabelaProps) {
  const obciazenia = dane.obciazenia || [];
  const statystyki = dane.statystyki;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRZEKROCZONE':
        return 'bg-red-100 text-red-800';
      case 'PEŁNE':
        return 'bg-yellow-100 text-yellow-800';
      case 'NISKIE':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PRZEKROCZONE':
        return '🔴';
      case 'PEŁNE':
        return '🟡';
      case 'NISKIE':
        return '🔵';
      default:
        return '🟢';
    }
  };

  return (
    <div className="space-y-4">
      {/* Statystyki */}
      {statystyki && (
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded">
            <p className="text-xl font-bold">{statystyki.lacznie}</p>
            <p className="text-xs text-gray-600">Nauczycieli</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded">
            <p className="text-xl font-bold text-red-600">{statystyki.przekroczone}</p>
            <p className="text-xs text-gray-600">Przekroczone</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded">
            <p className="text-xl font-bold text-yellow-600">{statystyki.pelne}</p>
            <p className="text-xs text-gray-600">Pełne</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded">
            <p className="text-xl font-bold text-blue-600">{statystyki.niskie}</p>
            <p className="text-xs text-gray-600">Niskie</p>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nauczyciel
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Obciążenie
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Wykorzystanie
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Dostępne
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Przypisania
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {obciazenia.map((obciazenie) => (
              <tr key={obciazenie.nauczycielId}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <Link
                    href={`/nauczyciele/${obciazenie.nauczycielId}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {obciazenie.nauczycielNazwa}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {obciazenie.aktualneObciazenie} / {obciazenie.maxObciazenie} h
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        className={`h-2 rounded-full ${
                          obciazenie.procentWykorzystania > 100
                            ? 'bg-red-500'
                            : obciazenie.procentWykorzystania >= 90
                            ? 'bg-yellow-500'
                            : obciazenie.procentWykorzystania < 50
                            ? 'bg-blue-500'
                            : 'bg-green-500'
                        }`}
                        style={{
                          width: `${Math.min(100, obciazenie.procentWykorzystania)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-900">
                      {obciazenie.procentWykorzystania.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {obciazenie.dostepneObciazenie.toFixed(1)} h
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {obciazenie.liczbaPrzypisan}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                      obciazenie.status
                    )}`}
                  >
                    <span className="mr-1">{getStatusIcon(obciazenie.status)}</span>
                    {obciazenie.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
