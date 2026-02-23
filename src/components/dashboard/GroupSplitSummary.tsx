'use client';

import React from 'react';

interface GroupSplitRazemProps {
  sumH1: number;
  sumH2: number;
}

export function GroupSplitRazem({ sumH1, sumH2 }: GroupSplitRazemProps) {
  return (
    <div className="flex flex-col h-full text-xs tabular-nums">
      <span className="flex-1 flex items-center justify-end px-2 sm:px-3">{sumH1}</span>
      <span className="flex-1 flex items-center justify-end px-2 sm:px-3 border-t border-gray-200">{sumH2}</span>
    </div>
  );
}

interface GroupSplitZrealizowaneProps {
  assignedG1: number;
  assignedG2: number;
  totalPerGroup: number;
}

function statusClasses(assigned: number, total: number): string {
  if (total <= 0) return '';
  const remaining = total - assigned;
  if (remaining < 0) return 'bg-blue-200 text-blue-900 font-semibold ring-1 ring-blue-400 rounded-sm';
  if (remaining === 0) return 'bg-green-200 text-green-900 font-semibold ring-1 ring-green-500 rounded-sm';
  if (remaining === 1) return 'bg-amber-200 text-amber-900 font-semibold ring-1 ring-amber-500 rounded-sm';
  return 'bg-red-200 text-red-900 font-semibold ring-1 ring-red-500 rounded-sm';
}

function formatProgress(assigned: number, total: number): string {
  if (total > 0 && assigned >= total) return String(assigned);
  return `${assigned} z ${total}`;
}

export function GroupSplitZrealizowane({ assignedG1, assignedG2, totalPerGroup }: GroupSplitZrealizowaneProps) {
  return (
    <div className="flex flex-col h-full text-xs tabular-nums">
      <span className={`flex-1 flex items-center justify-end px-2 sm:px-3 ${statusClasses(assignedG1, totalPerGroup)}`}>
        {formatProgress(assignedG1, totalPerGroup)}
      </span>
      <span className={`flex-1 flex items-center justify-end px-2 sm:px-3 ${statusClasses(assignedG2, totalPerGroup)}`}>
        {formatProgress(assignedG2, totalPerGroup)}
      </span>
    </div>
  );
}
