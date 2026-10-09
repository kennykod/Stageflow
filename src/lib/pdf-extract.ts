"use client";

/**
 * Client-side PDF text extraction with pdf.js. The file never leaves the browser
 * in this prototype. Scanned PDFs (images only) yield no text – OCR would be done
 * server-side in production (see README: remaining production requirements).
 */
export async function extractPdfText(file: ArrayBuffer, onProgress?: (page: number, total: number) => void): Promise<{ text: string; pages: number; empty: boolean }> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: new Uint8Array(file), isEvalSupported: false }).promise;
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let line = "";
    let lastY: number | null = null;
    for (const item of content.items as { str: string; hasEOL?: boolean; transform: number[] }[]) {
      const y = item.transform?.[5] ?? 0;
      if (lastY !== null && Math.abs(y - lastY) > 2 && line) {
        out.push(line);
        line = "";
      }
      line += item.str;
      lastY = y;
      if (item.hasEOL) {
        out.push(line);
        line = "";
        lastY = null;
      }
    }
    if (line) out.push(line);
    out.push("");
    onProgress?.(i, doc.numPages);
  }
  const text = out.join("\n");
  return { text, pages: doc.numPages, empty: text.replace(/\s/g, "").length < 20 };
}
