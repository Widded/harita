import type { Row } from "./points";

export const HEADERS = [
  "DUR. NOK",
  "BAK. NOK",
  "YATAY AÇI",
  "DÜŞEY AÇI",
  "İNDRG. KENAR",
  "KONTROL Y (m)",
  "Yük. Y",
  "KONTROL X (m)",
  "Yük. X",
  "YÜKSEKLİK H (cm)",
  "Yük. H (cm)",
  "FARKLAR Y",
  "FARKLAR X",
  "FARKLAR H",
];

/** Ekrandaki/kopyalanan tablo: başlık + satırlar + toplam. */
export function toGrid(rows: Row[], totalY: number, totalX: number): string[][] {
  const body = rows.map((r) => [
    r.dur,
    r.dur ? "" : r.no,
    "",
    "",
    "",
    r.kontrolY.toFixed(2),
    r.yukY.toFixed(2),
    r.kontrolX.toFixed(2),
    r.yukX.toFixed(2),
    "",
    "",
    r.farkY.toFixed(2),
    r.farkX.toFixed(2),
    "",
  ]);
  const total = ["", "", "", "", "", "", "", "", "", "", "TOPLAM", totalY.toFixed(2), totalX.toFixed(2), ""];
  return [HEADERS, ...body, total];
}

export function toTsv(rows: Row[], totalY: number, totalX: number): string {
  return toGrid(rows, totalY, totalX)
    .map((r) => r.join("\t"))
    .join("\n");
}
