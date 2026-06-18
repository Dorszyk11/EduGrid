'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getZapamietanyTypSzkoly, zapiszTypSzkoly } from '@/utils/typSzkolyStorage';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import DataTable, { type Column } from '@/components/ui/DataTable';
import { buttonClass } from '@/components/ui/Button';
import Field from '@/components/ui/Field';
import Select from '@/components/ui/Select';
import Icon from '@/components/ui/Icon';
import { PUSTA } from '@/lib/status-realizacji';

interface TypSzkoly {
  id: string;
  nazwa: string;
}

interface Klasa {
  id: string;
  nazwa: string;
  rok_szkolny: string;
  profil: string | null;
  typ_szkoly: { id: string; nazwa?: string } | null;
}

export default function KlasyPage() {
  const [klasy, setKlasy] = useState<Klasa[]>([]);
  const [typySzkol, setTypySzkol] = useState<TypSzkoly[]>([]);
  const [typSzkolyId, setTypSzkolyId] = useState<string>('');
  const [ladowanie, setLadowanie] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/typy-szkol', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.error) return;
        const list = Array.isArray(data) ? data : (data?.typySzkol ?? []);
        const mapped = (list as Array<{ id: string | number; nazwa?: string }>).map((t) => ({ id: String(t.id), nazwa: t.nazwa || 'Brak nazwy' }));
        setTypySzkol(mapped);
        const zap = getZapamietanyTypSzkoly();
        if (zap && mapped.some((t: { id: string }) => t.id === zap)) setTypSzkolyId(zap);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    pobierzKlasy();
  }, [typSzkolyId]);

  const pobierzKlasy = async () => {
    setLadowanie(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (typSzkolyId) params.set('typSzkolyId', typSzkolyId);
      const res = await fetch(`/api/klasy?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setKlasy(data.klasy ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd pobierania');
      setKlasy([]);
    } finally {
      setLadowanie(false);
    }
  };

  const kolumny: Column<Klasa>[] = [
    { key: 'lp', header: 'Lp.', render: (_, i) => <span className="text-ink-faint">{i + 1}</span> },
    {
      key: 'nazwa',
      header: 'Nazwa',
      render: (k) => (
        <Link href={`/klasy/${k.id}`} className="font-medium text-accent hover:text-accent-strong">
          {k.nazwa}
        </Link>
      ),
    },
    { key: 'typ', header: 'Typ szkoły', render: (k) => <span className="text-ink-soft">{k.typ_szkoly?.nazwa ?? PUSTA}</span> },
    { key: 'rok', header: 'Rok szkolny (zakres cyklu)', render: (k) => <span className="tabular-nums text-ink-soft">{k.rok_szkolny}</span> },
    { key: 'profil', header: 'Profil', render: (k) => <span className="text-ink-faint">{k.profil ?? PUSTA}</span> },
    {
      key: 'akcje',
      header: 'Akcje',
      align: 'right',
      render: (k) => (
        <Link href={`/klasy/${k.id}`} className="text-accent hover:text-accent-strong">
          Szczegóły
        </Link>
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <PageHeader
        title="Klasy"
        description="Oddziały konta wraz z typem szkoły i rokiem cyklu."
        actions={
          <Link href="/dashboard" className={buttonClass('secondary')}>
            <Icon name="back" size={16} />
            Dashboard
          </Link>
        }
      />

      <Card className="space-y-3">
        <h2 className="font-display text-base font-semibold text-ink">Filtruj po typie szkoły</h2>
        <div className="max-w-md">
          <Field label="Typ szkoły" htmlFor="filtr-typ">
            <Select
              id="filtr-typ"
              value={typSzkolyId}
              onChange={(e) => {
                const v = e.target.value;
                zapiszTypSzkoly(v);
                setTypSzkolyId(v);
              }}
            >
              <option value="">Wszystkie typy</option>
              {typySzkol.map((t) => (
                <option key={t.id} value={t.id}>{t.nazwa}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="font-display text-base font-semibold text-ink">
          Lista klas <span className="text-ink-faint tabular-nums">({klasy.length})</span>
        </h2>
        <DataTable
          columns={kolumny}
          rows={klasy}
          getRowKey={(k) => k.id}
          loading={ladowanie}
          error={error}
          empty={
            <span>
              Brak klas dla wybranego typu szkoły. Dodaj klasy w{' '}
              <Link href="/panel-admin" className="text-accent hover:text-accent-strong">panelu admina</Link>{' '}
              lub wybierz inny typ powyżej.
            </span>
          }
        />
      </section>
    </div>
  );
}
