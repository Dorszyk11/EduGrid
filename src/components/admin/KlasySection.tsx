'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import DataTable, { type Column } from '@/components/ui/DataTable';
import { PUSTA } from '@/lib/status-realizacji';
import { useConfirm } from '@/lib/hooks/useConfirm';
import { useToast } from '@/components/ui/Toast';
import type { TypSzkoly, KlasaAdmin } from './types';

const LITERY_KLAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/** Opcje roku początku cyklu (np. 2022 dla technikum 2022–2027). */
function opcjeRokuPoczatku(): number[] {
  const now = new Date().getFullYear();
  const opcje: number[] = [];
  for (let y = now - 5; y <= now + 5; y++) opcje.push(y);
  return opcje;
}

interface KlasySectionProps {
  szkoly: TypSzkoly[];
  klasy: KlasaAdmin[];
  reload: () => void;
}

export default function KlasySection({ szkoly, klasy, reload }: KlasySectionProps) {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [form, setForm] = useState({ typSzkolyId: '', litera: 'A', rokPoczatku: '', profil: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const selectedTyp = szkoly.find((s) => String(s.id) === form.typSzkolyId);
  const liczbaLat = selectedTyp?.liczba_lat ?? 0;
  const rokPoczatkuNum = form.rokPoczatku ? Number(form.rokPoczatku) : NaN;
  const rokKonca = !Number.isNaN(rokPoczatkuNum) && liczbaLat > 0 ? rokPoczatkuNum + liczbaLat : null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { typSzkolyId, litera, rokPoczatku } = form;
    if (!typSzkolyId || !rokPoczatku.trim() || !litera) {
      toast.error('Wybierz typ szkoły, rok początku i literę klasy.');
      return;
    }
    const start = Number(rokPoczatku);
    if (Number.isNaN(start) || start < 2000 || start > 2040) {
      toast.error('Rok początku: 2000–2040.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/klasy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          typ_szkoly_id: typSzkolyId,
          rok_poczatku: start,
          litera: litera.trim(),
          profil: form.profil.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      toast.success(`Klasa dodana: ${data.nazwa ?? litera} (${data.rok_szkolny ?? ''}).`);
      setForm((prev) => ({ ...prev, litera: 'A', profil: '' }));
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd dodawania klasy.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (k: KlasaAdmin) => {
    const ok = await confirm({
      title: 'Usunąć klasę?',
      description: `„${k.nazwa}" (${k.rok_szkolny}) zostanie usunięta.`,
      confirmLabel: 'Usuń',
      tone: 'danger',
    });
    if (!ok) return;
    const id = String(k.id);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/klasy/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      toast.success('Klasa została usunięta.');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Błąd usuwania klasy.');
    } finally {
      setDeletingId(null);
    }
  };

  const columns: Column<KlasaAdmin>[] = [
    { key: 'nazwa', header: 'Nazwa', render: (k) => <span className="font-medium text-ink">{k.nazwa}</span> },
    { key: 'typ', header: 'Typ szkoły', render: (k) => <span className="text-ink-soft">{k.typ_szkoly?.nazwa ?? PUSTA}</span> },
    {
      key: 'rok',
      header: 'Rok szkolny (zakres)',
      render: (k) => <span className="text-ink-soft tabular-nums">{k.rok_szkolny}</span>,
    },
    { key: 'profil', header: 'Profil', render: (k) => <span className="text-ink-soft">{k.profil ?? PUSTA}</span> },
    {
      key: 'akcje',
      header: 'Akcje',
      align: 'right',
      className: 'w-24',
      render: (k) =>
        k.can_manage !== false ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:bg-danger-bg hover:text-danger"
            onClick={() => handleDelete(k)}
            disabled={deletingId === String(k.id)}
          >
            <Icon name="trash" size={14} />
            {deletingId === String(k.id) ? '…' : 'Usuń'}
          </Button>
        ) : (
          <span className="text-sm text-ink-faint" title="Tylko konto twórcy może usunąć tę klasę">
            {PUSTA}
          </span>
        ),
    },
  ];

  return (
    <section className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <div className="border-b border-line bg-surface-2 px-5 py-4">
        <h2 className="text-lg font-semibold text-ink">Dodawanie klas</h2>
        <p className="mt-0.5 text-sm text-ink-soft">
          Jedna klasa = jeden cykl (np. technikum 5 lat → rok początku 2022, rok końca 2027). Wybierz typ
          szkoły – na tej podstawie obliczy się koniec cyklu (początek + liczba lat).
        </p>
      </div>
      <div className="space-y-5 p-5">
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-4">
          <div className="w-64">
            <Field label="Rodzaj szkoły (typ)" htmlFor="klasa-typ">
              <Select
                id="klasa-typ"
                value={form.typSzkolyId}
                onChange={(e) => setForm((prev) => ({ ...prev, typSzkolyId: e.target.value }))}
              >
                <option value="">— wybierz typ szkoły —</option>
                {szkoly.map((s) => (
                  <option key={String(s.id)} value={String(s.id)}>
                    {s.nazwa} ({s.liczba_lat} lat)
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {liczbaLat > 0 && (
            <>
              <div className="w-28">
                <Field label="Rok początku cyklu" htmlFor="klasa-rok">
                  <Select
                    id="klasa-rok"
                    value={form.rokPoczatku}
                    onChange={(e) => setForm((s) => ({ ...s, rokPoczatku: e.target.value }))}
                  >
                    <option value="">{PUSTA}</option>
                    {opcjeRokuPoczatku().map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              {rokKonca != null && (
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-ink-faint">Rok końca cyklu</span>
                  <span className="text-sm font-semibold text-ink-soft tabular-nums">{rokKonca}</span>
                  <span className="text-xs text-ink-faint tabular-nums">
                    (zakres: {form.rokPoczatku}–{rokKonca})
                  </span>
                </div>
              )}
              <div className="w-24">
                <Field label="Litera (np. A, B, C)" htmlFor="klasa-litera">
                  <Select
                    id="klasa-litera"
                    value={form.litera}
                    onChange={(e) => setForm((s) => ({ ...s, litera: e.target.value }))}
                  >
                    {LITERY_KLAS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="w-48">
                <Field label="Profil (opcjonalnie)" htmlFor="klasa-profil">
                  <Input
                    id="klasa-profil"
                    type="text"
                    value={form.profil}
                    onChange={(e) => setForm((s) => ({ ...s, profil: e.target.value }))}
                    placeholder="np. matematyczno-fizyczny"
                  />
                </Field>
              </div>
              <Button type="submit" disabled={submitting || !form.rokPoczatku}>
                {submitting ? 'Dodawanie…' : 'Dodaj klasę'}
              </Button>
            </>
          )}
        </form>
        {form.typSzkolyId && liczbaLat === 0 && (
          <p className="text-sm text-warn">
            Wybrany typ szkoły nie ma ustawionej liczby lat – ustaw ją w sekcji Typy szkół.
          </p>
        )}
        <div className="mt-6">
          <DataTable
            columns={columns}
            rows={klasy}
            getRowKey={(k) => String(k.id)}
            empty="Brak klas. Dodaj pierwszą powyżej."
          />
        </div>
      </div>
      {dialog}
    </section>
  );
}
