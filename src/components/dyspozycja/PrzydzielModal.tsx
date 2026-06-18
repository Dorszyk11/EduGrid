'use client';

import Button from '@/components/ui/Button';

const SELECT_CLASS = 'border border-line-strong rounded-sm px-3 py-2 text-sm bg-surface text-ink disabled:opacity-60';

interface Nauczyciel {
  id: string;
  imie: string;
  nazwisko: string;
}

interface PrzydzielModalProps {
  nazwaPrzedmiotu: string;
  godziny: number;
  maxGodziny: number;
  onGodzinyChange: (v: number) => void;
  nauczycielId: string;
  onNauczycielChange: (v: string) => void;
  dostepniNauczyciele: Nauczyciel[];
  nauczycieleLoading: boolean;
  brakDopasowanych: boolean;
  komunikat: { typ: 'success' | 'error'; tekst: string } | null;
  zapisywanie: boolean;
  onSave: () => void;
  onClose: () => void;
}

/** Modal przydzielenia nauczyciela do przedmiotu (prezentacja; zapis steruje rodzic). */
export default function PrzydzielModal({
  nazwaPrzedmiotu,
  godziny,
  maxGodziny,
  onGodzinyChange,
  nauczycielId,
  onNauczycielChange,
  dostepniNauczyciele,
  nauczycieleLoading,
  brakDopasowanych,
  komunikat,
  zapisywanie,
  onSave,
  onClose,
}: PrzydzielModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md space-y-4 rounded-card border border-line bg-surface p-6 shadow-pop">
        <h3 className="text-base font-semibold text-ink">Przydziel nauczyciela</h3>
        <p className="text-sm text-ink-soft">
          Przedmiot: <strong className="text-ink">{nazwaPrzedmiotu}</strong>
        </p>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-soft">Ilość godzin (tyg.)</label>
          <input
            type="range"
            min={0.5}
            max={maxGodziny}
            step={0.5}
            value={godziny}
            onChange={(e) => onGodzinyChange(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-line accent-accent"
          />
          <span className="mt-1 inline-block text-sm font-medium text-ink">{godziny}</span>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-soft">Nauczyciel (ze specjalizacją)</label>
          <select
            value={nauczycielId}
            onChange={(e) => onNauczycielChange(e.target.value)}
            disabled={nauczycieleLoading}
            className={`${SELECT_CLASS} w-full`}
          >
            <option value="">{nauczycieleLoading ? 'Ładowanie...' : '— wybierz nauczyciela —'}</option>
            {!nauczycieleLoading &&
              dostepniNauczyciele.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.imie} {n.nazwisko}
                </option>
              ))}
          </select>
          {brakDopasowanych && (
            <p className="mt-1 text-xs text-warn">Brak nauczycieli ze specjalizacją do tego przedmiotu.</p>
          )}
        </div>
        {komunikat && (
          <div
            className={`rounded p-2 text-sm ${
              komunikat.typ === 'success' ? 'bg-ok-bg text-ok' : 'bg-danger-bg text-danger'
            }`}
          >
            {komunikat.tekst}
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Anuluj
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onSave}
            disabled={zapisywanie || !nauczycielId || godziny <= 0}
          >
            {zapisywanie ? 'Zapisywanie…' : 'Zapisz'}
          </Button>
        </div>
      </div>
    </div>
  );
}
