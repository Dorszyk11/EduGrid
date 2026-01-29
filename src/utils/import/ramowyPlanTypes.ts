/**
 * Typy dla parsera ramowych planów (tylko kolumna "Razem").
 */

export interface RamowyPlanSubject {
  subject: string;
  total_hours: number | null;
  total_hours_raw: string;
}

export interface RamowyPlan {
  plan_id: string;
  attachment_no: string;
  school_type: string;
  cycle: string;
  source_pages: number[];
  subjects: RamowyPlanSubject[];
}

export interface RamowyPlanParseResult {
  plans: RamowyPlan[];
  errors: string[];
  warnings: string[];
}
