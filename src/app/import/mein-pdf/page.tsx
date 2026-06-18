'use client';

import ImportMeinPdf from '@/components/import/ImportMeinPdf';
import Icon from '@/components/ui/Icon';

export default function ImportMeinPdfPage() {
  return (
    <div className="flex flex-col gap-6">
      <div role="status" className="flex items-start gap-3 rounded-card border border-warn bg-warn-bg p-4">
        <Icon name="warning" size={20} className="mt-0.5 shrink-0 text-warn" />
        <div>
          <p className="font-semibold text-warn">Import MEiN – opcja w budowie</p>
          <p className="mt-1 text-sm text-ink-soft">
            Import PDF z ramowymi planami nauczania jest w trakcie rozwoju. Niektóre funkcje mogą nie
            działać poprawnie. Gotowe plany znajdziesz w zakładce <strong>Plany MEiN</strong>.
          </p>
        </div>
      </div>
      <ImportMeinPdf />
    </div>
  );
}
