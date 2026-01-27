'use client';

interface DashboardKartyProps {
  dane: {
    zgodnoscMein?: {
      lacznie: number;
      zgodne: number;
      zBrakami: number;
      zNadwyzkami: number;
      sredniProcent: number;
    };
    obciazenia?: {
      lacznie: number;
      przekroczone: number;
      pelne: number;
      niskie: number;
      srednieObciazenie: number;
    };
    brakiKadrowe?: {
      lacznie: number;
      laczneGodziny: number;
      wymaganeEtaty: number;
    };
  };
}

export default function DashboardKarty({ dane }: DashboardKartyProps) {
  const zgodnosc = dane.zgodnoscMein;
  const obciazenia = dane.obciazenia;
  const braki = dane.brakiKadrowe;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Karta: Zgodność z MEiN */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Zgodność z MEiN</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {zgodnosc?.sredniProcent ? `${zgodnosc.sredniProcent.toFixed(1)}%` : '-'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {zgodnosc?.zgodne || 0} / {zgodnosc?.lacznie || 0} przedmiotów
            </p>
          </div>
          <div className="text-4xl">📊</div>
        </div>
      </div>

      {/* Karta: Braki godzin */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Braki godzin</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {zgodnosc?.zBrakami || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">Przedmiotów z brakami</p>
          </div>
          <div className="text-4xl">⚠️</div>
        </div>
      </div>

      {/* Karta: Obciążenie nauczycieli */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Średnie obciążenie</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {obciazenia?.srednieObciazenie ? `${obciazenia.srednieObciazenie.toFixed(1)}h` : '-'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {obciazenia?.lacznie || 0} nauczycieli
            </p>
          </div>
          <div className="text-4xl">👥</div>
        </div>
      </div>

      {/* Karta: Braki kadrowe */}
      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Braki kadrowe</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {braki?.lacznie || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {braki?.wymaganeEtaty || 0} etatów do uzupełnienia
            </p>
          </div>
          <div className="text-4xl">👨‍🏫</div>
        </div>
      </div>
    </div>
  );
}
