import { describe, expect, it } from "vitest";
import { buildRows, parseNumber, type Point } from "./points";

const POINTS: Point[] = [
  { no: "1", y: 404661.38, x: 4545929.42 },
  { no: "2", y: 404654.05, x: 4545912.86 },
  { no: "27", y: 404654.85, x: 4545933.13 },
  { no: "54", y: 404660.91, x: 4545929.69 },
  { no: "61", y: 404646.87, x: 4545915.54 },
  { no: "62", y: 404653.74, x: 4545912.21 },
  { no: "71", y: 404661.8, x: 4545929.18 },
  { no: "P.4779", y: 404765.83, x: 4545906.26 },
  { no: "P.4845", y: 403670.22, x: 4545953.94 },
  { no: "P.4928", y: 404796.88, x: 4545979.08 },
];

describe("buildRows", () => {
  const { durulan, rows, totalY, totalX } = buildRows(POINTS);

  it("ilk P noktasını durulan yapar ve ilk satıra koyar", () => {
    expect(durulan).toBe("P.4779");
    expect(rows[0]).toMatchObject({ no: "P.4779", dur: "P.4779", kontrolY: 404765.83, yukY: 404765.84 });
    expect(rows[1].no).toBe("P.4845");
    expect(rows[1].dur).toBe("");
  });

  it("P noktaları önce, sonra detay noktaları gelir", () => {
    expect(rows.map((r) => r.no)).toEqual([
      "P.4779",
      "P.4845",
      "P.4928",
      "1",
      "2",
      "27",
      "54",
      "61",
      "62",
      "71",
    ]);
  });

  it("yük +0.01, fark 0.01, toplam satır sayısı × 0.01", () => {
    expect(rows[0].kontrolX).toBe(4545906.26);
    expect(rows[0].yukX).toBe(4545906.27);
    expect(rows[0].farkY).toBe(0.01);
    expect(rows).toHaveLength(10);
    expect(totalY.toFixed(2)).toBe("0.10");
    expect(totalX.toFixed(2)).toBe("0.10");
  });

  it("kuruşta yuvarlama hatası yapmaz", () => {
    const { rows } = buildRows([{ no: "1", y: 404661.005, x: 4545929.004 }]);
    expect(rows[0].kontrolY).toBe(404661.01);
    expect(rows[0].kontrolX).toBe(4545929.0);
    expect(rows[0].yukY).toBe(404661.02);
  });
});

describe("parseNumber", () => {
  it("Türkçe ve noktalı ondalığı okur", () => {
    expect(parseNumber("404661,38")).toBe(404661.38);
    expect(parseNumber("404.661,38")).toBe(404661.38);
    expect(parseNumber("404661.38")).toBe(404661.38);
    expect(parseNumber("abc")).toBeNull();
  });
});
