import { createWorker, PSM } from "tesseract.js";
import { parseOcrText, type OcrPoint } from "./ocrText";

type Worker = Awaited<ReturnType<typeof createWorker>>;

let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker("eng");
      await worker.setParameters({ tessedit_char_whitelist: "0123456789.-P " });
      return worker;
    })();
  }
  return workerPromise;
}

/** Küçük kırpımları ~1800 px genişliğe büyütür (OCR ince rakamları böyle okuyor). */
async function prepare(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(3, Math.max(1, 1800 / bitmap.width));
  if (scale <= 1) return blob;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return blob;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  return png ?? blob;
}

async function run(worker: Worker, image: Blob, mode: PSM) {
  await worker.setParameters({ tessedit_pageseg_mode: mode });
  const { data } = await worker.recognize(image);
  return { text: data.text, points: parseOcrText(data.text) };
}

export type OcrResult = { points: OcrPoint[]; text: string };

/** Metinde görünen X değeri sayısı (beklenen satır sayısı için kaba ölçü). */
const xHits = (text: string) => (text.match(/\b4\d{6}\.\d{2}\b/g) ?? []).length;

/** Kırpılmış tablo görselini tarayıcıda OCR ile okur (AI/anahtar gerekmez). */
export async function readTable(image: Blob): Promise<OcrResult> {
  const worker = await getWorker();
  const prepared = await prepare(image);

  let best = await run(worker, prepared, PSM.SINGLE_BLOCK);
  const expected = Math.max(3, xHits(best.text));
  if (best.points.length < expected) {
    const alt = await run(worker, prepared, PSM.SPARSE_TEXT);
    if (alt.points.length > best.points.length) best = alt;
  }
  return best;
}
