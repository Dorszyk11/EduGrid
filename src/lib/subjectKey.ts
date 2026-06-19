/**
 * Klucz przedmiotu w obrębie planu MEiN — JEDNO źródło prawdy formatu klucza
 * (wcześniej zduplikowane 4× w lib/ i utils/). Format: `${planId|'plan'}_${subject.trim()}`.
 * Zmiana formatu MUSI być świadoma — wiąże przydział, realizację i dyspozycję po tym samym kluczu.
 */
export function subjectKey(planId: string | undefined, subjectName: string): string {
  return `${planId ?? 'plan'}_${(subjectName || '').trim()}`;
}
