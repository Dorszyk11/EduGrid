"use client";

import { type AssignmentResult } from "@/features/assignment/domain/entities";
import { Card, Badge } from "@/shared/ui";

interface AssignmentResultPanelProps {
  result: AssignmentResult;
  onClose: () => void;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function AssignmentResultPanel({
  result,
  onClose,
}: AssignmentResultPanelProps) {
  const { assignments, staffingGaps, workloadStatistics, metrics, warnings } =
    result;

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] max-w-full bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">
          Wynik automatycznego przydziału
        </h2>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          aria-label="Zamknij"
        >
          ✕
        </button>
      </div>

      {/* Content - scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {/* Metrics summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">
              {metrics.successfulAssignments}
            </p>
            <p className="text-xs text-gray-500">Przypisanych</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-red-600">
              {metrics.failedAssignments}
            </p>
            <p className="text-xs text-gray-500">Braków kadrowych</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {formatPercent(metrics.balanceCoefficient)}
            </p>
            <p className="text-xs text-gray-500">Wyrównanie obciążenia</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-gray-700">
              {metrics.totalHoursAssigned}
            </p>
            <p className="text-xs text-gray-500">Godziny łącznie</p>
          </Card>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-amber-700 mb-2">
              Ostrzeżenia ({warnings.length})
            </h3>
            <div className="space-y-1.5">
              {warnings.map((w, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
                >
                  <span className="shrink-0">⚠️</span>
                  <span>{w}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Staffing gaps */}
        {staffingGaps.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-red-700 mb-2">
              Braki kadrowe ({staffingGaps.length})
            </h3>
            <div className="space-y-2">
              {staffingGaps.map((gap, i) => (
                <div
                  key={i}
                  className="border border-red-200 bg-red-50 rounded-lg px-3 py-2"
                >
                  <p className="text-sm font-medium text-red-800">
                    {gap.subjectName} — {gap.className}
                  </p>
                  <p className="text-xs text-red-600 mt-0.5">
                    {gap.hoursNeeded} h bez nauczyciela · {gap.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workload statistics */}
        {workloadStatistics.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Obciążenie nauczycieli ({workloadStatistics.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-1.5 px-2 font-medium text-gray-600">
                      Nauczyciel
                    </th>
                    <th className="text-right py-1.5 px-2 font-medium text-gray-600">
                      Godziny
                    </th>
                    <th className="text-right py-1.5 px-2 font-medium text-gray-600">
                      Limit
                    </th>
                    <th className="text-right py-1.5 px-2 font-medium text-gray-600">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {workloadStatistics
                    .sort((a, b) => b.utilizationPercent - a.utilizationPercent)
                    .map((ws, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-1.5 px-2 text-gray-700">
                          {ws.teacherName}
                        </td>
                        <td className="py-1.5 px-2 text-right tabular-nums">
                          {ws.totalHoursAssigned}
                        </td>
                        <td className="py-1.5 px-2 text-right tabular-nums text-gray-500">
                          {ws.maxHours}
                        </td>
                        <td className="py-1.5 px-2 text-right">
                          <Badge
                            variant={
                              ws.utilizationPercent > 100
                                ? "danger"
                                : ws.utilizationPercent > 90
                                  ? "warning"
                                  : "success"
                            }
                          >
                            {ws.utilizationPercent.toFixed(0)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Successful assignments */}
        {assignments.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Przypisania ({assignments.length})
            </h3>
            <div className="space-y-1">
              {assignments.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs border border-gray-100 rounded px-3 py-1.5"
                >
                  <span className="text-gray-700">
                    {a.subjectName} · {a.className}
                  </span>
                  <span className="text-gray-500">
                    {a.teacherName} · {a.hoursAssigned} h
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
