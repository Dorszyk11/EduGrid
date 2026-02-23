'use client';

import React from 'react';

export type SplitCellMode = 'none' | 'assign' | 'director' | 'extension' | 'delete' | 'split';

interface GroupSplitCellProps {
  grade: string;
  planHours: number;
  assignedG1: number;
  assignedG2: number;
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
  isDeleteMode: boolean;
  activeMode: SplitCellMode;
}

function formatHours(assigned: number, plan: number): string {
  if (assigned <= 0) return plan > 0 ? String(plan) : '–';
  return String(assigned);
}

function halfBg(
  assigned: number,
  remaining: number,
  canAssign: boolean,
  canRemove: boolean,
  mode: SplitCellMode,
): string {
  if (mode === 'delete' && canRemove) return 'cursor-pointer bg-red-200 hover:bg-red-300 ring-1 ring-red-400 rounded-sm';

  if (mode === 'assign') {
    if (canAssign) return 'cursor-pointer bg-green-200 hover:bg-green-300 ring-1 ring-green-400 rounded-sm';
    if (assigned > 0 && remaining <= 0) return 'bg-sky-200 ring-1 ring-sky-400 rounded-sm';
  }
  if (mode === 'director') {
    if (canAssign) return 'cursor-pointer bg-sky-200 hover:bg-sky-300 ring-1 ring-sky-400 rounded-sm';
    if (assigned > 0) return 'bg-sky-100 ring-1 ring-sky-300 rounded-sm';
  }
  if (mode === 'extension') {
    if (canAssign) return 'cursor-pointer bg-violet-200 hover:bg-violet-300 ring-1 ring-violet-400 rounded-sm';
    if (assigned > 0) return 'bg-violet-100 ring-1 ring-violet-300 rounded-sm';
  }

  if (assigned > 0) {
    if (remaining < 0) return 'bg-blue-100 ring-1 ring-blue-300 rounded-sm';
    if (remaining === 0) return 'bg-sky-100 ring-1 ring-sky-300 rounded-sm';
    return 'ring-1 ring-gray-300 rounded-sm';
  }
  return '';
}

function halfText(assigned: number, remaining: number, mode: SplitCellMode): string {
  if (mode === 'assign' || mode === 'delete' || mode === 'director' || mode === 'extension') {
    if (mode === 'director' && assigned > 0) return 'font-bold text-sky-700';
    if (mode === 'extension' && assigned > 0) return 'font-bold text-violet-700';
    return '';
  }
  if (assigned <= 0) return '';
  if (remaining < 0) return 'text-blue-900 font-semibold';
  if (remaining === 0) return 'text-green-900 font-semibold';
  return '';
}

export default function GroupSplitCell({
  grade,
  planHours,
  assignedG1,
  assignedG2,
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
  isDeleteMode,
  activeMode,
}: GroupSplitCellProps) {
  const handleClick = (canAssign: boolean, canRemove: boolean, assign: () => void, remove: () => void) => {
    if (canAssign) return assign;
    if (canRemove) return remove;
    if (canToggleSplit) return onToggleSplit;
    return undefined;
  };

  const handleContextMenu = (assigned: number, remove: () => void) => (e: React.MouseEvent) => {
    if (assigned > 0) {
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
    if (canToggleSplit) return 'Wyłącz podział (prawy przycisk)';
    if (canAssign) return `Dodaj 1 h ${modeLabel[activeMode]} (gr. ${group}); prawy: usuń`;
    if (canRemove) return `Usuń 1 h (gr. ${group})`;
    if (assigned > 0) return `Prawy przycisk: usuń 1 h (gr. ${group})`;
    return undefined;
  };

  const tdClass = splitModeActive
    ? 'cursor-pointer bg-amber-50 hover:bg-amber-100 ring-1 ring-amber-300 rounded'
    : '';

  const effectiveMode = splitModeActive ? 'split' as SplitCellMode : activeMode;
  const bg1 = splitModeActive ? '' : halfBg(assignedG1, remainingG1, canAssignG1, canRemoveG1, effectiveMode);
  const bg2 = splitModeActive ? '' : halfBg(assignedG2, remainingG2, canAssignG2, canRemoveG2, effectiveMode);
  const txt1 = splitModeActive ? '' : halfText(assignedG1, remainingG1, effectiveMode);
  const txt2 = splitModeActive ? '' : halfText(assignedG2, remainingG2, effectiveMode);

  const interactive1 = canAssignG1 || canRemoveG1 || canToggleSplit;
  const interactive2 = canAssignG2 || canRemoveG2 || canToggleSplit;

  const half = 'flex items-center justify-center text-xs tabular-nums transition-colors ring-1 ring-gray-200 rounded-sm m-px';

  return (
    <td
      key={grade}
      className={`border-r border-gray-100 w-12 sm:w-14 p-0 h-[3.25rem] ${tdClass}`}
      onContextMenu={(e) => { e.preventDefault(); onToggleSplit(); }}
    >
      <div className="flex flex-col h-full gap-px">
        <div
          className={`${half} flex-1 ${bg1} ${txt1}`}
          onClick={handleClick(canAssignG1, canRemoveG1, onAssignG1, onRemoveG1)}
          onContextMenu={handleContextMenu(assignedG1, onRemoveG1)}
          role={interactive1 ? 'button' : undefined}
          title={titleFor(1, canAssignG1, canRemoveG1, assignedG1)}
        >
          {klasaId ? formatHours(assignedG1, planHours) : (planHours > 0 ? String(planHours) : '–')}
        </div>
        <div
          className={`${half} flex-1 ${bg2} ${txt2}`}
          onClick={handleClick(canAssignG2, canRemoveG2, onAssignG2, onRemoveG2)}
          onContextMenu={handleContextMenu(assignedG2, onRemoveG2)}
          role={interactive2 ? 'button' : undefined}
          title={titleFor(2, canAssignG2, canRemoveG2, assignedG2)}
        >
          {klasaId ? formatHours(assignedG2, planHours) : (planHours > 0 ? String(planHours) : '–')}
        </div>
      </div>
    </td>
  );
}
