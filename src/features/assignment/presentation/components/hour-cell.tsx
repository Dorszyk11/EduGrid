"use client";

import { memo } from "react";
import type { AssignmentMode } from "./assignment-toolbar";

interface HourCellProps {
  baseHours: number;
  assignedHours: number;
  directorHours: number;
  extensionHours: number;
  mode: AssignmentMode;
  readOnly: boolean;
  isGroupSplit: boolean;
  group1Hours: number;
  group2Hours: number;
  isExtendedRow: boolean;
  isExtensionSubject: boolean;
  canAssign: boolean;
  canRemove: boolean;
  onClick?: () => void;
  onRightClick?: (e: React.MouseEvent) => void;
  onGroupClick?: (group: 1 | 2) => void;
  onGroupRightClick?: (group: 1 | 2, e: React.MouseEvent) => void;
}

function getCellStyle(
  mode: AssignmentMode,
  readOnly: boolean,
  assignedHours: number,
  directorHours: number,
  extensionHours: number,
  isExtensionSubject: boolean,
  canAssign: boolean,
  canRemove: boolean,
): string {
  if (readOnly) return "";

  const hasAssigned =
    assignedHours > 0 || directorHours > 0 || extensionHours > 0;

  if (mode === "remove" && hasAssigned) {
    return "cursor-pointer bg-red-100 hover:bg-red-200 ring-1 ring-red-300 rounded";
  }

  if (mode === "assign" && canAssign) {
    return "cursor-pointer bg-green-100 hover:bg-green-200 ring-1 ring-green-300 rounded";
  }

  if (mode === "director" && canAssign) {
    return "cursor-pointer bg-sky-100 hover:bg-sky-200 ring-1 ring-sky-300 rounded";
  }

  if (mode === "extensions" && isExtensionSubject && canAssign) {
    return "cursor-pointer bg-violet-100 hover:bg-violet-200 ring-1 ring-violet-300 rounded";
  }

  if (mode === "groups") {
    return "cursor-pointer bg-amber-50 hover:bg-amber-100 ring-1 ring-amber-200 rounded";
  }

  // Passive indicators
  if (directorHours > 0) return "bg-sky-50 ring-1 ring-sky-200 rounded";
  if (extensionHours > 0 && isExtensionSubject)
    return "bg-violet-50 ring-1 ring-violet-200 rounded";

  return "";
}

function formatCellValue(
  baseHours: number,
  assignedHours: number,
  directorHours: number,
  extensionHours: number,
): string {
  const total = baseHours + assignedHours + directorHours + extensionHours;
  if (total === 0) return "–";
  return String(total);
}

export const HourCell = memo(function HourCell({
  baseHours,
  assignedHours,
  directorHours,
  extensionHours,
  mode,
  readOnly,
  isGroupSplit,
  group1Hours,
  group2Hours,
  isExtendedRow,
  isExtensionSubject,
  canAssign,
  canRemove,
  onClick,
  onRightClick,
  onGroupClick,
  onGroupRightClick,
}: HourCellProps) {
  const cellStyle = getCellStyle(
    mode,
    readOnly,
    assignedHours,
    directorHours,
    extensionHours,
    isExtensionSubject,
    canAssign,
    canRemove,
  );

  if (isGroupSplit && !isExtendedRow) {
    const total = baseHours + assignedHours + directorHours + extensionHours;
    const subCellBase =
      "flex-1 min-h-[1.5rem] flex items-center justify-center px-1 py-1.5 text-xs tabular-nums border border-gray-200 transition-colors";
    const hoverClass =
      (mode === "assign" || mode === "remove") && !readOnly
        ? "cursor-pointer hover:bg-amber-50"
        : "";

    return (
      <td className="border-r border-gray-100 w-12 sm:w-14 align-top p-0">
        <div className="flex flex-col h-full min-h-[3.25rem]">
          <div
            className={`${subCellBase} border-b-2 border-gray-300 ${hoverClass}`}
            onClick={() => onGroupClick?.(1)}
            onContextMenu={(e) => {
              e.preventDefault();
              onGroupRightClick?.(1, e);
            }}
            role={!readOnly ? "button" : undefined}
            title="Grupa 1"
          >
            {group1Hours > 0
              ? group1Hours === total
                ? String(group1Hours)
                : `${group1Hours}/${total}`
              : total > 0
                ? String(total)
                : "–"}
          </div>
          <div
            className={`${subCellBase} ${hoverClass}`}
            onClick={() => onGroupClick?.(2)}
            onContextMenu={(e) => {
              e.preventDefault();
              onGroupRightClick?.(2, e);
            }}
            role={!readOnly ? "button" : undefined}
            title="Grupa 2"
          >
            {group2Hours > 0
              ? group2Hours === total
                ? String(group2Hours)
                : `${group2Hours}/${total}`
              : total > 0
                ? String(total)
                : "–"}
          </div>
        </div>
      </td>
    );
  }

  return (
    <td
      className={`px-1.5 sm:px-2 py-2.5 sm:py-3 text-center border-r border-gray-100 w-12 sm:w-14 align-top tabular-nums text-sm ${cellStyle}`}
      onClick={onClick}
      onContextMenu={onRightClick}
      role={!readOnly && onClick ? "button" : undefined}
    >
      {formatCellValue(baseHours, assignedHours, directorHours, extensionHours)}
    </td>
  );
});
