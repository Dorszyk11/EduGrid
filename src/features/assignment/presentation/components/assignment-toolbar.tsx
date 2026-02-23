"use client";

import { useState, useCallback } from "react";
import { Button } from "@/shared/ui";
import { type AssignmentResult } from "@/features/assignment/domain/entities";

interface AssignmentToolbarProps {
  schoolYear: string;
  schoolTypeId: string;
  schoolTypeName: string;
  onGenerate: () => void;
  onSave: () => void;
  loading: boolean;
  result: AssignmentResult | null;
  mode: AssignmentMode;
  onModeChange: (mode: AssignmentMode) => void;
}

export type AssignmentMode =
  | "assign"
  | "director"
  | "extensions"
  | "groups"
  | "remove";

const MODES: Array<{ value: AssignmentMode; label: string; icon: string }> = [
  { value: "assign", label: "Godziny do wyboru", icon: "📋" },
  { value: "director", label: "Godziny dyrektorskie", icon: "👤" },
  { value: "extensions", label: "Rozszerzenia", icon: "📐" },
  { value: "groups", label: "Podział na grupy", icon: "👥" },
  { value: "remove", label: "Usuń", icon: "🗑️" },
];

export function AssignmentToolbar({
  schoolYear,
  schoolTypeName,
  onGenerate,
  onSave,
  loading,
  result,
  mode,
  onModeChange,
}: AssignmentToolbarProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Przydział godzin</h1>
          <p className="text-sm text-gray-500">
            {schoolTypeName} — {schoolYear}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={onGenerate} loading={loading}>
            Generuj automatyczny przydział
          </Button>
          <Button
            variant="secondary"
            onClick={onSave}
            disabled={!result || loading}
          >
            Zapisz przydział
          </Button>
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => onModeChange(m.value)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === m.value
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span>{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Result summary */}
      {result && (
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span>Przypisane: {result.metrics.successfulAssignments}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span>Braki kadrowe: {result.metrics.failedAssignments}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span>
              Wyrównanie: {(result.metrics.balanceCoefficient * 100).toFixed(1)}
              %
            </span>
          </div>
          {result.warnings.length > 0 && (
            <div className="flex items-center gap-2 text-amber-600">
              <span>⚠️</span>
              <span>{result.warnings.length} ostrzeżeń</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
