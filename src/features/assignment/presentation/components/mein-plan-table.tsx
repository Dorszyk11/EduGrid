"use client";

import { Fragment, useCallback } from "react";
import { HourCell } from "./hour-cell";
import type {
  MeinPlan,
  ClassAssignmentState,
  CellAction,
  PlanSummary,
} from "../types";
import type { AssignmentMode } from "./assignment-toolbar";

interface MeinPlanTableProps {
  plan: MeinPlan;
  state: ClassAssignmentState;
  summary: PlanSummary;
  mode: AssignmentMode;
  readOnly: boolean;
  classId: string | null;
  onAction: (action: CellAction) => void;
}

function subjectKey(planId: string, subject: string): string {
  return `${planId}_${subject.trim()}`;
}

/** Technikum grade V blocks certain subjects for regular assignment */
const BLOCKED_SUBJECTS_GRADE_V = ["Geografia", "Biologia", "Fizyka", "Chemia"];

function canAssignInCell(
  schoolType: string,
  grade: string,
  subject: string,
  isDirectorOrExtended: boolean,
): boolean {
  if (!schoolType.toLowerCase().includes("technikum")) return true;
  if (grade !== "V") return true;
  if (isDirectorOrExtended) return true;
  return !BLOCKED_SUBJECTS_GRADE_V.includes(subject.trim());
}

function statusColor(assigned: number, available: number): string {
  if (available <= 0) return "";
  if (assigned > available)
    return "bg-blue-100 text-blue-800 ring-1 ring-blue-300 rounded";
  if (assigned === available)
    return "bg-green-100 text-green-800 ring-1 ring-green-400 rounded";
  if (available - assigned === 1)
    return "bg-amber-100 text-amber-800 ring-1 ring-amber-400 rounded";
  return "bg-red-100 text-red-800 ring-1 ring-red-400 rounded";
}

function yearSumColor(percent: number): string {
  if (percent <= 25) return "bg-emerald-50 text-emerald-800";
  if (percent <= 35) return "bg-amber-50 text-amber-800";
  if (percent <= 45) return "bg-red-50 text-red-800";
  return "bg-red-100 text-red-900 font-semibold";
}

export function MeinPlanTable({
  plan,
  state,
  summary,
  mode,
  readOnly,
  classId,
  onAction,
}: MeinPlanTableProps) {
  const { grades, subjects, directorHours } = plan;
  const hasGrades = grades.length > 0;

  // Separate extension rows from regular rows
  const extensionRows = subjects.filter((r) => r.isExtendedRow);
  const regularRows = subjects.filter(
    (r) => !r.isExtendedRow && !r.isCycleTotalSubject,
  );
  const cycleTotalRows = subjects.filter((r) => r.isCycleTotalSubject);
  const orderedRows = [...extensionRows, ...regularRows];

  const handleCellClick = useCallback(
    (subKey: string, grade: string, row: (typeof orderedRows)[0]) => {
      if (readOnly || !classId) return;

      const isExtSubject = state.extensionSubjectKeys.has(subKey);

      switch (mode) {
        case "assign": {
          if (row.isExtendedRow) return;
          if (!canAssignInCell(plan.schoolType, grade, row.subject, false))
            return;
          onAction({ type: "assign", subKey, grade });
          break;
        }
        case "director": {
          if (row.isExtendedRow) return;
          if (!canAssignInCell(plan.schoolType, grade, row.subject, true))
            return;
          onAction({ type: "assign-director", subKey, grade });
          break;
        }
        case "extensions": {
          if (!isExtSubject) return;
          if (!canAssignInCell(plan.schoolType, grade, row.subject, true))
            return;
          onAction({ type: "assign-extension", subKey, grade });
          break;
        }
        case "groups": {
          if (row.isExtendedRow) return;
          onAction({ type: "toggle-group-split", subKey, grade });
          break;
        }
        case "remove": {
          const ext = state.extensionAssigned[subKey]?.[grade] ?? 0;
          const dir = state.directorAssigned[subKey]?.[grade] ?? 0;
          const assigned = state.assigned[subKey]?.[grade] ?? 0;

          if (ext > 0) {
            onAction({ type: "unassign-extension", subKey, grade });
          } else if (dir > 0) {
            onAction({ type: "unassign-director", subKey, grade });
          } else if (assigned > 0) {
            onAction({ type: "unassign", subKey, grade });
          }
          break;
        }
      }
    },
    [readOnly, classId, mode, onAction, plan.schoolType, state],
  );

  const handleRightClick = useCallback(
    (subKey: string, grade: string, e: React.MouseEvent) => {
      if (readOnly || !classId) return;
      e.preventDefault();
      // Right-click always removes
      const ext = state.extensionAssigned[subKey]?.[grade] ?? 0;
      const dir = state.directorAssigned[subKey]?.[grade] ?? 0;
      const assigned = state.assigned[subKey]?.[grade] ?? 0;

      if (ext > 0) {
        onAction({ type: "unassign-extension", subKey, grade });
      } else if (dir > 0) {
        onAction({ type: "unassign-director", subKey, grade });
      } else if (assigned > 0) {
        onAction({ type: "unassign", subKey, grade });
      }
    },
    [readOnly, classId, onAction, state],
  );

  const handleGroupClick = useCallback(
    (subKey: string, grade: string, group: 1 | 2) => {
      if (readOnly || !classId) return;
      if (mode === "assign") {
        onAction({ type: "assign", subKey, grade, group });
      } else if (mode === "remove") {
        onAction({ type: "unassign", subKey, grade, group });
      }
    },
    [readOnly, classId, mode, onAction],
  );

  const handleGroupRightClick = useCallback(
    (subKey: string, grade: string, group: 1 | 2, e: React.MouseEvent) => {
      if (readOnly || !classId) return;
      e.preventDefault();
      onAction({ type: "unassign", subKey, grade, group });
    },
    [readOnly, classId, onAction],
  );

  const handleSubjectNameClick = useCallback(
    (subKey: string) => {
      if (readOnly || mode !== "extensions") return;
      onAction({ type: "toggle-extension-subject", subKey });
    },
    [readOnly, mode, onAction],
  );

  return (
    <section className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm w-full">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-gray-200">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-sm">
          <span className="font-semibold text-gray-800">
            {plan.cycleShort ?? plan.cycle}
          </span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-600">{plan.schoolType}</span>
          {plan.scope && (
            <>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500">{plan.scope}</span>
            </>
          )}
          <span className="text-gray-400 text-xs">
            Zał. nr {plan.attachmentNo}
            {plan.sourcePages?.length
              ? ` · str. ${plan.sourcePages.join(", ")}`
              : ""}
          </span>
        </div>
        {plan.unit && (
          <p className="text-xs text-gray-500 mt-1">Jednostka: {plan.unit}</p>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto w-full">
        <table className="w-full min-w-[480px] text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="px-3 py-3 font-semibold text-gray-700 w-12 border-r border-gray-200">
                Lp.
              </th>
              <th className="px-3 py-3 font-semibold text-gray-700 min-w-[120px] border-r border-gray-200">
                Przedmiot
              </th>
              {hasGrades &&
                grades.map((g) => (
                  <th
                    key={g}
                    className="px-2 py-3 font-semibold text-gray-700 text-center w-14 border-r border-gray-200"
                  >
                    {g}
                  </th>
                ))}
              <th className="px-3 py-3 font-semibold text-gray-700 text-right w-28">
                Razem
              </th>
              <th className="px-3 py-3 font-semibold text-gray-700 text-right w-24 border-l border-gray-200">
                Zrealizowane
              </th>
            </tr>
          </thead>
          <tbody>
            {orderedRows.map((row, i) => {
              const subKey = subjectKey(plan.planId, row.subject);
              const isExtSubject = state.extensionSubjectKeys.has(subKey);
              const assignedByGrade = state.assigned[subKey] ?? {};
              const directorByGrade = state.directorAssigned[subKey] ?? {};
              const extensionByGrade = state.extensionAssigned[subKey] ?? {};

              const assignedSum = grades.reduce(
                (sum, g) => sum + (assignedByGrade[g] ?? 0),
                0,
              );
              const remaining = row.hoursToChoose - assignedSum;

              // Total row value (all grades + assigned + director + extension)
              const totalRow = grades.reduce((sum, g) => {
                const base = row.isExtendedRow ? 0 : (row.hoursByGrade[g] ?? 0);
                return (
                  sum +
                  base +
                  (assignedByGrade[g] ?? 0) +
                  (directorByGrade[g] ?? 0) +
                  (extensionByGrade[g] ?? 0)
                );
              }, 0);

              const extensionBorder = row.isExtendedRow
                ? "border-t-2 border-b-2 border-gray-400"
                : "";

              const isNameClickable =
                mode === "extensions" && !readOnly && !row.isExtendedRow;

              return (
                <tr
                  key={i}
                  className={row.isExtendedRow ? "bg-gray-50/50" : ""}
                >
                  <td
                    className={`px-3 py-2.5 text-gray-500 tabular-nums border-r border-gray-100 w-12 ${extensionBorder}`}
                  >
                    {row.isExtendedRow ? "roz." : (row.lp ?? "–")}
                  </td>
                  <td
                    className={`px-3 py-2.5 border-r border-gray-100 ${extensionBorder} ${
                      isExtSubject
                        ? "font-semibold text-gray-900"
                        : "text-gray-800"
                    } ${
                      isNameClickable
                        ? "cursor-pointer bg-violet-50 hover:bg-violet-100 ring-1 ring-violet-200 rounded"
                        : ""
                    }`}
                    onClick={
                      isNameClickable
                        ? () => handleSubjectNameClick(subKey)
                        : undefined
                    }
                    role={isNameClickable ? "button" : undefined}
                  >
                    <span>{row.subject}</span>
                    {isExtSubject && (
                      <span className="ml-1.5 inline-block px-1.5 py-0.5 text-xs font-normal text-white bg-violet-700 rounded">
                        rozszerzenie
                      </span>
                    )}
                  </td>
                  {hasGrades &&
                    grades.map((g) => {
                      const base = row.hoursByGrade[g] ?? 0;
                      const assigned = assignedByGrade[g] ?? 0;
                      const dir = directorByGrade[g] ?? 0;
                      const ext = extensionByGrade[g] ?? 0;
                      const isGroupSplit =
                        state.groupSplit[subKey]?.[g] ?? false;
                      const groups = state.groupAssigned[subKey]?.[g];

                      const canAssignThis =
                        classId !== null &&
                        (mode === "assign"
                          ? remaining > 0 &&
                            canAssignInCell(
                              plan.schoolType,
                              g,
                              row.subject,
                              false,
                            )
                          : mode === "director"
                            ? summary.directorAvailable -
                                summary.directorAssignedTotal >
                                0 &&
                              canAssignInCell(
                                plan.schoolType,
                                g,
                                row.subject,
                                true,
                              )
                            : mode === "extensions"
                              ? isExtSubject &&
                                summary.extensionPoolSize -
                                  summary.extensionAssignedTotal >
                                  0
                              : false);

                      const canRemoveThis =
                        classId !== null &&
                        mode === "remove" &&
                        (assigned > 0 || dir > 0 || ext > 0);

                      return (
                        <HourCell
                          key={g}
                          baseHours={row.isExtendedRow ? 0 : base}
                          assignedHours={assigned}
                          directorHours={dir}
                          extensionHours={ext}
                          mode={mode}
                          readOnly={readOnly}
                          isGroupSplit={isGroupSplit}
                          group1Hours={groups?.g1 ?? 0}
                          group2Hours={groups?.g2 ?? 0}
                          isExtendedRow={row.isExtendedRow}
                          isExtensionSubject={isExtSubject}
                          canAssign={canAssignThis}
                          canRemove={canRemoveThis}
                          onClick={() => handleCellClick(subKey, g, row)}
                          onRightClick={(e) => handleRightClick(subKey, g, e)}
                          onGroupClick={(group) =>
                            handleGroupClick(subKey, g, group)
                          }
                          onGroupRightClick={(group, e) =>
                            handleGroupRightClick(subKey, g, group, e)
                          }
                        />
                      );
                    })}
                  {/* Total column */}
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-800 w-28">
                    {totalRow > 0
                      ? totalRow
                      : row.totalHours > 0
                        ? row.totalHours
                        : "0"}
                  </td>
                  {/* Realized column */}
                  <td
                    className={`px-3 py-2.5 text-right border-l border-gray-200 text-sm ${
                      classId && row.hoursToChoose > 0
                        ? statusColor(assignedSum, row.hoursToChoose)
                        : ""
                    }`}
                  >
                    {classId && row.hoursToChoose > 0 ? (
                      <span className="tabular-nums">
                        {assignedSum} z {row.hoursToChoose}
                        {remaining > 0 && (
                          <span className="block text-xs opacity-80 mt-0.5">
                            {remaining} do przydziału
                          </span>
                        )}
                      </span>
                    ) : (
                      "–"
                    )}
                  </td>
                </tr>
              );
            })}

            {/* Director hours row */}
            {directorHours > 0 && (
              <tr className="border-t-2 border-gray-300 font-medium bg-sky-50/50">
                <td
                  className="px-3 py-2 text-gray-700 text-sm"
                  colSpan={hasGrades ? 2 + grades.length : 2}
                >
                  Godziny do dyspozycji dyrektora
                  {!readOnly && classId && (
                    <span className="block text-xs font-normal text-gray-500 mt-0.5">
                      Tryb „Dyrektorskie" dodaje godziny do wybranej komórki
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {directorHours}
                </td>
                <td
                  className={`px-3 py-2 text-right border-l border-gray-200 text-sm ${
                    classId
                      ? statusColor(
                          summary.directorAssignedTotal,
                          directorHours,
                        )
                      : ""
                  }`}
                >
                  {classId ? (
                    <span className="tabular-nums">
                      {summary.directorAssignedTotal} z {directorHours}
                    </span>
                  ) : (
                    "–"
                  )}
                </td>
              </tr>
            )}

            {/* Year total row */}
            <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
              <td className="px-3 py-2" colSpan={2}>
                Suma godzin w roku
              </td>
              {hasGrades &&
                grades.map((g) => {
                  const total = summary.totalByGrade[g] ?? 0;
                  const assignedInGrade =
                    (summary.assignedByGrade[g] ?? 0) +
                    (summary.directorByGrade[g] ?? 0) +
                    (summary.extensionByGrade[g] ?? 0);
                  const baseInGrade = total - assignedInGrade;
                  const percent =
                    baseInGrade > 0
                      ? Math.round(
                          (assignedInGrade / (baseInGrade + assignedInGrade)) *
                            100,
                        )
                      : 0;

                  return (
                    <td
                      key={g}
                      className={`px-2 py-2 text-center tabular-nums ${
                        classId ? yearSumColor(percent) : ""
                      }`}
                    >
                      {total}
                    </td>
                  );
                })}
              <td className="px-3 py-2 text-right tabular-nums">
                {summary.grandTotal}
              </td>
              <td className="px-3 py-2 text-right border-l border-gray-200">
                {classId ? (
                  <span className="tabular-nums text-sm">
                    {summary.assignedTotal +
                      summary.directorAssignedTotal +
                      summary.extensionAssignedTotal}{" "}
                    h przypisanych
                  </span>
                ) : (
                  "–"
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Cycle-total subjects (e.g. counseling) displayed below the table */}
      {cycleTotalRows.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-3">
          <p className="text-xs font-medium text-gray-500 mb-2">
            Przedmioty w wymiarze łącznym (godziny w cyklu):
          </p>
          {cycleTotalRows.map((row, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-sm py-1"
            >
              <span className="text-gray-700">{row.subject}</span>
              <span className="tabular-nums text-gray-600">
                {row.totalHours} h w cyklu
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
