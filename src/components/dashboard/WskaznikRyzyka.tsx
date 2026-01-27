'use client';

interface WskaznikRyzykaProps {
  wskaznik: {
    wartosc: number;
    kategoria: 'niski' | 'średni' | 'wysoki' | 'krytyczny';
    czynniki: Array<{
      nazwa: string;
      wplyw: number;
      opis: string;
    }>;
    rekomendacje: string[];
  };
}

export default function WskaznikRyzyka({ wskaznik }: WskaznikRyzykaProps) {
  const getKolorKategorii = (kategoria: string) => {
    switch (kategoria) {
      case 'krytyczny':
        return 'bg-red-600 text-white';
      case 'wysoki':
        return 'bg-orange-500 text-white';
      case 'średni':
        return 'bg-yellow-500 text-white';
      case 'niski':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getKolorProgresu = (wartosc: number) => {
    if (wartosc >= 75) return 'bg-red-600';
    if (wartosc >= 50) return 'bg-orange-500';
    if (wartosc >= 25) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-4">
      {/* Główny wskaźnik */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Wskaźnik ryzyka</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getKolorKategorii(wskaznik.kategoria)}`}>
            {wskaznik.kategoria.toUpperCase()}
          </span>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Wartość</span>
            <span className="text-2xl font-bold">{wskaznik.wartosc}/100</span>
          </div>
          
          {/* Pasek postępu */}
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all ${getKolorProgresu(wskaznik.wartosc)}`}
              style={{ width: `${wskaznik.wartosc}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Czynniki ryzyka */}
      {wskaznik.czynniki.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Czynniki ryzyka</h3>
          <div className="space-y-3">
            {wskaznik.czynniki.map((czynnik, index) => (
              <div key={index} className="border-l-4 border-gray-300 pl-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{czynnik.nazwa}</span>
                  <span className="text-sm font-bold text-gray-600">{czynnik.wplyw}%</span>
                </div>
                <p className="text-xs text-gray-600 mb-2">{czynnik.opis}</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{ width: `${czynnik.wplyw}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rekomendacje */}
      {wskaznik.rekomendacje.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">💡 Rekomendacje</h3>
          <ul className="list-disc list-inside space-y-1">
            {wskaznik.rekomendacje.map((rekomendacja, index) => (
              <li key={index} className="text-sm text-blue-700">{rekomendacja}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
