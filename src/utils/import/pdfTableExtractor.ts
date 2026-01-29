// pdfTableExtractor.ts
import fs from "fs";
import * as pdfjsLib from "pdfjs-dist";

// Node: wyłącz worker
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = undefined;

export interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PdfPageItems {
  pageNumber: number; // 1-based
  items: PdfTextItem[];
}

function normalizeSpaces(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

export async function extractPdfItems(pdfPath: string): Promise<PdfPageItems[]> {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data }).promise;

  const pages: PdfPageItems[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();

    const items: PdfTextItem[] = (textContent.items as any[])
      .map((it) => {
        const str = normalizeSpaces(String(it.str ?? ""));
        if (!str) return null;

        const t = it.transform; // [a,b,c,d,e,f], e/f = pozycja
        const x = t?.[4] ?? 0;
        const y = t?.[5] ?? 0;

        const w = it.width ?? 0;
        const h = it.height ?? 0;

        return { str, x, y, w, h } as PdfTextItem;
      })
      .filter(Boolean) as PdfTextItem[];

    // sort: góra->dół, lewo->prawo
    items.sort((a, b) => (b.y - a.y) || (a.x - b.x));

    pages.push({ pageNumber: pageNum, items });
  }

  return pages;
}

/** Grupuj elementy w wiersze po Y */
export function groupIntoRows(items: PdfTextItem[], yTolerance = 2.0) {
  const rows: { y: number; items: PdfTextItem[] }[] = [];

  for (const it of items) {
    let row = rows.find((r) => Math.abs(r.y - it.y) <= yTolerance);
    if (!row) {
      row = { y: it.y, items: [] };
      rows.push(row);
    }
    row.items.push(it);
  }

  rows.sort((a, b) => b.y - a.y);
  for (const r of rows) r.items.sort((a, b) => a.x - b.x);

  return rows;
}

/** Zamień wiersz na "komórki" (kolumny) po X */
export function rowToCells(rowItems: PdfTextItem[], xTolerance = 7.0) {
  const cells: { x: number; parts: PdfTextItem[] }[] = [];

  for (const it of rowItems) {
    let cell = cells.find((c) => Math.abs(c.x - it.x) <= xTolerance);
    if (!cell) {
      cell = { x: it.x, parts: [] };
      cells.push(cell);
    }
    cell.parts.push(it);
  }

  cells.sort((a, b) => a.x - b.x);

  return cells.map((c) => normalizeSpaces(c.parts.map((p) => p.str).join(" ")));
}