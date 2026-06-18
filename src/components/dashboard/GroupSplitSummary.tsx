'use client';

import React from 'react';
import { statusRealizacji, type TonStatusu } from '@/lib/status-realizacji';

/** Mapa tonu statusu → klasy tła/tekstu połówek „Zrealizowane” (tokeny, status nie samym kolorem). */
const TON_KOMORKA: Record<TonStatusu, string> = {
  ok: 'bg-ok-bg font-semibold text-ok ring-1 ring-ok/40 rounded-sm',
  warn: 'bg-warn-bg font-semibold text-warn ring-1 ring-warn/40 rounded-sm',
  danger: 'bg-danger-bg font-semibold text-danger ring-1 ring-danger/40 rounded-sm',
  accent: 'bg-accent-weak font-semibold text-accent-strong ring-1 ring-accent/40 rounded-sm',
};

interface GroupSplitRazemProps {
  /** Jak kolumna „Razem” bez podziału: pełna suma godzin w wierszu */
  razemRzeczywiste: number;
  /** Suma godzin dyrektorskich w tym wierszu (wyświetlane jako +Nd) */
  razemDyrektorskie: number;
  /** Wartość z planu MEiN (podpis „planowo …”) */
  planoweGodziny: number;
}

function razemLine(totalHours: number, directorHours: number) {
  if (totalHours <= 0 && directorHours <= 0) return '–';
  const core = totalHours - directorHours;
  if (directorHours > 0) {
    return (
      <span className="inline-flex flex-wrap items-center justify-end gap-x-0.5">
        <span className="tabular-nums">{core}</span>
        <span className="text-accent-strong font-semibold tabular-nums">+{directorHours}d</span>
      </span>
    );
  }
  return <span className="tabular-nums">{totalHours}</span>;
}

/** Obie połówki pokazują ten sam „Razem” co przy jednej komórce – szczegóły per grupa są w siatce. */
export function GroupSplitRazem({ razemRzeczywiste, razemDyrektorskie, planoweGodziny }: GroupSplitRazemProps) {
  return (
    <div className="flex flex-col h-full min-h-13 text-xs tabular-nums">
      <div className="flex flex-col flex-1 min-h-0">
        <span className="flex-1 flex items-center justify-end px-2 sm:px-3">
          {razemLine(razemRzeczywiste, razemDyrektorskie)}
        </span>
        <span className="flex-1 flex items-center justify-end px-2 sm:px-3 border-t border-line">
          {razemLine(razemRzeczywiste, razemDyrektorskie)}
        </span>
      </div>
      {razemRzeczywiste !== planoweGodziny && (
        <span className="block text-[0.65rem] text-ink-faint px-2 sm:px-3 pb-0.5 text-right font-normal whitespace-nowrap">
          planowo {planoweGodziny}
        </span>
      )}
    </div>
  );
}

interface GroupSplitZrealizowaneProps {
  /** Te same wartości co w jednej kolumnie „Zrealizowane” (bez podziału na grupy) */
  assigned: number;
  total: number;
  /** Pozostałe godziny „do wyboru” (hours_to_choose − przydział) */
  remaining: number;
  /** Godziny rozszerzeń faktycznie przypisane do tego wiersza (nie „cała pula” planu) */
  extensionHoursForSubject?: number;
  /** Suma godzin dyrektorskich w tym wierszu */
  directorHoursForSubject?: number;
  /** Ile godzin z puli rozszerzeń jeszcze można dopisać (przedmiot rozszerzony) */
  extensionPoolRemaining?: number;
}

/** Klasy tła/tekstu połówek z jednego źródła progów (status-realizacji). */
function statusClasses(assigned: number, total: number): string {
  if (total <= 0) return '';
  return TON_KOMORKA[statusRealizacji(assigned, total).ton];
}

function formatProgress(assigned: number, total: number): string {
  if (total > 0) return `${assigned} z ${total}`;
  return assigned > 0 ? String(assigned) : '–';
}

/** Obie połówki = ten sam postęp co przy jednej komórce; dopiski: rozszerzenia / dyrektor / do przydziału. */
export function GroupSplitZrealizowane({
  assigned,
  total,
  remaining,
  extensionHoursForSubject,
  directorHoursForSubject,
  extensionPoolRemaining,
}: GroupSplitZrealizowaneProps) {
  const cls = statusClasses(assigned, total);
  const main = formatProgress(assigned, total);
  const hasFooter =
    (extensionHoursForSubject != null && extensionHoursForSubject > 0) ||
    (directorHoursForSubject != null && directorHoursForSubject > 0) ||
    remaining > 0 ||
    (extensionPoolRemaining != null && extensionPoolRemaining > 0);
  return (
    <div className="flex flex-col h-full min-h-13 text-xs tabular-nums">
      <span className={`flex-1 flex items-center justify-end px-2 sm:px-3 ${cls}`}>
        <span>{main}</span>
      </span>
      <span className={`flex-1 flex items-center justify-end px-2 sm:px-3 border-t border-line ${cls}`}>
        <span>{main}</span>
      </span>
      {hasFooter ? (
        <div className="px-2 sm:px-3 pb-0.5 text-right text-[0.65rem] space-y-0.5 font-normal opacity-90">
          {extensionHoursForSubject != null && extensionHoursForSubject > 0 && (
            <span className="block leading-tight">z czego {extensionHoursForSubject} rozszerzeń</span>
          )}
          {directorHoursForSubject != null && directorHoursForSubject > 0 && (
            <span className="block leading-tight">z czego {directorHoursForSubject} godzin dyrektorskich</span>
          )}
          {remaining > 0 && <span className="block leading-tight">{remaining} do przydziału (do wyboru)</span>}
          {extensionPoolRemaining != null && extensionPoolRemaining > 0 && (
            <span className="block leading-tight">{extensionPoolRemaining} do przydziału z puli rozszerzeń</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
