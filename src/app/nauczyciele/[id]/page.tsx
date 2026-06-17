'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import Button, { buttonClass } from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import DataTable, { type Column } from '@/components/ui/DataTable';
import AsyncSection from '@/components/ui/AsyncSection';
import StatusPill from '@/components/ui/StatusPill';
import Icon from '@/components/ui/Icon';
import { useResource } from '@/lib/hooks/useResource';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { useToast } from '@/components/ui/Toast';
import type { NauczycielSzczegoly } from '@/types/api';

type ObciazenieRow = NauczycielSzczegoly['obciazenie'][number];

export default function NauczycielPage() {
  const params = useParams();
  const nauczycielId = params.id as string;
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [usuwanieId, setUsuwanieId] = useState<string | number | null>(null);

  const { data, loading, error, reload } = useResource<NauczycielSzczegoly>(async (signal) => {
    const res = await fetch(`/api/nauczyciele/${nauczycielId}`, { signal });
    if (!res.ok) throw new Error(`Błąd pobierania (HTTP ${res.status})`);
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json;
  }, [nauczycielId]);

  const usunPrzypisanie = async (rozkladId: string | number) => {
    const ok = await confirm({
      title: 'Usunąć przypisanie?',
      description: 'Przypisanie godzin zostanie usunięte z obciążenia nauczyciela.',
      confirmLabel: 'Usuń',
      tone: 'danger',
    });
    if (!ok) return;
    setUsuwanieId(rozkladId);
    try {
      const res = await fetch(`/api/nauczyciele/obciazenie/${rozkladId}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Błąd usuwania');
      toast.success('Przypisanie usunięte.');
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Błąd usuwania');
    } finally {
      setUsuwanieId(null);
    }
  };

  const columns: Column<ObciazenieRow>[] = [
    {
      key: 'klasa',
      header: 'Klasa',
      render: (o) => (
        <Link href={`/klasy/${o.klasa.id}`} className="font-medium text-accent hover:underline">
          {o.klasa.nazwa}
        </Link>
      ),
    },
    {
      key: 'przedmiot',
      header: 'Przedmiot',
      render: (o) => (
        <Link href={`/przedmioty/${o.przedmiot.id}`} className="text-accent hover:underline">
          {o.przedmiot.nazwa}
        </Link>
      ),
    },
    { key: 'rok', header: 'Rok', align: 'center', render: (o) => o.rok ?? '—' },
    {
      key: 'godz',
      header: 'Godz./tyg',
      align: 'center',
      render: (o) => <span className="tabular-nums">{o.godziny_tyg}</span>,
    },
    { key: 'rokszk', header: 'Rok szkolny', align: 'center', render: (o) => o.rok_szkolny },
    {
      key: 'akcje',
      header: '',
      align: 'right',
      render: (o) =>
        o.id != null ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:bg-danger-bg hover:text-danger"
            onClick={() => usunPrzypisanie(o.id!)}
            disabled={usuwanieId === o.id}
          >
            <Icon name="trash" size={14} />
            {usuwanieId === o.id ? 'Usuwanie…' : 'Usuń'}
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <AsyncSection loading={loading} error={error} loadingLabel="Ładowanie danych nauczyciela...">
        {data && (
          <>
            <PageHeader
              title={`${data.nauczyciel.imie} ${data.nauczyciel.nazwisko}`}
              description={[data.nauczyciel.email, data.nauczyciel.telefon].filter(Boolean).join(' • ')}
              actions={
                <Link href="/nauczyciele" className={buttonClass('ghost')}>
                  <Icon name="back" size={16} />
                  Nauczyciele
                </Link>
              }
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card>
                <p className="text-sm text-ink-soft">Godziny tygodniowo</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-ink">
                  {data.podsumowanie.suma_godzin_tyg}
                </p>
              </Card>
              <Card>
                <p className="text-sm text-ink-soft">Procent obciążenia</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-ink">
                  {data.podsumowanie.procent_obciazenia}%
                </p>
              </Card>
              <Card className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-ink-soft">Status</p>
                  <p className="mt-1 text-xs text-ink-faint">
                    Etat: {data.nauczyciel.etat ?? '—'} • Max {data.nauczyciel.max_obciazenie ?? '—'} h/tyg
                  </p>
                </div>
                <StatusPill status={data.podsumowanie.status} />
              </Card>
            </div>

            <p className="text-sm text-ink-soft">
              Liczba klas: <strong className="text-ink">{data.podsumowanie.liczba_klas}</strong> • Liczba przedmiotów:{' '}
              <strong className="text-ink">{data.podsumowanie.liczba_przedmiotow}</strong>
            </p>

            {data.podsumowanie.roznica !== 0 && (
              <div
                className={`rounded-card border p-3 text-sm ${
                  data.podsumowanie.roznica > 0
                    ? 'border-danger bg-danger-bg text-danger'
                    : 'border-warn bg-warn-bg text-warn'
                }`}
              >
                {data.podsumowanie.roznica > 0 ? 'Przekroczono' : 'Niedociążenie'} o{' '}
                {Math.abs(data.podsumowanie.roznica)} godzin tygodniowo.
              </div>
            )}

            {data.kwalifikacje.length > 0 && (
              <Card>
                <h2 className="mb-3 text-lg font-semibold text-ink">Kwalifikacje</h2>
                <ul className="space-y-2">
                  {data.kwalifikacje.map((kwal, i) => (
                    <li key={i} className="flex items-center justify-between rounded bg-surface-2 px-3 py-2">
                      <span className="font-medium text-ink">{kwal.przedmiot.nazwa}</span>
                      <span className="text-sm text-ink-soft">
                        {[kwal.specjalizacja, kwal.stopien].filter(Boolean).join(' • ')}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-ink">Obciążenie szczegółowe</h2>
              <DataTable
                columns={columns}
                rows={data.obciazenie}
                getRowKey={(o, i) => o.id ?? i}
                empty="Brak przypisanych godzin."
              />
            </div>
          </>
        )}
      </AsyncSection>
      {dialog}
    </div>
  );
}
