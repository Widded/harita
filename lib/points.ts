export type Point = { no: string; y: number; x: number };

export type Row = {
  no: string;
  dur: string;
  kontrolY: number;
  kontrolX: number;
  yukY: number;
  yukX: number;
  farkY: number;
  farkX: number;
};

export const isPoligon = (no: string) => /^\s*p/i.test(no);

/** "404661,38" / "404661.38" / "404.661,38" → sayı */
export function parseNumber(raw: string): number | null {
  let s = String(raw).trim().replace(/\s/g, "");
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** P noktaları önce (ilk P = durulan), sonra diğerleri; Yük = Kontrol + 0.01. */
export function buildRows(points: Point[]): {
  durulan: string;
  rows: Row[];
  totalY: number;
  totalX: number;
} {
  const ordered = [...points.filter((p) => isPoligon(p.no)), ...points.filter((p) => !isPoligon(p.no))];
  const durulan = ordered.find((p) => isPoligon(p.no))?.no ?? "";
  const rows: Row[] = ordered.map((p, i) => {
    const ky = Math.round(p.y * 100);
    const kx = Math.round(p.x * 100);
    return {
      no: p.no,
      dur: i === 0 ? durulan : "",
      kontrolY: ky / 100,
      kontrolX: kx / 100,
      yukY: (ky + 1) / 100,
      yukX: (kx + 1) / 100,
      farkY: 0.01,
      farkX: 0.01,
    };
  });
  return { durulan, rows, totalY: rows.length / 100, totalX: rows.length / 100 };
}
