'use client';

import { useId } from 'react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Field from '@/components/ui/Field';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

interface Nauczyciel {
  id: string;
  imie: string;
  nazwisko: string;
}

interface PrzydzielModalProps {
  nazwaPrzedmiotu: string;
  godziny: number;
  maxGodziny: number;
  /** Liczba godzin pozostałych do przydzielenia dla przedmiotu (z planu). */
  doPrzydzielenia: number;
  onGodzinyChange: (v: number) => void;
  nauczycielId: string;
  onNauczycielChange: (v: string) => void;
  dostepniNauczyciele: Nauczyciel[];
  nauczycieleLoading: boolean;
  /** Błąd pobierania listy nauczycieli (rozróżnienie błąd ≠ pustka). */
  nauczycieleError?: boolean;
  brakDopasowanych: boolean;
  komunikat: { typ: 'success' | 'error'; tekst: string } | null;
  zapisywanie: boolean;
  onSave: () => void;
  onClose: () => void;
}

const KROK = 0.5;
const MIN = 0.5;

/** Ogranicza wartość do [min, max] i zaokrągla do kroku 0,5. */
function ogranicz(v: number, max: number): number {
  if (Number.isNaN(v)) return MIN;
  const klamp = Math.min(max, Math.max(MIN, v));
  return Math.round(klamp / KROK) * KROK;
}

/** Modal przydzielenia nauczyciela do przedmiotu (prezentacja; zapis steruje rodzic). */
export default function PrzydzielModal({
  nazwaPrzedmiotu,
  godziny,
  maxGodziny,
  doPrzydzielenia,
  onGodzinyChange,
  nauczycielId,
  onNauczycielChange,
  dostepniNauczyciele,
  nauczycieleLoading,
  nauczycieleError = false,
  brakDopasowanych,
  komunikat,
  zapisywanie,
  onSave,
  onClose,
}: PrzydzielModalProps) {
  const godzinyId = useId();
  const nauczycielSelId = useId();
  const pozostanie = Math.max(0, Math.round((doPrzydzielenia - godziny) * 2) / 2);

  return (
    <Modal
      open
      title="Przydziel nauczyciela"
      onClose={onClose}
      size="md"
      footer={
        <>
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
        </>
      }
    >
      <div className="mt-3 space-y-4">
        <p className="text-sm text-ink-soft">
          Przedmiot: <strong className="text-ink">{nazwaPrzedmiotu}</strong>
        </p>
        <p className="text-sm text-ink" aria-live="polite">
          Do przydzielenia:{' '}
          <strong className="tabular-nums">{doPrzydzielenia} godz./tyg</strong>
        </p>

        <Field label="Ilość godzin (tyg.)" htmlFor={godzinyId} hint="Krok 0,5 godziny.">
          <div className="flex items-center gap-3">
            <input
              type="range"
              aria-label="Ilość godzin — suwak"
              min={MIN}
              max={maxGodziny}
              step={KROK}
              value={godziny}
              onChange={(e) => onGodzinyChange(ogranicz(Number(e.target.value), maxGodziny))}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-sm bg-line accent-accent"
            />
            <Input
              id={godzinyId}
              type="number"
              inputMode="decimal"
              min={MIN}
              max={maxGodziny}
              step={KROK}
              value={godziny}
              onChange={(e) => onGodzinyChange(ogranicz(Number(e.target.value), maxGodziny))}
              className="w-20 text-right tabular-nums"
            />
          </div>
        </Field>

        <p className="text-sm text-ink-soft tabular-nums" aria-live="polite">
          Po zapisie pozostanie do przydzielenia:{' '}
          <strong className="text-ink">{pozostanie} godz./tyg</strong>.
        </p>

        <Field label="Nauczyciel (ze specjalizacją)" htmlFor={nauczycielSelId}>
          <Select
            id={nauczycielSelId}
            value={nauczycielId}
            onChange={(e) => onNauczycielChange(e.target.value)}
            disabled={nauczycieleLoading || nauczycieleError}
          >
            <option value="">
              {nauczycieleLoading ? 'Ładowanie…' : 'wybierz nauczyciela'}
            </option>
            {!nauczycieleLoading &&
              !nauczycieleError &&
              dostepniNauczyciele.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.imie} {n.nazwisko}
                </option>
              ))}
          </Select>
          {nauczycieleError && (
            <p className="mt-1 text-xs text-danger" role="alert">
              Nie udało się pobrać listy nauczycieli. Spróbuj ponownie.
            </p>
          )}
          {!nauczycieleError && !nauczycieleLoading && brakDopasowanych && (
            <p className="mt-1 text-xs text-warn">
              Brak nauczycieli ze specjalizacją do tego przedmiotu.
            </p>
          )}
        </Field>

        {komunikat && (
          <div
            role={komunikat.typ === 'error' ? 'alert' : 'status'}
            aria-live={komunikat.typ === 'error' ? 'assertive' : 'polite'}
            className={`rounded-sm p-2 text-sm ${
              komunikat.typ === 'success' ? 'bg-ok-bg text-ok' : 'bg-danger-bg text-danger'
            }`}
          >
            {komunikat.tekst}
          </div>
        )}
      </div>
    </Modal>
  );
}
