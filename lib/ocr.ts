import { createWorker, PSM } from "tesseract.js";
import { parseOcrText, type OcrPoint } from "./ocrText";

type Worker = Awaited<ReturnType<typeof createWorker>>;

let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker("eng");
      await worker.setParameters({
        tessedit_char_whitelist: "0123456789.-P ",
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      });
      return worker;
    })();
  }
  return workerPromise;
}

/** Küçük kırpımlarda OCR'ı 2 kat büyütür (fotoğrafta rakam kaybını azaltır). */
async function upscale(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(2, 3000 / bitmap.width);
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

/** Kırpılmış tablo görselini tarayıcıda OCR ile okur (AI/anahtar gerekmez). */
export async function readTable(image: Blob): Promise<OcrPoint[]> {
  const worker = await getWorker();
  const { data } = await worker.recognize(await upscale(image));
  return parseOcrText(data.text);
}
