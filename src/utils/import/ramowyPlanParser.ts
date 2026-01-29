// ramowyPlanParser.ts
import type { RamowyPlan, RamowyPlanSubject, RamowyPlanParseResult } from "./ramowyPlanTypes";
import {
  extractPdfItems,
  groupIntoRows,
  rowToCells,
  type PdfTextItem,
} from "@/utils/import/pdfTableExtractor";

const NOISE_PATTERNS = [
  /^dziennik\s+ustaw/i,
  /^poz\.\s*\d+/i,
  /^warszawa/i,
  /^rozporządzenie/i,
  /^minister/i,
  /^załącznik/i,
  /^ramowy\s+plan/i,
  /^lp\.?$/i,
  /^obowiązkowe\s+zajęcia/i,
  /^tygodniowy\s+wymiar/i,
  /^razem\s+na\s+obowiązkowe/i,
  /^godziny\s+do\s+dyspozycji/i,
  /^ogółem/i,
];

function normalize(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function isNoiseSubject(s: string) {
  const t = normalize(s).toLowerCase();
  if (!t) return true;
  if (t.length <= 2) return true;
  if (/^\d+$/.test(t)) return true;
  if (/^[\.\,\-\–\—]+$/.test(t)) return true;
  if (NOISE_PATTERNS.some((r) => r.test(t))) return true;

  // musi mieć jakąś literę
  if (!/[a-ząćęłńóśźż]/i.test(t)) return true;

  // stopwordy, które wpadają przy rozpadzie tekstu
  if (["się", "jest", "lat", "latach", "oraz", "także"].includes(t)) return true;

  return false;
}

/** Bierzemy TYLKO czystą liczbę jako total_hours. Reszta -> raw. */
function parseTotal(val: string): { total_hours: number | null; total_hours_raw: string } {
  const raw = normalize(val);
  if (!raw) return { total_hours: null, total_hours_raw: "" };
  if (/^\d+$/.test(raw)) return { total_hours: parseInt(raw, 10), total_hours_raw: raw };
  return { total_hours: null, total_hours_raw: raw };
}

/** Nagłówek tabeli: musi mieć "przedmiot" i "razem". */
function isHeaderRow(cells: string[]) {
  const joined = cells.join(" ").toLowerCase();
  return joined.includes("przedmiot") && joined.includes("razem");
}

function findRazemCol(cells: string[]) {
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i].toLowerCase();
    if (/\brazem\b/.test(c)) return i;
  }
  return -1;
}

function stablePlanId(attachmentNo: string, schoolType: string, cycle: string) {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9ąćęłńóśźż\-]/gi, "");
  return `plan_${attachmentNo}_${slug(schoolType)}_${slug(cycle)}`;
}

function detectPlansFromPageText(pageText: string, lastAttachment: { val: string }) {
  const plans: { attachmentNo: string; schoolType: string; cycle: string }[] = [];

  const z = pageText.match(/Załącznik\s+nr\.?\s*(\d+)/i);
  if (z) lastAttachment.val = z[1];

  const r = pageText.match(/RAMOWY\s+PLAN\s+NAUCZANIA\s+DLA\s+([^\n]+)/i);
  if (!r) return plans;

  const schoolType = normalize(r[1]);

  const cycleMatch =
    pageText.match(/Klasy\s+([IVXLCDM0-9]+)\s*[–\-]\s*([IVXLCDM0-9]+)/i) ||
    pageText.match(/klasach?\s+([IVXLCDM0-9]+)\s*[–\-]\s*([IVXLCDM0-9]+)/i) ||
    pageText.match(/semestrze?\s+([IVXLCDM0-9]+)/i);

  let cycle = "nie określono";
  if (cycleMatch) {
    if (cycleMatch.length >= 3) cycle = `Klasy ${cycleMatch[1]}–${cycleMatch[2]}`;
    else cycle = `Semestr ${cycleMatch[1]}`;
  }

  plans.push({
    attachmentNo: lastAttachment.val || "?",
    schoolType,
    cycle,
  });

  return plans;
}

/**
 * NOWA metoda: parsowanie bez OCR i bez tekstowego "split po spacji".
 * Rekonstruuje tabelę po współrzędnych x/y.
 */
export async function parseRamowyPlanyFromPdf(pdfPath: string): Promise<RamowyPlanParseResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const plans: RamowyPlan[] = [];

  const pageItems = await extractPdfItems(pdfPath);

  type Row = { y: number; items: PdfTextItem[] };

  const lastAttachment = { val: "" };
  const planMetaByPage = new Map<
    number,
    { attachmentNo: string; schoolType: string; cycle: string }
  >();

  // Wykryj meta planów z tekstu strony (sklejonego z itemów)
  for (const p of pageItems) {
    const rows = groupIntoRows(p.items, 2.0);
    const pageText = rows
      .map((r: Row) => r.items.map((i: PdfTextItem) => i.str).join(" "))
      .join("\n");
    const detected = detectPlansFromPageText(pageText, lastAttachment);
    if (detected.length) planMetaByPage.set(p.pageNumber, detected[0]);
  }

  if (planMetaByPage.size === 0) {
    warnings.push('Nie wykryto nagłówków "RAMOWY PLAN NAUCZANIA DLA...". Spróbuję mimo to wyłapać tabele.');
  }

  const merged = new Map<
    string,
    {
      attachmentNo: string;
      schoolType: string;
      cycle: string;
      pages: number[];
      subjects: RamowyPlanSubject[];
    }
  >();

  for (const p of pageItems) {
    const rows = groupIntoRows(p.items, 2.0);

    const cellRows = rows
      .map((r: Row) => rowToCells(r.items, 7.0))
      .filter((cells: string[]) => cells.length >= 2);

    let headerIndex = -1;
    let razemCol = -1;

    for (let i = 0; i < cellRows.length; i++) {
      if (isHeaderRow(cellRows[i])) {
        headerIndex = i;
        razemCol = findRazemCol(cellRows[i]);
        break;
      }
    }

    if (headerIndex < 0 || razemCol < 0) continue;

    const meta = planMetaByPage.get(p.pageNumber) ?? {
      attachmentNo: "?",
      schoolType: "Nieznany typ szkoły",
      cycle: "nie określono",
    };

    const planId = stablePlanId(meta.attachmentNo, meta.schoolType, meta.cycle);

    if (!merged.has(planId)) {
      merged.set(planId, {
        attachmentNo: meta.attachmentNo,
        schoolType: meta.schoolType,
        cycle: meta.cycle,
        pages: [],
        subjects: [],
      });
    }

    const entry = merged.get(planId)!;
    if (!entry.pages.includes(p.pageNumber)) entry.pages.push(p.pageNumber);

    for (let i = headerIndex + 1; i < cellRows.length; i++) {
      const cells = cellRows[i];
      if (!cells.length) continue;

      const subjectCell = normalize(cells[0]);
      if (isNoiseSubject(subjectCell)) continue;

      // Stop jeśli zaczęły się przypisy/teksty opisowe
      if (subjectCell.length > 80 && subjectCell.includes("ustawy")) break;

      const razemRaw = normalize(cells[razemCol] ?? "");
      const { total_hours, total_hours_raw } = parseTotal(razemRaw);

      if (!total_hours && !total_hours_raw) continue;

      const key = `${subjectCell}|${total_hours ?? ""}|${total_hours_raw}`;
      const exists = entry.subjects.some(
        (s) => `${s.subject}|${s.total_hours ?? ""}|${s.total_hours_raw}` === key
      );
      if (exists) continue;

      entry.subjects.push({
        subject: subjectCell,
        total_hours,
        total_hours_raw: total_hours_raw || (total_hours != null ? String(total_hours) : ""),
      });
    }
  }

  for (const [planId, meta] of merged) {
    plans.push({
      plan_id: planId,
      attachment_no: meta.attachmentNo,
      school_type: meta.schoolType,
      cycle: meta.cycle,
      source_pages: meta.pages.sort((a, b) => a - b),
      subjects: meta.subjects,
    });
  }

  if (plans.length === 0) errors.push("Nie udało się znaleźć tabel z ramowymi planami (Przedmiot/Razem).");

  return { plans, errors, warnings };
}
