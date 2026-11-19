import { describe, expect, it } from "vitest";
import { parseOcrText } from "./ocrText";

// Tesseract.js'in 1.jpeg kırpımından (2 kat büyütülmüş) ürettiği gerçek metin
const OCR = `2 0
-17077.06 6897.70 1 404661.38 4545929.42
-17084.19 6881.05 2 404654.05 4545912.86
27 -17083.63 6901.33 27 404654.85 4545933.13
54 -17077.53 6897.96 54 404660.91 4545929.69
31 -17091.40 6883.65 61 404646.87 4545915.54
32 -17084.49 6880.40 62 404653.74 4545912.21
71 -17076.63 6897.46 71 404661.80 4545929.18
P4779 -16972.36 6875.76  P.4779 404765.83 4545906.26
P.4845 -18068.32 6910.62  P.4845 403670.22 4545953.94
P 4928 -16942.16 6948.93  P.4928 404796.88 4545979.08

P

216126 2771.62.61.27 148.63 0.37 149.00 I . 8
`;

describe("parseOcrText", () => {
  it("İMAR bloğunu atlar, sağdaki (İTRF) nokta no'sunu alır", () => {
    const points = parseOcrText(OCR);
    expect(points.map((p) => p.no)).toEqual(["1", "2", "27", "54", "61", "62", "71", "P.4779", "P.4845", "P.4928"]);
    expect(points[0]).toEqual({ no: "1", y: 404661.38, x: 4545929.42, suspect: false });
    expect(points.at(-1)).toMatchObject({ no: "P.4928", y: 404796.88, x: 4545979.08 });
  });

  it("ondalığı düşen değeri onarır ve şüpheli işaretler", () => {
    const [{ no, x, suspect }] = parseOcrText("27 404654.85 454593313");
    expect(no).toBe("27");
    expect(x).toBe(4545933.13);
    expect(suspect).toBe(true);
  });

  it("çöp satırları ve aralık dışı değerleri yok sayar", () => {
    expect(parseOcrText("PP II P P\n 0\nI\n1 123456.78 654321.98")).toEqual([]);
  });
});
