import { describe, expect, it } from "vitest";
import { tableBox, toGray } from "./detect";

/** Beyaz zemin üzerine siyah ızgara çizer (düzgün, eğik olmayan tablo). */
function gridImage(w: number, h: number, box: { x: number; y: number; w: number; h: number }) {
  const rgba = new Uint8ClampedArray(w * h * 4).fill(255);
  const dark = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = (y * w + x) * 4;
    rgba[p] = rgba[p + 1] = rgba[p + 2] = 0;
  };
  const x0 = box.x;
  const y0 = box.y;
  const x1 = box.x + box.w;
  const y1 = box.y + box.h;
  for (let t = 0; t < 2; t++) {
    for (let x = x0; x <= x1; x++) {
      dark(x, y0 + t);
      dark(x, y1 - t);
    }
    for (let y = y0; y <= y1; y++) {
      dark(x0 + t, y);
      dark(x1 - t, y);
    }
  }
  const rows = 5;
  for (let r = 1; r < rows; r++) {
    const y = Math.round(y0 + ((y1 - y0) / rows) * r);
    for (let x = x0; x <= x1; x++) dark(x, y);
  }
  const cols = 4;
  for (let c = 1; c < cols; c++) {
    const x = Math.round(x0 + ((x1 - x0) / cols) * c);
    for (let y = y0; y <= y1; y++) dark(x, y);
  }
  return toGray(rgba, w, h);
}

describe("tableBox", () => {
  it("ızgara bölgesini bulur", () => {
    const g = gridImage(300, 200, { x: 30, y: 40, w: 240, h: 120 });
    const box = tableBox(g);
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThan(0.05);
    expect(box!.x).toBeLessThan(0.15);
    expect(box!.y).toBeGreaterThan(0.15);
    expect(box!.y).toBeLessThan(0.25);
    expect(box!.w).toBeGreaterThan(0.7);
    expect(box!.h).toBeGreaterThan(0.5);
  });

  it("boş görselde kutu uydurmaz", () => {
    const rgba = new Uint8ClampedArray(200 * 100 * 4).fill(255);
    expect(tableBox(toGray(rgba, 200, 100))).toBeNull();
  });
});
