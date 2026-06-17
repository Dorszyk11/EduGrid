'use client';

import { useState } from 'react';
import ImportMeinPdf from '@/components/import/ImportMeinPdf';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';

export default function ImportMeinPdfPage() {
  const [dismissed, setDismissed] = useState(false);

  if (!dismissed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
        <div className="max-w-md rounded-card bg-surface p-6 shadow-pop">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warn-bg text-warn">
            <Icon name="warning" size={24} />
          </div>
          <h2 className="text-lg font-semibold text-ink">Import MEiN – opcja w budowie</h2>
          <p className="mt-2 text-ink-soft">
            Import PDF z ramowymi planami nauczania jest w trakcie rozwoju. Niektóre funkcje mogą nie
            działać poprawnie. Obecnie możesz przeglądać plany w zakładce <strong>Plany MEiN</strong>.
          </p>
          <div className="mt-6 flex justify-end">
            <Button type="button" onClick={() => setDismissed(true)}>
              Rozumiem, przejdź dalej
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <ImportMeinPdf />;
}
