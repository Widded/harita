import * as XLSX from "xlsx";
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

export function downloadXlsx(rows: Row[], totalY: number, totalX: number) {
  const aoa: (string | number)[][] = [
    ["POLİGON VE DETAY NOKTALARI KONTROL ÖLÇÜ VE HESAP ÇİZELGESİ"],
    ["Tapu ve Kadastro Genel Müdürlüğü"],
    [],
    HEADERS,
  ];
  for (const r of rows) {
    aoa.push([r.dur, r.dur ? "" : r.no, "", "", "", r.kontrolY, r.yukY, r.kontrolX, r.yukX, "", "", r.farkY, r.farkX, ""]);
  }
  aoa.push(["", "", "", "", "", "", "", "", "", "", "TOPLAM", totalY, totalX, ""]);
  aoa.push([]);
  aoa.push(["", "", "", "", "", "", "", "", "", "", "ORTALAMA FARKLAR", 0.01, 0.01, ""]);
  aoa.push(["", "", "", "", "", "", "", "", "", "", "HATA SINIRI", "δy.δx", "δs", ""]);
  aoa.push(["", "", "", "", "", "", "", "", "", "", "", "Max ±10 cm", "+7 cm", ""]);
  aoa.push(["", "", "", "", "", "", "", "", "", "", "", "Max ±15 cm", "+10 cm", ""]);
  aoa.push([]);
  aoa.push(["KONTROL MÜHENDİSİ", "", "", "YÜKLENİCİ"]);
  aoa.push(["İSİM :", "", "", "İSİM :"]);
  aoa.push(["TARİH :", "", "", "TARİH :"]);
  aoa.push(["İMZA :", "", "", "İMZA :"]);
  aoa.push([]);
  aoa.push(["POLİGON :", "", "DETAY :"]);
  aoa.push([]);
  aoa.push(["Yük : hesaplanmış olan değeri ifade eder."]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 13 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
  ];
  ws["!cols"] = [10, 10, 10, 10, 12, 13, 11, 13, 11, 15, 11, 10, 10, 10].map((wch) => ({ wch }));

  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let r = 4; r <= range.e.r; r++) {
    for (let c = 0; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.t === "n") cell.z = "0.00";
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Kontrol Ölçü");
  XLSX.writeFile(wb, "kontrol-olcu-cizelgesi.xlsx");
}
