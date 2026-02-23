"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AssignmentToolbar,
  MeinPlanTable,
  AssignmentResultPanel,
  type AssignmentMode,
} from "@/features/assignment/presentation/components";
import { useAssignmentTable } from "@/features/assignment/presentation/hooks";
import type { MeinPlan } from "@/features/assignment/presentation/types";
import type { AssignmentResult } from "@/features/assignment/domain/entities";

interface SchoolType {
  id: string;
  name: string;
}

interface ClassItem {
  id: string;
  name: string;
  schoolYear: string;
  schoolTypeId: string;
}

export default function PrzydzialPage() {
  // Filters
  const [schoolTypes, setSchoolTypes] = useState<SchoolType[]>([]);
  const [selectedSchoolTypeId, setSelectedSchoolTypeId] = useState("");
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedLetter, setSelectedLetter] = useState("");
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Plans
  const [plans, setPlans] = useState<MeinPlan[]>([]);

  // Assignment state
  const [mode, setMode] = useState<AssignmentMode>("assign");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<AssignmentResult | null>(null);
  const [showResultPanel, setShowResultPanel] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Derived values
  const selectedSchoolType = schoolTypes.find(
    (t) => t.id === selectedSchoolTypeId,
  );
  const years = [...new Set(classes.map((c) => c.schoolYear))].sort();
  const letters = selectedYear
    ? [
        ...new Set(
          classes
            .filter((c) => c.schoolYear === selectedYear)
            .map((c) => c.name),
        ),
      ].sort()
    : [];
  const selectedClass = classes.find(
    (c) => c.schoolYear === selectedYear && c.name === selectedLetter,
  );

  // Assignment table hook
  const { state, dispatch, summaries } = useAssignmentTable({
    classId: selectedClass?.id ?? null,
    plans,
    onAssignmentChange: () => setMessage(null),
  });

  // Load school types on mount
  useEffect(() => {
    setLoadingTypes(true);
    fetch("/api/school-types")
      .then((r) => r.json())
      .then((data: SchoolType[]) => setSchoolTypes(data))
      .catch(() => setSchoolTypes([]))
      .finally(() => setLoadingTypes(false));
  }, []);

  // Load classes when school type changes
  useEffect(() => {
    if (!selectedSchoolTypeId) {
      setClasses([]);
      setSelectedYear("");
      setSelectedLetter("");
      return;
    }
    setLoadingClasses(true);
    setSelectedYear("");
    setSelectedLetter("");
    fetch(`/api/classes?schoolTypeId=${selectedSchoolTypeId}`)
      .then((r) => r.json())
      .then((data: ClassItem[]) => setClasses(data))
      .catch(() => setClasses([]))
      .finally(() => setLoadingClasses(false));
  }, [selectedSchoolTypeId]);

  // Load MEiN plans when school type changes
  useEffect(() => {
    if (!selectedSchoolType?.name) {
      setPlans([]);
      return;
    }
    fetch(
      `/api/mein-plans?schoolType=${encodeURIComponent(selectedSchoolType.name)}`,
    )
      .then((r) => r.json())
      .then((data: MeinPlan[]) => setPlans(data))
      .catch(() => setPlans([]));
  }, [selectedSchoolType?.name]);

  // Generate automatic assignment
  const handleGenerate = useCallback(async () => {
    if (!selectedClass?.id || !selectedSchoolTypeId) {
      setMessage({ type: "error", text: "Wybierz typ szkoły i klasę" });
      return;
    }

    setGenerating(true);
    setMessage(null);
    setResult(null);

    try {
      const response = await fetch("/api/assignment/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClass.id,
          schoolTypeId: selectedSchoolTypeId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Błąd przy generowaniu przydziału");
      }

      setResult(data.result);
      setShowResultPanel(true);
      setMessage({
        type: "success",
        text: `Przydzielono ${data.result.metrics.successfulAssignments} godzin. ${
          data.result.metrics.failedAssignments > 0
            ? `Braki kadrowe: ${data.result.metrics.failedAssignments}.`
            : ""
        }`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Nieznany błąd",
      });
    } finally {
      setGenerating(false);
    }
  }, [selectedClass?.id, selectedSchoolTypeId]);

  // Save assignment
  const handleSave = useCallback(async () => {
    if (!selectedClass?.id) return;
    setMessage(null);

    try {
      const response = await fetch("/api/assignment/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClass.id,
          state: {
            ...state,
            extensionSubjectKeys: Array.from(state.extensionSubjectKeys),
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Błąd przy zapisie");
      }

      setMessage({ type: "success", text: "Przydział zapisany pomyślnie." });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Nieznany błąd",
      });
    }
  }, [selectedClass?.id, state]);

  return (
    <div className="space-y-4 max-w-full overflow-hidden">
      {/* Toolbar */}
      <AssignmentToolbar
        schoolYear={selectedYear}
        schoolTypeId={selectedSchoolTypeId}
        schoolTypeName={selectedSchoolType?.name ?? ""}
        onGenerate={handleGenerate}
        onSave={handleSave}
        loading={generating}
        result={result}
        mode={mode}
        onModeChange={setMode}
      />

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* School type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Typ szkoły
            </label>
            <select
              value={selectedSchoolTypeId}
              onChange={(e) => setSelectedSchoolTypeId(e.target.value)}
              disabled={loadingTypes}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Wybierz typ szkoły...</option>
              {schoolTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rocznik
            </label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setSelectedLetter("");
              }}
              disabled={!selectedSchoolTypeId || loadingClasses}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Wybierz rocznik...</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Class letter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Klasa
            </label>
            <select
              value={selectedLetter}
              onChange={(e) => setSelectedLetter(e.target.value)}
              disabled={!selectedYear}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Wybierz klasę...</option>
              {letters.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Plan tables */}
      {plans.length === 0 && selectedSchoolTypeId && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800">
          <p className="font-medium">
            Brak planu ramowego MEiN dla wybranego typu szkoły.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {plans.map((plan, idx) => (
          <MeinPlanTable
            key={plan.planId}
            plan={plan}
            state={state}
            summary={summaries[idx]}
            mode={mode}
            readOnly={!selectedClass}
            classId={selectedClass?.id ?? null}
            onAction={dispatch}
          />
        ))}
      </div>

      {/* Result panel (slide-in) */}
      {showResultPanel && result && (
        <AssignmentResultPanel
          result={result}
          onClose={() => setShowResultPanel(false)}
        />
      )}
    </div>
  );
}
