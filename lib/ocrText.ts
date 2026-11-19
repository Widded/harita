import type { Point } from "./points";

export type OcrPoint = Point & { suspect: boolean };

// Nokta no + İTRF Y (6 hane) + İTRF X (7 hane) üçlüsü. Soldaki İMAR bloğu ve
// kırpımda bozulmuş sol nokta no'su böylece atlanır.
const TRIPLET = /([Pp]\.?\d+|\d{1,4})\s+(\d{6}\.\d{2})\s+(\d{7}\.\d{2})/;
// "454593313" → ondalık düşmüş X değeri
const NO_DOT = /(?<![\d.])\d{9,}(?![\d.])/g;

/**
 * OCR metninden İTRF noktalarını çıkarır. Ondalığı düşmüş değerleri onarır ve
 * o satırı şüpheli işaretler.
 */
export function parseOcrText(text: string): OcrPoint[] {
  const out: OcrPoint[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine;
    const broken = line.match(NO_DOT);
    if (broken) {
      line = line.replace(NO_DOT, (m) => `${m.slice(0, -2)}.${m.slice(-2)}`);
    }

    const m = line.match(TRIPLET);
    if (!m) continue;
    const y = Number(m[2]);
    const x = Number(m[3]);
    if (y < 300_000 || y > 500_000 || x < 4_000_000 || x > 4_700_000) continue;

    out.push({
      no: /^p/i.test(m[1]) ? m[1].toUpperCase() : m[1],
      y,
      x,
      suspect: Boolean(broken),
    });
  }
  return out;
}
