'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Icon, { type IconName } from '@/components/ui/Icon';

interface TypSzkoly {
  id: string;
  nazwa: string;
}

const SELECT_CLASS = 'w-full rounded-sm border border-line-strong bg-surface px-3 py-2 text-sm text-ink';

const RAPORTY: { typ: string; icon: IconName; tytul: string; opis: string }[] = [
  {
    typ: 'zgodnosc-mein',
    icon: 'success',
    tytul: 'Raport zgodności MEiN',
    opis: 'Szczegółowy raport zgodności planowanych godzin z wymaganiami MEiN dla każdej klasy i przedmiotu.',
  },
  {
    typ: 'obciazenia',
    icon: 'chart',
    tytul: 'Raport obciążeń nauczycieli',
    opis: 'Analiza obciążeń godzinowych nauczycieli, wykrywanie przeciążeń i niedociążeń.',
  },
  {
    typ: 'braki-kadrowe',
    icon: 'warning',
    tytul: 'Raport braków kadrowych',
    opis: 'Lista przedmiotów i klas bez przypisanych nauczycieli z sugerowanymi rozwiązaniami.',
  },
  {
    typ: 'arkusz-organizacyjny',
    icon: 'file',
    tytul: 'Arkusz organizacyjny',
    opis: 'Pełny arkusz organizacyjny szkoły z możliwością eksportu do XLS.',
  },
];

export default function RaportyPage() {
  const router = useRouter();
  const [typySzkol, setTypySzkol] = useState<TypSzkoly[]>([]);
  const [typSzkolyId, setTypSzkolyId] = useState<string>('');
  const [rokSzkolny, setRokSzkolny] = useState<string>('2024/2025');

  useEffect(() => {
    pobierzTypySzkol();
  }, []);

  const pobierzTypySzkol = async () => {
    try {
      const response = await fetch('/api/typy-szkol', { cache: 'no-store' });
      const data = await response.json();
      const list = Array.isArray(data) ? data : (data?.typySzkol ?? []);
      setTypySzkol(
        list.map((t: { id: string; nazwa?: string }) => ({ id: String(t.id), nazwa: t.nazwa ?? 'Brak nazwy' })),
      );
    } catch (error) {
      console.error('Błąd przy pobieraniu typów szkół:', error);
    }
  };

  const linkRaportu = (typ: string) =>
    typSzkolyId ? `/raporty/${typ}?typSzkolyId=${typSzkolyId}&rokSzkolny=${rokSzkolny}` : '#';

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Raporty"
        actions={
          <Button variant="ghost" onClick={() => router.push('/dashboard')}>
            <Icon name="back" size={16} />
            Dashboard
          </Button>
        }
      />

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-ink">Parametry raportu</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="typ-szkoly" className="mb-1 block text-sm font-medium text-ink-soft">
              Typ szkoły *
            </label>
            <select
              id="typ-szkoly"
              value={typSzkolyId}
              onChange={(e) => setTypSzkolyId(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Wybierz typ szkoły</option>
              {typySzkol.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nazwa}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="rok-szkolny" className="mb-1 block text-sm font-medium text-ink-soft">
              Rok szkolny
            </label>
            <input
              id="rok-szkolny"
              type="text"
              value={rokSzkolny}
              onChange={(e) => setRokSzkolny(e.target.value)}
              placeholder="2024/2025"
              className={SELECT_CLASS}
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {RAPORTY.map((r) => {
          const disabled = !typSzkolyId;
          return (
            <Link
              key={r.typ}
              href={linkRaportu(r.typ)}
              aria-disabled={disabled}
              className={`block rounded-card border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-pop ${
                disabled ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-card bg-accent-weak text-accent">
                <Icon name={r.icon} size={20} />
              </span>
              <h3 className="mb-1 font-semibold text-ink">{r.tytul}</h3>
              <p className="text-sm text-ink-soft">{r.opis}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
