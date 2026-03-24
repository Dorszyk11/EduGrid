'use client';

import React from 'react';

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
        <span className="text-sky-600 font-semibold tabular-nums">+{directorHours}d</span>
      </span>
    );
  }
  return <span className="tabular-nums">{totalHours}</span>;
}

/** Obie połówki pokazują ten sam „Razem” co przy jednej komórce – szczegóły per grupa są w siatce. */
export function GroupSplitRazem({ razemRzeczywiste, razemDyrektorskie, planoweGodziny }: GroupSplitRazemProps) {
  return (
    <div className="flex flex-col h-full min-h-[3.25rem] text-xs tabular-nums">
      <div className="flex flex-col flex-1 min-h-0">
        <span className="flex-1 flex items-center justify-end px-2 sm:px-3">
          {razemLine(razemRzeczywiste, razemDyrektorskie)}
        </span>
        <span className="flex-1 flex items-center justify-end px-2 sm:px-3 border-t border-gray-200">
          {razemLine(razemRzeczywiste, razemDyrektorskie)}
        </span>
      </div>
      {razemRzeczywiste !== planoweGodziny && (
        <span className="block text-[0.65rem] text-gray-500 px-2 sm:px-3 pb-0.5 text-right font-normal whitespace-nowrap">
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
  remaining: number;
  /** Opcjonalnie – podpis „z czego N rozszerzeń” (wspólna pula z wiersza „przedmioty rozszerzone”) */
  extensionPoolSize?: number;
}

function statusClasses(assigned: number, total: number): string {
  if (total <= 0) return '';
  const rem = total - assigned;
  if (rem < 0) return 'bg-blue-200 text-blue-900 font-semibold ring-1 ring-blue-400 rounded-sm';
  if (rem === 0) return 'bg-green-200 text-green-900 font-semibold ring-1 ring-green-500 rounded-sm';
  if (rem === 1) return 'bg-amber-200 text-amber-900 font-semibold ring-1 ring-amber-500 rounded-sm';
  return 'bg-red-200 text-red-900 font-semibold ring-1 ring-red-500 rounded-sm';
}

function formatProgress(assigned: number, total: number): string {
  if (total > 0) return `${assigned} z ${total}`;
  return assigned > 0 ? String(assigned) : '–';
}

/** Obie połówki = ten sam postęp co przy jednej komórce; pula „do wyboru” + limit rozszerzeń jak w całej klasie. */
export function GroupSplitZrealizowane({ assigned, total, remaining, extensionPoolSize }: GroupSplitZrealizowaneProps) {
  const cls = statusClasses(assigned, total);
  const main = formatProgress(assigned, total);
  return (
    <div className="flex flex-col h-full min-h-[3.25rem] text-xs tabular-nums">
      <span className={`flex-1 flex items-center justify-end px-2 sm:px-3 ${cls}`}>
        <span>{main}</span>
      </span>
      <span className={`flex-1 flex items-center justify-end px-2 sm:px-3 border-t border-gray-200 ${cls}`}>
        <span>{main}</span>
      </span>
      {(extensionPoolSize != null && extensionPoolSize > 0) || remaining > 0 ? (
        <div className="px-2 sm:px-3 pb-0.5 text-right text-[0.65rem] space-y-0.5 font-normal opacity-90">
          {extensionPoolSize != null && extensionPoolSize > 0 && (
            <span className="block leading-tight">z czego {extensionPoolSize} rozszerzeń</span>
          )}
          {remaining > 0 && <span className="block leading-tight">{remaining} do przydziału</span>}
        </div>
      ) : null}
    </div>
  );
}
