import ExcelJS from "exceljs";
import type { Row } from "./points";
import { HEADERS } from "./grid";

const THIN = { style: "thin" as const, color: { argb: "FF9AA7B4" } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const HEADER_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFEEF2F7" } };
const TOTAL_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFE8EDF3" } };

// Not: ExcelJS 9 genişliğini varsayılan sayıp yazmıyor; bu yüzden 9 yerine 10.
const WIDTHS = [10, 10, 11, 10, 12, 13, 11, 13, 11, 15, 11, 10, 10, 10];

export async function downloadXlsx(rows: Row[], totalY: number, totalX: number) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Kontrol Ölçü", {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      printTitlesRow: "4:4",
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
    views: [{ state: "frozen", ySplit: 4 }],
  });

  ws.columns = WIDTHS.map((width) => ({ width }));

  // Başlık
  ws.mergeCells(1, 1, 1, 14);
  const title = ws.getCell(1, 1);
  title.value = "POLİGON VE DETAY NOKTALARI KONTROL ÖLÇÜ VE HESAP ÇİZELGESİ";
  title.font = { bold: true, size: 13 };
  title.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 26;

  ws.mergeCells(2, 1, 2, 6);
  const sub = ws.getCell(2, 1);
  sub.value = "Tapu ve Kadastro Genel Müdürlüğü";
  sub.font = { size: 9, italic: true, color: { argb: "FF64748B" } };
  ws.getRow(2).height = 15;

  ws.getRow(3).height = 6;

  // Sütun başlıkları
  const header = ws.getRow(4);
  HEADERS.forEach((h, i) => {
    const cell = header.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 9 };
    cell.fill = HEADER_FILL;
    cell.border = BORDER;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  header.height = 30;

  // Satırlar
  rows.forEach((r, idx) => {
    const row = ws.getRow(5 + idx);
    const values: (string | number)[] = [
      r.dur,
      r.dur ? "" : r.no,
      "",
      "",
      "",
      r.kontrolY,
      r.yukY,
      r.kontrolX,
      r.yukX,
      "",
      "",
      r.farkY,
      r.farkX,
      "",
    ];
    values.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v;
      cell.border = BORDER;
      cell.font = { size: 10 };
      if (typeof v === "number") {
        cell.numFmt = "0.00";
        cell.alignment = { horizontal: "right" };
      } else {
        cell.alignment = { horizontal: "center" };
      }
    });
    row.height = 16;
  });

  // Toplam satırı
  const totalRow = ws.getRow(5 + rows.length);
  totalRow.getCell(11).value = "TOPLAM";
  totalRow.getCell(12).value = totalY;
  totalRow.getCell(13).value = totalX;
  for (let c = 1; c <= 14; c++) {
    const cell = totalRow.getCell(c);
    cell.border = BORDER;
    cell.fill = TOTAL_FILL;
    cell.font = { bold: true, size: 10 };
    if (c === 12 || c === 13) {
      cell.numFmt = "0.00";
      cell.alignment = { horizontal: "right" };
    } else {
      cell.alignment = { horizontal: "center" };
    }
  }
  totalRow.height = 17;

  // Alt bilgi blokları
  const base = 6 + rows.length;
  const label = (r: number, c: number, text: string) => {
    const cell = ws.getCell(r, c);
    cell.value = text;
    cell.font = { bold: true, size: 9 };
  };

  ws.mergeCells(base, 1, base, 3);
  label(base, 1, "ORTALAMA FARKLAR");
  label(base, 4, "δy.δx");
  ws.getCell(base, 5).value = 0.01;
  ws.getCell(base, 5).numFmt = "0.00";
  label(base, 6, "δs");
  ws.getCell(base, 7).value = 0.01;
  ws.getCell(base, 7).numFmt = "0.00";

  ws.mergeCells(base + 2, 1, base + 2, 3);
  label(base + 2, 1, "HATA SINIRI");
  label(base + 2, 4, "δy.δx");
  ws.getCell(base + 2, 5).value = "Max ±10 cm";
  ws.getCell(base + 3, 5).value = "Max ±15 cm";
  label(base + 2, 6, "δs");
  ws.getCell(base + 2, 7).value = "+7 cm";
  ws.getCell(base + 3, 7).value = "+10 cm";
  for (const r of [base + 2, base + 3]) {
    for (const c of [5, 7]) ws.getCell(r, c).font = { size: 9 };
  }

  ws.mergeCells(base + 5, 1, base + 5, 2);
  label(base + 5, 1, "KONTROL MÜHENDİSİ");
  ws.mergeCells(base + 5, 8, base + 5, 9);
  label(base + 5, 8, "YÜKLENİCİ");
  ["İSİM :", "TARİH :", "İMZA :"].forEach((t, i) => {
    ws.getCell(base + 6 + i, 1).value = t;
    ws.getCell(base + 6 + i, 8).value = t;
  });

  ws.getCell(base + 10, 1).value = "POLİGON :";
  ws.getCell(base + 10, 5).value = "DETAY :";

  ws.mergeCells(base + 12, 1, base + 12, 8);
  const note = ws.getCell(base + 12, 1);
  note.value = "Yük : hesaplanmış olan değeri ifade eder.";
  note.font = { size: 8, italic: true, color: { argb: "FF64748B" } };

  // İmza alanları için yükseklik
  for (let i = 0; i < 3; i++) ws.getRow(base + 6 + i).height = 18;

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "kontrol-olcu-cizelgesi.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}
