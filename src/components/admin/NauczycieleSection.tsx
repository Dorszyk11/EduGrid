'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import DataTable, { type Column } from '@/components/ui/DataTable';
import { PUSTA } from '@/lib/status-realizacji';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { useToast } from '@/components/ui/Toast';
import type { Przedmiot, NauczycielAdmin } from './types';

interface NauczycieleSectionProps {
  przedmioty: Przedmiot[];
  nauczyciele: NauczycielAdmin[];
  reload: () => void;
}

export default function NauczycieleSection({ przedmioty, nauczyciele, reload }: NauczycieleSectionProps) {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [form, setForm] = useState({
    imie: '',
    nazwisko: '',
    przedmiotyIds: [] as string[],
    limitGodzin: 18,
  });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { imie, nazwisko, przedmiotyIds, limitGodzin } = form;
    if (!imie.trim() || !nazwisko.trim()) {
      toast.error('Wypełnij imię i nazwisko.');
      return;
    }
    const lim = Number(limitGodzin);
    if (Number.isNaN(lim) || lim < 0 || lim > 40) {
      toast.error('Limit godzin musi być między 0 a 40.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/nauczyciele', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imie: imie.trim(),
          nazwisko: nazwisko.trim(),
          przedmioty: przedmiotyIds.filter(Boolean),
          max_obciazenie: lim,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      toast.success('Nauczyciel został dodany.');
      setForm({ imie: '', nazwisko: '', przedmiotyIds: [], limitGodzin: 18 });
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd dodawania.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (n: NauczycielAdmin) => {
    const ok = await confirm({
      title: 'Usunąć nauczyciela?',
      description: `„${n.imie} ${n.nazwisko}" zostanie usunięty.`,
      confirmLabel: 'Usuń',
      tone: 'danger',
    });
    if (!ok) return;
    const id = String(n.id);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/nauczyciele/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      toast.success('Nauczyciel został usunięty.');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd usuwania.');
    } finally {
      setDeletingId(null);
    }
  };

  const widocznePrzedmioty = przedmioty.filter(
    (p) => !search.trim() || p.nazwa.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const columns: Column<NauczycielAdmin>[] = [
    { key: 'imie', header: 'Imię', render: (n) => <span className="font-medium text-ink">{n.imie}</span> },
    { key: 'nazwisko', header: 'Nazwisko', render: (n) => <span className="font-medium text-ink">{n.nazwisko}</span> },
    {
      key: 'limit',
      header: 'Limit godz.',
      align: 'right',
      render: (n) => (
        <span className="text-ink-soft tabular-nums">{n.max_obciazenie ?? PUSTA}</span>
      ),
    },
    {
      key: 'specjalizacja',
      header: 'Specjalizacja',
      render: (n) => (
        <span className="text-ink-soft">
          {n.przedmioty?.length ? n.przedmioty.map((p) => p.nazwa ?? p.id).join(', ') : PUSTA}
        </span>
      ),
    },
    {
      key: 'akcje',
      header: 'Akcje',
      align: 'right',
      className: 'w-24',
      render: (n) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-danger hover:bg-danger-bg hover:text-danger"
          onClick={() => handleDelete(n)}
          disabled={deletingId === String(n.id)}
        >
          <Icon name="trash" size={14} />
          {deletingId === String(n.id) ? '…' : 'Usuń'}
        </Button>
      ),
    },
  ];

  return (
    <section className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <div className="border-b border-line bg-surface-2 px-5 py-4">
        <h2 className="text-lg font-semibold text-ink">Nauczyciele</h2>
        <p className="mt-0.5 text-sm text-ink-soft">
          Dodaj nauczyciela: imię, nazwisko, limit godzin i specjalizację (przedmioty z listy).
        </p>
      </div>
      <div className="space-y-5 p-5">
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-4">
          <div className="w-40">
            <Field label="Imię" htmlFor="naucz-imie">
              <Input
                id="naucz-imie"
                type="text"
                value={form.imie}
                onChange={(e) => setForm((s) => ({ ...s, imie: e.target.value }))}
                placeholder="np. Jan"
              />
            </Field>
          </div>
          <div className="w-44">
            <Field label="Nazwisko" htmlFor="naucz-nazwisko">
              <Input
                id="naucz-nazwisko"
                type="text"
                value={form.nazwisko}
                onChange={(e) => setForm((s) => ({ ...s, nazwisko: e.target.value }))}
                placeholder="np. Kowalski"
              />
            </Field>
          </div>
          <div className="w-28">
            <Field label="Limit godzin (tyg.)" htmlFor="naucz-limit">
              <Input
                id="naucz-limit"
                type="number"
                min={0}
                max={40}
                step={0.5}
                value={form.limitGodzin}
                onChange={(e) => setForm((s) => ({ ...s, limitGodzin: parseFloat(e.target.value) || 18 }))}
                placeholder="18"
                className="tabular-nums"
              />
            </Field>
          </div>
          <div className="flex flex-col gap-1.5">
            <span id="naucz-spec-label" className="text-sm font-medium text-ink-soft">
              Specjalizacja (przedmioty)
            </span>
            {przedmioty.length === 0 ? (
              <p className="w-64 max-w-full rounded-sm border border-line bg-warn-bg px-2 py-1.5 text-xs text-warn">
                Brak przedmiotów w bazie – nie można wybrać specjalizacji, dopóki nie pojawią się rekordy
                przedmiotów (np. z migracji lub seed).
              </p>
            ) : (
              <div
                role="group"
                aria-labelledby="naucz-spec-label"
                className="w-64 rounded-sm border border-line-strong bg-surface-2"
              >
                <div className="flex max-h-40 flex-wrap gap-x-1 gap-y-0.5 overflow-y-auto border-b border-line p-1.5">
                  {widocznePrzedmioty.map((p) => (
                    <label
                      key={String(p.id)}
                      className="flex cursor-pointer items-center gap-1 rounded-sm px-1 py-0.5 text-xs text-ink hover:bg-surface"
                    >
                      <input
                        type="checkbox"
                        checked={form.przedmiotyIds.includes(String(p.id))}
                        onChange={(e) => {
                          const id = String(p.id);
                          setForm((s) => ({
                            ...s,
                            przedmiotyIds: e.target.checked
                              ? [...s.przedmiotyIds, id]
                              : s.przedmiotyIds.filter((x) => x !== id),
                          }));
                        }}
                        className="h-3 w-3 rounded-sm border-line-strong text-accent focus:ring-accent"
                      />
                      <span>{p.nazwa}</span>
                    </label>
                  ))}
                  {widocznePrzedmioty.length === 0 && (
                    <p className="px-1 py-0.5 text-xs text-ink-faint" role="status" aria-live="polite">
                      Brak wyników dla „{search.trim()}”.
                    </p>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Szukaj przedmiotu…"
                  value={search}
                  aria-label="Szukaj przedmiotu"
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-sm bg-surface px-2 py-1.5 text-xs text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent"
                />
                <p className="border-t border-line px-2 py-1 text-xs text-ink-faint tabular-nums" aria-live="polite">
                  Widocznych: {widocznePrzedmioty.length} / {przedmioty.length} · wybrano:{' '}
                  {form.przedmiotyIds.length}
                </p>
              </div>
            )}
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Dodawanie…' : 'Dodaj nauczyciela'}
          </Button>
        </form>
        <div className="mt-6">
          <DataTable
            columns={columns}
            rows={nauczyciele}
            getRowKey={(n) => String(n.id)}
            empty="Brak nauczycieli. Dodaj pierwszego powyżej."
          />
        </div>
      </div>
      {dialog}
    </section>
  );
}
