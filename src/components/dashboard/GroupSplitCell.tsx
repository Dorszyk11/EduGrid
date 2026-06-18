'use client';

import React from 'react';
import { useKomorkaKlawiatura } from '@/lib/hooks/useKomorkaKlawiatura';

export type SplitCellMode = 'none' | 'assign' | 'director' | 'extension' | 'delete' | 'split';

/** Wspólna klasa fokusu klawiaturowego klikalnych połówek (spójna z TabelaPlanu). */
const FOCUS_KOMORKA = 'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent';

/** Znacznik typu godziny — nie-kolorowy (status nie samym kolorem). */
function ZnacznikTyp({ children }: { children: React.ReactNode }) {
  return <span className="ml-0.5 align-baseline text-[0.6rem] font-semibold text-ink-faint">{children}</span>;
}

interface GroupSplitCellProps {
  grade: string;
  /** Godziny programowe (baza) w tym roczniku */
  baseHours: number;
  /** Godziny „do wyboru” per grupa */
  optionalG1: number;
  optionalG2: number;
  /** Godziny dyrektorskie per grupa */
  directorG1: number;
  directorG2: number;
  /** Godziny z puli rozszerzeń per grupa */
  extensionG1: number;
  extensionG2: number;
  /** Pełna suma (logika klików / tła) */
  totalG1: number;
  totalG2: number;
  remainingG1: number;
  remainingG2: number;
  klasaId: string | undefined;
  canAssignG1: boolean;
  canAssignG2: boolean;
  canRemoveG1: boolean;
  canRemoveG2: boolean;
  canToggleSplit: boolean;
  onAssignG1: () => void;
  onAssignG2: () => void;
  onRemoveG1: () => void;
  onRemoveG2: () => void;
  onToggleSplit: () => void;
  splitModeActive: boolean;
  /** Zachowane dla spójności z wywołaniami (tryb usuwania steruje activeMode) */
  isDeleteMode?: boolean;
  activeMode: SplitCellMode;
  /** Gdy true – w komórce są godziny dyrektorskie (w trybie assign: zielono gdy remaining>0, niebiesko gdy all assigned) */
  hasDirectorHours?: boolean;
  /** Gdy true – w komórce są godziny rozszerzeń; kolor fioletowy */
  hasExtensionHours?: boolean;
}

function halfBg(
  total: number,
  remaining: number,
  canAssign: boolean,
  canRemove: boolean,
  mode: SplitCellMode,
  hasDirectorHours?: boolean,
  hasExtensionHours?: boolean,
): string {
  if (mode === 'delete' && canRemove) return `cursor-pointer bg-danger-bg hover:bg-danger-bg ring-1 ring-danger/40 rounded-sm ${FOCUS_KOMORKA}`;

  /** Pełny przydział lub nadwyżka → accent; sygnał tylko w trybie assign */
  if (mode === 'assign') {
    if (hasExtensionHours && total > 0) return 'bg-accent-weak ring-1 ring-accent/30 rounded-sm';
    if (canAssign) return `cursor-pointer bg-ok-bg hover:bg-ok-bg ring-2 ring-ok/40 rounded-sm ${FOCUS_KOMORKA}`;
    if ((total > 0 || hasDirectorHours) && remaining <= 0) return 'bg-accent-weak ring-2 ring-accent/40 rounded-sm';
  }
  if (mode === 'director') {
    if (canAssign) return `cursor-pointer bg-accent-weak hover:bg-accent-weak/70 ring-1 ring-accent/40 rounded-sm ${FOCUS_KOMORKA}`;
    if (total > 0 || hasDirectorHours) return `cursor-pointer bg-accent-weak hover:bg-accent-weak/70 ring-1 ring-accent/40 rounded-sm ${FOCUS_KOMORKA}`;
  }
  if (mode === 'extension') {
    if (canAssign) return `cursor-pointer bg-accent-weak hover:bg-accent-weak/70 ring-1 ring-accent/40 rounded-sm ${FOCUS_KOMORKA}`;
    if (total > 0) return 'bg-accent-weak ring-1 ring-accent/30 rounded-sm';
  }

  /** Bez aktywnego trybu (assign/director/extension) – neutralne tło, typ rozróżnia znacznik */
  if (total > 0) {
    if (hasExtensionHours) return 'bg-accent-weak ring-1 ring-accent/30 rounded-sm';
    return 'ring-1 ring-line-strong rounded-sm';
  }
  return '';
}

function halfText(total: number, remaining: number, mode: SplitCellMode, hasDirectorHours?: boolean, hasExtensionHours?: boolean): string {
  if (mode === 'assign' || mode === 'delete' || mode === 'director' || mode === 'extension') {
    if (mode === 'director' && total > 0) return 'font-bold text-accent-strong';
    if ((mode === 'extension' || hasExtensionHours) && total > 0) return 'font-bold text-accent-strong';
    return '';
  }
  if (total <= 0) return '';
  if (hasExtensionHours) return 'font-bold text-accent-strong';
  return 'text-ink-soft font-medium';
}

/** Jak w komórce bez podziału: baza+opcjonalne+rozszerzenie, a godziny dyrektorskie jako +Nd */
function HalfHoursDisplay({
  base,
  optional,
  extension,
  director,
  klasaId,
}: {
  base: number;
  optional: number;
  extension: number;
  director: number;
  klasaId: string | undefined;
}) {
  if (!klasaId) {
    return <>{base > 0 ? String(base) : '–'}</>;
  }
  const core = base + optional + extension;
  const total = core + director;
  if (total <= 0) {
    return <>{base > 0 ? String(base) : '–'}</>;
  }
  const coreClass =
    extension > 0
      ? 'font-bold text-accent-strong'
      : optional > 0
        ? 'font-medium text-ink'
        : 'text-ink-soft font-medium';
  const znacznikRoz = extension > 0 ? <ZnacznikTyp>roz.</ZnacznikTyp> : null;
  if (director > 0) {
    return (
      <span className="inline-flex flex-wrap items-center justify-center gap-x-0.5 leading-tight">
        <span className={`tabular-nums ${coreClass}`}>{core}</span>
        {znacznikRoz}
        <span className="text-accent-strong font-semibold tabular-nums text-[0.65rem] sm:text-xs">+{director}d</span>
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-x-0.5 leading-tight">
      <span className={`tabular-nums ${coreClass}`}>{core}</span>
      {znacznikRoz}
    </span>
  );
}

export default function GroupSplitCell({
  grade,
  baseHours,
  optionalG1,
  optionalG2,
  directorG1,
  directorG2,
  extensionG1,
  extensionG2,
  totalG1,
  totalG2,
  remainingG1,
  remainingG2,
  klasaId,
  canAssignG1,
  canAssignG2,
  canRemoveG1,
  canRemoveG2,
  canToggleSplit,
  onAssignG1,
  onAssignG2,
  onRemoveG1,
  onRemoveG2,
  onToggleSplit,
  splitModeActive,
  isDeleteMode: _isDeleteMode,
  activeMode,
  hasDirectorHours = false,
  hasExtensionHours = false,
}: GroupSplitCellProps) {
  const NOOP = () => {};
  const activateFor = (canAssign: boolean, canRemove: boolean, assign: () => void, remove: () => void) => {
    if (canAssign) return assign;
    if (canRemove) return remove;
    if (canToggleSplit) return onToggleSplit;
    return undefined;
  };
  const activate1 = activateFor(canAssignG1, canRemoveG1, onAssignG1, onRemoveG1);
  const activate2 = activateFor(canAssignG2, canRemoveG2, onAssignG2, onRemoveG2);
  /** Klawiatura: Enter/Space → ta sama akcja co klik (hooki wołane bezwarunkowo, stała kolejność). */
  const kb1 = useKomorkaKlawiatura(activate1 ?? NOOP);
  const kb2 = useKomorkaKlawiatura(activate2 ?? NOOP);

  /** Prawy przycisk usuwa tylko godziny (nigdy grupy), i tylko gdy aktywny jest tryb danego typu godzin (assign/director/extension). W trybie split prawy przycisk nic nie robi. */
  const allowRightClickRemove = !splitModeActive && activeMode !== 'split' && activeMode !== 'delete';
  const handleContextMenu = (assigned: number, remove: () => void) => (e: React.MouseEvent) => {
    if (allowRightClickRemove && assigned > 0) {
      e.preventDefault();
      e.stopPropagation();
      remove();
    }
  };

  const modeLabel: Record<SplitCellMode, string> = {
    none: '',
    assign: 'do wyboru',
    director: 'dyrektorską',
    extension: 'rozszerzeń',
    delete: '',
    split: '',
  };

  const titleFor = (group: 1 | 2, canAssign: boolean, canRemove: boolean, assigned: number) => {
    if (canToggleSplit) return 'Kliknij, aby włączyć/wyłączyć podział na grupy';
    if (canAssign) return `Dodaj 1 h ${modeLabel[activeMode]} (gr. ${group})${allowRightClickRemove && assigned > 0 ? '; prawy: usuń' : ''}`;
    if (canRemove) return `Usuń 1 h (gr. ${group})`;
    if (allowRightClickRemove && assigned > 0) return `Prawy przycisk: usuń 1 h (gr. ${group})`;
    return undefined;
  };

  /** Dostępny opis połówki dla czytników ekranu. */
  const ariaLabelFor = (group: 1 | 2, assigned: number) => `Rocznik ${grade}, grupa ${group}, ${assigned} godz.`;

  const tdClass = splitModeActive
    ? `cursor-pointer bg-warn-bg hover:bg-warn-bg ring-1 ring-warn/40 rounded-sm ${FOCUS_KOMORKA}`
    : '';

  const effectiveMode = splitModeActive ? ('split' as SplitCellMode) : activeMode;
  const bg1 = splitModeActive ? '' : halfBg(totalG1, remainingG1, canAssignG1, canRemoveG1, effectiveMode, hasDirectorHours, hasExtensionHours);
  const bg2 = splitModeActive ? '' : halfBg(totalG2, remainingG2, canAssignG2, canRemoveG2, effectiveMode, hasDirectorHours, hasExtensionHours);
  const txt1 = splitModeActive ? '' : halfText(totalG1, remainingG1, effectiveMode, hasDirectorHours, hasExtensionHours);
  const txt2 = splitModeActive ? '' : halfText(totalG2, remainingG2, effectiveMode, hasDirectorHours, hasExtensionHours);

  const interactive1 = canAssignG1 || canRemoveG1 || canToggleSplit;
  const interactive2 = canAssignG2 || canRemoveG2 || canToggleSplit;

  const half = 'flex items-center justify-center text-xs tabular-nums transition-colors min-h-0 px-0.5';
  const containerBorder = hasDirectorHours ? 'ring-1 ring-line-strong rounded-sm' : '';

  return (
    <td className={`border-r border-line w-12 sm:w-14 p-0 h-13 ${tdClass} ${containerBorder}`} aria-label={`Rocznik ${grade}`}>
      <div className="flex flex-col h-full">
        <div
          className={`${half} flex-1 border-b border-line ${bg1} ${txt1}`}
          {...(interactive1 ? { ...kb1, 'aria-label': ariaLabelFor(1, totalG1) } : undefined)}
          onContextMenu={handleContextMenu(totalG1, onRemoveG1)}
          title={titleFor(1, canAssignG1, canRemoveG1, totalG1)}
        >
          <HalfHoursDisplay
            base={baseHours}
            optional={optionalG1}
            extension={extensionG1}
            director={directorG1}
            klasaId={klasaId}
          />
        </div>
        <div
          className={`${half} flex-1 ${bg2} ${txt2}`}
          {...(interactive2 ? { ...kb2, 'aria-label': ariaLabelFor(2, totalG2) } : undefined)}
          onContextMenu={handleContextMenu(totalG2, onRemoveG2)}
          title={titleFor(2, canAssignG2, canRemoveG2, totalG2)}
        >
          <HalfHoursDisplay
            base={baseHours}
            optional={optionalG2}
            extension={extensionG2}
            director={directorG2}
            klasaId={klasaId}
          />
        </div>
      </div>
    </td>
  );
}
