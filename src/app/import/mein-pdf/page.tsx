'use client';

import { useState } from 'react';
import ImportMeinPdf from '@/components/import/ImportMeinPdf';

export default function ImportMeinPdfPage() {
  const [dismissed, setDismissed] = useState(false);

  if (!dismissed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="max-w-md rounded-xl bg-white p-6 shadow-xl">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
            ⚠️
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Import MEiN – opcja w budowie</h2>
          <p className="mt-2 text-gray-600">
            Import PDF z ramowymi planami nauczania jest w trakcie rozwoju. Niektóre funkcje mogą nie
            działać poprawnie. Obecnie możesz przeglądać plany w zakładce <strong>Plany MEiN</strong>.
          </p>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Rozumiem, przejdź dalej
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <ImportMeinPdf />;
}
