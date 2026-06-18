'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import DataTable, { type Column } from '@/components/ui/DataTable';
import StatusPill from '@/components/ui/StatusPill';
import Icon from '@/components/ui/Icon';
import { PUSTA } from '@/lib/status-realizacji';

interface Mapowanie {
  id: string;
  nazwa_mein: string;
  nazwa_szkola: string;
  typ: 'przedmiot' | 'typ_szkoly';
  aktywne: boolean;
  uwagi?: string;
}

const SELECT_CLASS = 'w-full rounded-sm border border-line-strong bg-surface px-3 py-2 text-sm text-ink';

/** Neutralna etykieta kategorii (typ mapowania) — nie jest statusem, więc nie używa StatusPill. */
function KategoriaBadge({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  const cls = accent ? 'bg-accent-weak text-accent-strong' : 'bg-surface-2 text-ink-soft';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>
  );
}

export default function MapowaniaPage() {
  const router = useRouter();
  const [mapowania, setMapowania] = useState<Mapowanie[]>([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtrTyp, setFiltrTyp] = useState<'wszystkie' | 'przedmiot' | 'typ_szkoly'>('wszystkie');
  const [tylkoAktywne, setTylkoAktywne] = useState(true);

  useEffect(() => {
    pobierzMapowania();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtrTyp, tylkoAktywne]);

  const pobierzMapowania = async () => {
    setLadowanie(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filtrTyp !== 'wszystkie') params.append('typ', filtrTyp);
      if (tylkoAktywne) params.append('aktywne', 'true');

      const response = await fetch(`/api/mapowania?${params.toString()}`);
      if (!response.ok) throw new Error('Błąd przy pobieraniu mapowań');
      const data = await response.json();
      setMapowania(data.mapowania || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nieznany błąd');
      setMapowania([]);
    } finally {
      setLadowanie(false);
    }
  };

  const columns: Column<Mapowanie>[] = [
    {
      key: 'mein',
      header: 'Nazwa MEiN',
      render: (m) => <span className="font-medium text-ink">{m.nazwa_mein}</span>,
    },
    { key: 'szkola', header: 'Nazwa w szkole', render: (m) => m.nazwa_szkola },
    {
      key: 'typ',
      header: 'Typ',
      render: (m) => (
        <KategoriaBadge accent={m.typ === 'przedmiot'}>
          {m.typ === 'przedmiot' ? 'Przedmiot' : 'Typ szkoły'}
        </KategoriaBadge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (m) => (
        <StatusPill status={m.aktywne ? 'OK' : 'NIEAKTYWNE'} label={m.aktywne ? 'Aktywne' : 'Nieaktywne'} />
      ),
    },
    { key: 'uwagi', header: 'Uwagi', render: (m) => <span className="text-ink-soft">{m.uwagi || PUSTA}</span> },
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Mapowania nazw MEiN ↔ szkoła"
        description="Dopasowanie nazw z dokumentacji MEiN do nazw używanych w szkole."
        actions={
          <Button variant="ghost" onClick={() => router.push('/dashboard')}>
            <Icon name="back" size={16} />
            Dashboard
          </Button>
        }
      />

      <Card>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="filtr-typ" className="mb-1 block text-sm font-medium text-ink-soft">
              Typ mapowania
            </label>
            <select
              id="filtr-typ"
              value={filtrTyp}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'wszystkie' || value === 'przedmiot' || value === 'typ_szkoly') {
                  setFiltrTyp(value);
                }
              }}
              className={SELECT_CLASS}
            >
              <option value="wszystkie">Wszystkie</option>
              <option value="przedmiot">Przedmioty</option>
              <option value="typ_szkoly">Typy szkół</option>
            </select>
          </div>
          <label className="flex items-center gap-2 pt-7 text-sm text-ink">
            <input
              type="checkbox"
              checked={tylkoAktywne}
              onChange={(e) => setTylkoAktywne(e.target.checked)}
              className="rounded-sm border-line-strong text-accent focus:ring-accent"
            />
            Tylko aktywne
          </label>
        </div>
      </Card>

      <DataTable
        columns={columns}
        rows={mapowania}
        getRowKey={(m) => m.id}
        loading={ladowanie}
        error={error}
        empty="Brak mapowań. Mapowania powstają automatycznie podczas importu siatki godzin MEiN z PDF."
      />

      <Card className="flex gap-3 bg-accent-weak">
        <Icon name="info" size={18} className="mt-0.5 shrink-0 text-accent" />
        <p className="text-sm text-ink-soft">
          Mapowania pozwalają automatycznie dopasować nazwy z dokumentacji MEiN do nazw używanych w szkole.
          Podczas importu siatki godzin MEiN z PDF system użyje mapowań do znalezienia odpowiednich przedmiotów
          i typów szkół w bazie.
        </p>
      </Card>
    </div>
  );
}
