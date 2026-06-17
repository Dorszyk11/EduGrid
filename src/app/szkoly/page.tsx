'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import Button, { buttonClass } from '@/components/ui/Button';
import DataTable, { type Column } from '@/components/ui/DataTable';
import Icon from '@/components/ui/Icon';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { useToast } from '@/components/ui/Toast';

interface TypSzkoly {
  id: string | number;
  nazwa: string;
  liczba_lat?: number;
  kod_mein?: string;
}

export default function ZarzadzanieSzkolamiPage() {
  const [szkoly, setSzkoly] = useState<TypSzkoly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [resetting, setResetting] = useState(false);
  const { confirm, dialog } = useConfirm();
  const toast = useToast();

  const fetchSzkoly = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/typy-szkol', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setSzkoly(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd pobierania');
      setSzkoly([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSzkoly();
  }, []);

  const handleResetAndSchools = async () => {
    const ok = await confirm({
      title: 'Zresetować bazę?',
      description:
        'Usunie wszystkie dane testowe (rozkłady, siatki, kwalifikacje, klasy, zawody, mapowania, nauczycieli, przedmioty, typy szkół) i doda tylko typy szkół z planów MEiN.',
      confirmLabel: 'Zresetuj i załaduj',
      tone: 'danger',
    });
    if (!ok) return;
    setResetting(true);
    try {
      const res = await fetch('/api/seed/reset-and-schools', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      toast.success(`Gotowe. Dodano ${data.schoolsCreated ?? 0} typów szkół z planów MEiN.`);
      fetchSzkoly();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Błąd podczas resetu i ładowania szkół');
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async (s: TypSzkoly) => {
    const ok = await confirm({
      title: 'Usunąć typ szkoły?',
      description: `„${s.nazwa}" zostanie usunięty z bazy.`,
      confirmLabel: 'Usuń',
      tone: 'danger',
    });
    if (!ok) return;
    const id = String(s.id);
    setDeletingId(s.id);
    try {
      const res = await fetch(`/api/typy-szkol/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      toast.success('Typ szkoły usunięty.');
      fetchSzkoly();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Błąd podczas usuwania');
    } finally {
      setDeletingId(null);
    }
  };

  const columns: Column<TypSzkoly>[] = [
    {
      key: 'nazwa',
      header: 'Nazwa',
      render: (s) => <span className="font-medium text-ink">{s.nazwa}</span>,
    },
    { key: 'kod', header: 'Kod MEiN', render: (s) => s.kod_mein ?? '–' },
    { key: 'lata', header: 'Lata', align: 'center', render: (s) => s.liczba_lat ?? '–' },
    {
      key: 'akcje',
      header: '',
      align: 'right',
      render: (s) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-danger hover:bg-danger-bg hover:text-danger"
          onClick={() => handleDelete(s)}
          disabled={deletingId === s.id}
        >
          <Icon name="trash" size={14} />
          {deletingId === s.id ? 'Usuwanie…' : 'Usuń'}
        </Button>
      ),
    },
  ];

  return (
    <div className="max-w-4xl space-y-6 p-6 md:p-8">
      <PageHeader
        title="Zarządzanie szkołami"
        description="Typy szkół w bazie. Możesz je usunąć lub dodać w Panelu admina."
        actions={
          <>
            <Button variant="secondary" onClick={handleResetAndSchools} disabled={resetting}>
              <Icon name="reset" size={16} />
              {resetting ? 'Resetowanie…' : 'Reset bazy z planów MEiN'}
            </Button>
            <Link href="/panel-admin" className={buttonClass('primary')}>
              <Icon name="plus" size={16} />
              Panel admina
            </Link>
          </>
        }
      />

      <DataTable
        columns={columns}
        rows={szkoly}
        getRowKey={(s) => String(s.id)}
        loading={loading}
        error={error}
        empty={
          <>
            Brak typów szkół. Użyj „Reset bazy z planów MEiN” powyżej albo dodaj je w{' '}
            <Link href="/panel-admin" className="text-accent hover:underline">
              Panelu admina
            </Link>
            .
          </>
        }
      />
      {dialog}
    </div>
  );
}
