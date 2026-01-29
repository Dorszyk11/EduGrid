import type { PdfExtractionResult } from "./types";
import type {
  RamowyPlan,
  RamowyPlanSubject,
  RamowyPlanParseResult,
} from "./ramowyPlanTypes";

const SKIP = [
  /^Razem\s+na\s+obowiązkowe/i,
  /^Razem\s+przedmioty\s+(w\s+)?zakresie/i,
  /^Godziny\s+do\s+dyspozycji\s+dyrektora/i,
  /^Ogółem\s*$/i,
  /^Lp\.\s*$/i,
  /^Dziennik\s+Ustaw\s|^Poz\.\s*\d+/i,
];

function n(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function skipRow(name: string) {
  return SKIP.some((r) => r.test(n(name)));
}

/** Odrzuca śmieciowe "przedmioty": +, pkt 2 i, fragmenty przypisów itp. */
function isNoiseSubject(subject: string): boolean {
  const s = n(subject);
  if (!s || s.length < 4) return true;
  if (/^[+\-]\s*$|^[+\-]$/.test(s)) return true;
  if (/^pkt\s+\d+/i.test(s)) return true;
  if (/^[\d+\-)\s,]+$/.test(s)) return true;
  if (/^\d+\)|\d+\)\s*$/.test(s)) return true;
  const letters = (s.match(/[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g) ?? []).length;
  if (letters < 3) return true;
  return false;
}

/** Wykrywa „ogon” Razem na końcu wiersza: liczba, "–", "X–Y", "X + Y", "X + Y)". */
function takeRazemTail(tokens: string[]): { raw: string; total: number | null; len: number } | null {
  if (tokens.length < 2) return null;
  const last = tokens[tokens.length - 1]!.replace(/\s/g, "");
  const prev = tokens[tokens.length - 2];
  const prev2 = tokens[tokens.length - 3];

  if (tokens.length >= 3 && prev !== undefined && prev2 !== undefined && /^\+$/.test(prev.trim()) && /^\d+$/.test(prev2.replace(/\s/g, "")) && (/^\d+$/.test(last) || /^\d+\)$/.test(last))) {
    return { raw: `${prev2} + ${last}`, total: null, len: 3 };
  }

  if (/^\d+$/.test(last)) {
    const num = parseInt(last, 10);
    return { raw: last, total: num, len: 1 };
  }
  if (/^–$/.test(last)) return { raw: "–", total: null, len: 1 };
  if (/^\d+–\d+$/.test(last)) return { raw: last, total: null, len: 1 };
  if (/^\d+[+\-]\d+\)?$/.test(last)) return { raw: last, total: null, len: 1 };

  return null;
}

/** Ostatni „ogon” = Razem; reszta = przedmiot. Obsługa "15 + 4", "–", "29–31" itd. */
function parseRowLastNumber(line: string): { subject: string; total_hours: number | null; total_hours_raw: string } | null {
  const tokens = line.split(/\s+/).filter(Boolean);
  const tail = takeRazemTail(tokens);
  if (!tail || tokens.length <= tail.len) return null;

  const rest = tokens.slice(0, -tail.len);
  let end = rest.length;
  while (end > 0) {
    const t = rest[end - 1]!;
    if (/^\d+$|^–$|^\+$/.test(t) || /^\d+[+\-]\d*\)?$|^\d+\)$/.test(t)) end--;
    else break;
  }
  let subject = rest.slice(0, end).join(" ").trim().replace(/^\d+\s+/, "").trim();
  if (!subject || /^\d+$/.test(subject)) return null;
  if (skipRow(subject)) return null;
  if (isNoiseSubject(subject)) return null;
  if (/^Lp\.|^Przedmiot\s*$|^Nazwa\s+przedmiotu\s*$/i.test(subject)) return null;

  const total_hours_raw = tail.raw || (tail.total != null ? String(tail.total) : "");
  return { subject: n(subject), total_hours: tail.total, total_hours_raw };
}

function stableId(att: string, school: string, cycle: string) {
  const slug = (x: string) =>
    x
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9ąćęłńóśźż\-]/g, "");
  return `plan_${att}_${slug(school)}_${slug(cycle)}`;
}

/** Normalizacja school_type do formy z ramowe-plany.json. */
function normalizeSchoolType(school: string): string {
  const s = n(school);
  if (/SZKOŁ[AY]\s+PODSTAWOW|szkoła\s+podstawowa/i.test(s)) return "Szkoła podstawowa";
  if (/ODDZIAŁÓW\s+PRZYSPOSABIAJĄCYCH|przysposabiających\s+do\s+pracy/i.test(s)) return "Oddziały przysposabiające do pracy (w klasach VII i VIII szkoły podstawowej)";
  if (/BRANŻOW[AĄ]\s+SZKOŁ[AY]\s+I\s+STOPNIA|branżowa\s+szkoła\s+i\s+stopnia/i.test(s)) return "Branżowa szkoła I stopnia";
  if (/LICEUM\s+OGÓLNOKSZTAŁCĄC|liceum\s+ogólnokształcąc/i.test(s)) return "Liceum ogólnokształcące";
  if (/TECHNIKUM\b|technikum\b/i.test(s)) return "Technikum";
  return s;
}

/** Normalizacja cycle do formy z ramowe-plany.json. */
function normalizeCycle(cycle: string, school: string): string {
  const sc = n(school);
  if (/PRZYSPOSABIAJĄCYCH|ODDZIAŁÓW\s+PRZYSPOSABIAJĄCYCH/i.test(sc)) return "Klasy VII–VIII (dwuletni okres)";
  if (/BRANŻOW|branżowa\s+szkoła/i.test(sc) && (/I–III|1–3|trzyletni/i.test(cycle) || /Klasy\s+I–III/i.test(cycle))) return "Klasy I–III (trzyletni okres)";
  if (/^Klasy\s+I–III$/i.test(cycle) || /^I–III$/i.test(cycle)) return "Klasy I–III";
  if (/^Klasy\s+IV–VIII$/i.test(cycle) || /^IV–VIII$/i.test(cycle)) return "Klasy IV–VIII";
  if (/^Klasy\s+VII–VIII$/i.test(cycle) || /^VII–VIII$/i.test(cycle)) return "Klasy VII–VIII (dwuletni okres)";
  return cycle;
}

const RE_RAZEM_LOOSE = /Razem\s+(?:w\s+)?\S*\s*okresie\s+nauczania/i;
const RE_OBOWIAZKOWE = /Obowiązkowe\s+zajęcia\s+edukacyjne(?:\s+i\s+zajęcia\s+z\s+wychowawcą)?/i;
const RE_LP_PRZEDMIOT = /\bLp\.\b|\bPrzedmiot\b|\bNazwa\s+przedmiotu\b/i;

/** Okno j-2..j+2; szukamy Razem+okresie+nauczania oraz Obowiązkowe/Lp/Przedmiot. */
function isTableHeader(lines: string[], j: number): boolean {
  const from = Math.max(0, j - 2);
  const to = Math.min(lines.length - 1, j + 2);
  let combined = "";
  for (let i = from; i <= to; i++) combined += (lines[i] ?? "") + " ";
  if (!RE_RAZEM_LOOSE.test(combined)) return false;
  return RE_OBOWIAZKOWE.test(combined) || RE_LP_PRZEDMIOT.test(combined);
}

function hasRazemOkresie(s: string): boolean {
  return RE_RAZEM_LOOSE.test(s);
}

/** Wyciąga cykl z fragmentu tekstu (nagłówek tabeli). */
function extractCycle(block: string): string {
  if (/trzyletni|trzyletnim/.test(block)) return "Klasy I–III";
  if (/pięcioletni|pięcioletnim/.test(block)) return "Klasy IV–VIII";
  if (/dwuletni|dwuletnim/.test(block)) return "Klasy VII–VIII";
  if (/czteroletni|czteroletnim/.test(block)) return "I–IV";

  const m1 = block.match(/(?:Klasy|klasy|etap)\s+([IVXLCDM0-9\s–\-]+?)(?:\s+Razem|\s+Tygodniowy|$|\n)/i);
  if (m1?.[1]) return n(m1[1]).replace(/\s+/g, " ");

  const m2 = block.match(/([IVXLCDM]+\s*[–\-]\s*[IVXLCDM]+)/);
  if (m2?.[1]) return n(m2[1]);

  return "nie określono";
}

/** Czy linia wygląda na kończącą się wartością Razem (liczba, –, X+Y) itd. */
function endsWithRazemValue(line: string): boolean {
  const t = line.trim().split(/\s+/).filter(Boolean).pop() ?? "";
  return /^\d+$|^–$|^\d+[+\-]\d+\)?$|^\d+–\d+/.test(t.replace(/\s/g, ""));
}

/** Łączy wielolinijkowe wiersze tabeli (np. "13 \\n Zajęcia przeznaczone..." → jeden wiersz). */
function mergeMultilineRows(blockLines: string[], headerEnd: number): string[] {
  const out: string[] = [];
  let i = headerEnd;
  const terminal = /Godziny\s+do\s+dyspozycji|\bOgółem\b|Dziennik\s+Ustaw|Załącznik\s+nr\.?\s*\d+/i;
  while (i < blockLines.length) {
    const cur = blockLines[i] ?? "";
    if (terminal.test(cur)) break;
    let merged = cur;
    let j = i + 1;
    while (j < blockLines.length && !terminal.test(blockLines[j] ?? "") && !endsWithRazemValue(merged)) {
      merged = n(merged + " " + (blockLines[j] ?? ""));
      j++;
    }
    if (merged) out.push(merged);
    i = j;
  }
  return out;
}

export function parseRamowyPlanyFromText(
  ext: PdfExtractionResult
): RamowyPlanParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const plans: RamowyPlan[] = [];
  const pages = ext.pages;
  const full = pages.join("\n");

  const skipFirstPages = pages.length > 1;
  const firstTablePageIndex = 4;

  const zal = /Załącznik\s+nr\.?\s*(\d+)/gi;
  const ramowy = /RAMOWY\s+PLAN\s+NAUCZANIA\s+DLA\s+([^\n]+)/gi;

  function extendSchool(pageText: string, base: string, matchEndOffset: number): string {
    let s = n(base).replace(/\s*\d+\)\s*$/, "").trim();
    const rest = pageText.slice(matchEndOffset);
    const needCont = /,\s*(?:W|Z|W\s+TYM|z|w)$/i;
    if (!needCont.test(s)) return s;
    const following = rest.split(/\r?\n/).map((l) => n(l)).filter(Boolean);
    for (let i = 0; i < Math.min(5, following.length); i++) {
      const line = following[i] ?? "";
      if (/Załącznik|Dziennik\s+Ustaw/i.test(line)) break;
      s = n(s + " " + line).replace(/\s*\d+\)\s*$/, "").trim();
      if (!needCont.test(s)) break;
    }
    return s;
  }

  interface Ctx {
    pos: number;
    att: string;
    school: string;
  }
  const contexts: Ctx[] = [];
  let pos = 0;
  for (let i = 0; i < pages.length; i++) {
    if (skipFirstPages && i < firstTablePageIndex) {
      pos += pages[i].length + 1;
      continue;
    }
    const p = pages[i];
    let m: RegExpExecArray | null;
    ramowy.lastIndex = 0;
    while ((m = ramowy.exec(p)) !== null) {
      const before = p.slice(0, m.index);
      zal.lastIndex = 0;
      let lastAtt = "";
      let zm: RegExpExecArray | null;
      while ((zm = zal.exec(before)) !== null) lastAtt = zm[1];
      const matchEnd = m.index + m[0].length;
      const school = extendSchool(p, m[1], matchEnd);
      contexts.push({ pos: pos + m.index, att: lastAtt || "?", school });
    }
    pos += p.length + 1;
  }

  const lines = full.split(/\r?\n/).map((l) => n(l)).filter(Boolean);
  const tableBlocks: { start: number; end: number; pageIndices: number[] }[] = [];
  const pageEnds: number[] = [];
  {
    let acc = 0;
    for (const p of pages) {
      acc += p.length + (pages.length > 1 ? 1 : 0);
      pageEnds.push(acc);
    }
  }

  function pageForOffset(charOffset: number): number {
    for (let pi = 0; pi < pageEnds.length; pi++) {
      if (charOffset < pageEnds[pi]!) return pi + 1;
    }
    return pageEnds.length || 1;
  }

  function findBlockEnd(start: number): number {
    let end = start + 1;
    while (end < lines.length) {
      const cur = lines[end];
      if (!cur) break;
      if (/Godziny\s+do\s+dyspozycji\s+dyrektora/i.test(cur)) break;
      if (/\bOgółem\b/.test(cur)) break;
      if (/Dziennik\s+Ustaw\s+[–\-]\s*\d+\s+[–\-]\s*Poz\./i.test(cur)) break;
      if (/Załącznik\s+nr\.?\s*\d+/i.test(cur) && end > start + 3) break;
      if (end > start + 5 && isTableHeader(lines, end)) break;
      end++;
    }
    return end;
  }

  const seenStarts = new Set<number>();

  for (let j = 0; j < lines.length; j++) {
    if (!isTableHeader(lines, j)) continue;
    const start = j;
    if (seenStarts.has(start)) continue;
    const end = findBlockEnd(start);
    const blockLines = lines.slice(start, end);
    const blockText = blockLines.join(" ");
    if (!hasRazemOkresie(blockText)) continue;
    seenStarts.add(start);
    const charStart = lines.slice(0, start).join("\n").length;
    const pg = pageForOffset(charStart);
    tableBlocks.push({ start, end, pageIndices: [pg] });
  }

  for (let j = 0; j < lines.length; j++) {
    const window = [lines[j], lines[j + 1], lines[j + 2]].filter(Boolean).join(" ");
    if (!hasRazemOkresie(window)) continue;
    let start = -1;
    for (let b = j; b >= Math.max(0, j - 12); b--) {
      const t = lines[b] ?? "";
      if (RE_OBOWIAZKOWE.test(t) || RE_LP_PRZEDMIOT.test(t)) start = b;
    }
    if (start < 0 || seenStarts.has(start)) continue;
    const end = findBlockEnd(start);
    const blockText = lines.slice(start, end).join(" ");
    if (!hasRazemOkresie(blockText)) continue;
    seenStarts.add(start);
    const charStart = lines.slice(0, start).join("\n").length;
    const pg = pageForOffset(charStart);
    tableBlocks.push({ start, end, pageIndices: [pg] });
  }

  if (!tableBlocks.length && /Razem|okresie\s+nauczania|Załącznik\s+nr\.?\s*\d+|RAMOWY\s+PLAN\s+NAUCZANIA/i.test(full)) {
    warnings.push("Nie znaleziono tabel z nagłówkiem 'Razem w … okresie nauczania'. Sprawdź format PDF.");
  }

  const planMap = new Map<
    string,
    { att: string; school: string; cycle: string; pages: number[]; subs: RamowyPlanSubject[] }
  >();

  for (const blk of tableBlocks) {
    const blockLines = lines.slice(blk.start, blk.end);
    const blockText = blockLines.join(" ");
    const cycle = extractCycle(blockText);
    const charStart = lines.slice(0, blk.start).join("\n").length;

    let ctx: Ctx | undefined;
    let best = -1;
    for (const c of contexts) {
      if (c.pos <= charStart && c.pos > best) {
        best = c.pos;
        ctx = c;
      }
    }
    if (!ctx) {
      const first = contexts[0];
      ctx = first ? { ...first } : { pos: 0, att: "1", school: "Nieznany typ szkoły" };
    }

    let headerEnd = 0;
    for (let j = 0; j < blockLines.length; j++) {
      if (isTableHeader(blockLines, j)) {
        headerEnd = j + 1;
        break;
      }
    }

    const effectiveCycle =
      /PRZYSPOSABIAJĄCYCH|ODDZIAŁÓW\s+PRZYSPOSABIAJĄCYCH/i.test(ctx.school)
        ? "Klasy VII–VIII"
        : cycle;

    const displaySchool = normalizeSchoolType(ctx.school);
    const displayCycle = normalizeCycle(effectiveCycle, ctx.school);

    const mergedRows = mergeMultilineRows(blockLines, headerEnd);
    const seen = new Set<string>();
    for (const row of mergedRows) {
      const parsed = parseRowLastNumber(row);
      if (!parsed) continue;
      const key = `${parsed.subject}|${parsed.total_hours ?? ""}|${parsed.total_hours_raw}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const pid = stableId(ctx.att, displaySchool, displayCycle);
      if (!planMap.has(pid)) {
        planMap.set(pid, {
          att: ctx.att,
          school: displaySchool,
          cycle: displayCycle,
          pages: [],
          subs: [],
        });
      }
      const ent = planMap.get(pid)!;
      for (const pg of blk.pageIndices) {
        if (!ent.pages.includes(pg)) ent.pages.push(pg);
      }
      ent.subs.push({
        subject: parsed.subject,
        total_hours: parsed.total_hours,
        total_hours_raw: parsed.total_hours_raw || (parsed.total_hours != null ? String(parsed.total_hours) : ""),
      });
    }
  }

  for (const [pid, meta] of planMap) {
    plans.push({
      plan_id: pid,
      attachment_no: meta.att,
      school_type: meta.school,
      cycle: meta.cycle,
      source_pages: [...meta.pages].sort((a, b) => a - b),
      subjects: meta.subs,
    });
  }

  if (!plans.length && !errors.length) {
    if (/Ramowy|Plan\s+nauczania|Załącznik/i.test(full)) {
      warnings.push('Znaleziono słowa kluczowe, ale nie wyciągnięto planów. Sprawdź nagłówki tabel.');
    } else {
      errors.push("Nie znaleziono ramowych planów nauczania.");
    }
  }

  return { plans, errors, warnings };
}
