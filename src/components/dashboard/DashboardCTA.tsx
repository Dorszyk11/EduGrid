'use client';

import Link from 'next/link';

interface DashboardCTAProps {
  typSzkolyId?: string;
  rokSzkolny?: string;
}

export default function DashboardCTA({ typSzkolyId, rokSzkolny = '2024/2025' }: DashboardCTAProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Szybkie akcje</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Importuj siatkę MEiN */}
        <Link
          href="/import/mein-pdf"
          className="flex flex-col items-center justify-center p-6 bg-blue-50 hover:bg-blue-100 rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-all cursor-pointer"
        >
          <div className="text-4xl mb-2">📄</div>
          <h3 className="font-semibold text-lg mb-1">Importuj siatkę MEiN</h3>
          <p className="text-sm text-gray-600 text-center">Import z pliku PDF (OCR)</p>
        </Link>

        {/* Utwórz/edytuj siatkę szkoły */}
        <Link
          href="/panel-admin"
          className="flex flex-col items-center justify-center p-6 bg-green-50 hover:bg-green-100 rounded-lg border-2 border-green-200 hover:border-green-400 transition-all cursor-pointer"
        >
          <div className="text-4xl mb-2">📊</div>
          <h3 className="font-semibold text-lg mb-1">Siatka szkoły</h3>
          <p className="text-sm text-gray-600 text-center">Utwórz/edytuj plan godzin</p>
        </Link>

        {/* Dodaj klasy/profile */}
        <Link
          href="/panel-admin"
          className="flex flex-col items-center justify-center p-6 bg-purple-50 hover:bg-purple-100 rounded-lg border-2 border-purple-200 hover:border-purple-400 transition-all cursor-pointer"
        >
          <div className="text-4xl mb-2">🏫</div>
          <h3 className="font-semibold text-lg mb-1">Klasy i profile</h3>
          <p className="text-sm text-gray-600 text-center">Dodaj klasy i profile</p>
        </Link>

        {/* Dodaj nauczycieli */}
        <Link
          href="/panel-admin"
          className="flex flex-col items-center justify-center p-6 bg-orange-50 hover:bg-orange-100 rounded-lg border-2 border-orange-200 hover:border-orange-400 transition-all cursor-pointer"
        >
          <div className="text-4xl mb-2">👨‍🏫</div>
          <h3 className="font-semibold text-lg mb-1">Nauczyciele</h3>
          <p className="text-sm text-gray-600 text-center">Dodaj nauczycieli</p>
        </Link>

        {/* Wygeneruj propozycję przydziału */}
        <Link
          href="/przydzial"
          className="flex flex-col items-center justify-center p-6 bg-indigo-50 hover:bg-indigo-100 rounded-lg border-2 border-indigo-200 hover:border-indigo-400 transition-all cursor-pointer"
        >
          <div className="text-4xl mb-2">⚙️</div>
          <h3 className="font-semibold text-lg mb-1">Przydział</h3>
          <p className="text-sm text-gray-600 text-center">Wygeneruj propozycję</p>
        </Link>

        {/* Eksport do XLS */}
        <button
          onClick={async () => {
            if (!typSzkolyId) {
              alert('Wybierz typ szkoły przed eksportem');
              return;
            }
            const url = `/api/export/xls?typSzkolyId=${typSzkolyId}&rokSzkolny=${rokSzkolny}&typ=arkusz-organizacyjny`;
            
            try {
              const response = await fetch(url);
              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Błąd przy eksporcie');
              }
              
              const blob = await response.blob();
              const downloadUrl = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = downloadUrl;
              a.download = `Arkusz_organizacyjny_${rokSzkolny.replace('/', '_')}.xlsx`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(downloadUrl);
            } catch (error) {
              console.error('Błąd eksportu:', error);
              alert(error instanceof Error ? error.message : 'Błąd przy eksporcie do XLS');
            }
          }}
          className="flex flex-col items-center justify-center p-6 bg-teal-50 hover:bg-teal-100 rounded-lg border-2 border-teal-200 hover:border-teal-400 transition-all cursor-pointer"
        >
          <div className="text-4xl mb-2">📥</div>
          <h3 className="font-semibold text-lg mb-1">Eksport do XLS</h3>
          <p className="text-sm text-gray-600 text-center">Arkusz organizacyjny</p>
        </button>
      </div>
    </div>
  );
}
