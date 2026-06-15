/**
 * Współdzielone typy modelu przydziału godzin (plany ramowe MEiN).
 * Jedno źródło prawdy zamiast kopii w trasach i komponencie PlanMeinTabela.
 */

/** Godziny w rozbiciu na roczniki, np. { "1": 2, "2": 1 }. */
export type HoursByGrade = Record<string, number>;

/** Surowe wartości komórek (np. "2*", "—") – do wyświetlania, nie do obliczeń. */
export type RawByGrade = Record<string, string>;

/** Przydział godzin z podziałem na grupy (1 i 2) per rocznik. */
export type PrzydzialGrupyByGrade = Record<string, { 1: number; 2: number }>;

/** Wiersz przedmiotu w planie ramowym MEiN. */
export interface SubjectRow {
  lp?: number;
  subject?: string;
  hours_by_grade?: HoursByGrade;
  additional_by_grade?: HoursByGrade;
  total_hours?: number;
  additional_total?: number;
  raw?: RawByGrade;
  hours_to_choose?: number;
}

/** Wiersz puli godzin do dyspozycji dyrektora. */
export interface DirectorRow {
  director_discretion_hours: { total_hours: number };
}

export interface TableStructure {
  grades?: string[];
  unit?: string;
}

/** Plan ramowy MEiN dla jednego typu/cyklu szkoły. */
export interface PlanMein {
  plan_id?: string;
  attachment_no?: string;
  school_type: string;
  cycle: string;
  cycle_short?: string;
  scope?: string;
  grades?: string[];
  table_structure?: TableStructure;
  source_pages?: number[];
  source_pages_hint?: number[];
  subjects: (SubjectRow | DirectorRow)[];
}
