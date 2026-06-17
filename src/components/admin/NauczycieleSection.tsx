'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { useToast } from '@/components/ui/Toast';
import type { Przedmiot, NauczycielAdmin } from './types';

const INPUT = 'rounded border border-line-strong bg-surface px-3 py-2 text-ink';

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
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-soft">Imię</span>
            <input
              type="text"
              value={form.imie}
              onChange={(e) => setForm((s) => ({ ...s, imie: e.target.value }))}
              placeholder="np. Jan"
              className={`${INPUT} w-40`}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-soft">Nazwisko</span>
            <input
              type="text"
              value={form.nazwisko}
              onChange={(e) => setForm((s) => ({ ...s, nazwisko: e.target.value }))}
              placeholder="np. Kowalski"
              className={`${INPUT} w-44`}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-soft">Limit godzin (tyg.)</span>
            <input
              type="number"
              min={0}
              max={40}
              step={0.5}
              value={form.limitGodzin}
              onChange={(e) => setForm((s) => ({ ...s, limitGodzin: parseFloat(e.target.value) || 18 }))}
              placeholder="18"
              className={`${INPUT} w-24`}
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-soft">Specjalizacja (przedmioty)</span>
            {przedmioty.length === 0 ? (
              <p className="w-48 max-w-full rounded border border-line bg-warn-bg px-2 py-1.5 text-xs text-warn">
                Brak przedmiotów w bazie – nie można wybrać specjalizacji, dopóki nie pojawią się rekordy
                przedmiotów (np. z migracji lub seed).
              </p>
            ) : (
              <div className="w-48 rounded border border-line-strong bg-surface-2">
                <div className="flex max-h-20 flex-wrap gap-x-1 gap-y-0 overflow-y-auto border-b border-line p-1">
                  {widocznePrzedmioty.map((p) => (
                    <label
                      key={String(p.id)}
                      className="flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-[11px] text-ink hover:bg-surface-2"
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
                        className="h-3 w-3 rounded border-line-strong text-accent focus:ring-accent"
                      />
                      <span>{p.nazwa}</span>
                    </label>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Szukaj przedmiotu…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-b px-2 py-1 text-xs focus:border-accent focus:ring-1 focus:ring-accent"
                />
                {form.przedmiotyIds.length > 0 && (
                  <p className="border-t border-line px-1 pb-1 pt-0.5 text-[10px] text-ink-faint">
                    Wybrano: {form.przedmiotyIds.length}
                  </p>
                )}
              </div>
            )}
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Dodawanie…' : 'Dodaj nauczyciela'}
          </Button>
        </form>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line bg-surface-2">
                <th className="px-4 py-2 text-sm font-medium text-ink-soft">Imię</th>
                <th className="px-4 py-2 text-sm font-medium text-ink-soft">Nazwisko</th>
                <th className="px-4 py-2 text-sm font-medium text-ink-soft">Limit godz.</th>
                <th className="px-4 py-2 text-sm font-medium text-ink-soft">Specjalizacja</th>
                <th className="w-24 px-4 py-2 text-right text-sm font-medium text-ink-soft">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {nauczyciele.map((n) => (
                <tr key={String(n.id)} className="border-b border-line last:border-0 hover:bg-surface-2">
                  <td className="px-4 py-2 font-medium text-ink">{n.imie}</td>
                  <td className="px-4 py-2 font-medium text-ink">{n.nazwisko}</td>
                  <td className="px-4 py-2 text-ink-soft">{n.max_obciazenie ?? 18}</td>
                  <td className="px-4 py-2 text-ink-soft">
                    {n.przedmioty?.length ? n.przedmioty.map((p) => p.nazwa ?? p.id).join(', ') : '–'}
                  </td>
                  <td className="px-4 py-2 text-right">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {nauczyciele.length === 0 && (
            <p className="py-6 text-center text-sm text-ink-faint">Brak nauczycieli. Dodaj pierwszego powyżej.</p>
          )}
        </div>
      </div>
      {dialog}
    </section>
  );
}
