export type Gray = { w: number; h: number; data: Uint8Array };
export type Box = { x: number; y: number; w: number; h: number }; // 0..1 normalize

/** RGBA pikselleri gri tona çevirir. */
export function toGray(rgba: Uint8ClampedArray, w: number, h: number): Gray {
  const out = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    out[i] = (rgba[p] * 299 + rgba[p + 1] * 587 + rgba[p + 2] * 114) / 1000;
  }
  return { w, h, data: out };
}

function otsu(g: Gray): number {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < g.data.length; i++) hist[g.data[i]]++;
  const total = g.data.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let best = -1;
  let thr = 128;
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += i * hist[i];
    const between = wB * wF * (sumB / wB - (sum - sumB) / wF) ** 2;
    if (between > best) {
      best = between;
      thr = i;
    }
  }
  return thr;
}

/**
 * Yerel ortalama tabanlı eşik: ışık/gölge farkı olan fotoğraflarda da metin ve
 * çizgileri ayırır (global eşik gölgeli tarafta tüm kağıdı "mürekkep" sayıyor).
 */
function ink(g: Gray): Uint8Array {
  const { w, h, data } = g;
  const win = Math.max(8, Math.round(Math.min(w, h) / 12));
  const stride = w + 1;
  const sum = new Float64Array(stride * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += data[y * w + x];
      sum[(y + 1) * stride + x + 1] = sum[y * stride + x + 1] + rowSum;
    }
  }
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - win);
    const y1 = Math.min(h - 1, y + win);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - win);
      const x1 = Math.min(w - 1, x + win);
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const total = sum[(y1 + 1) * stride + x1 + 1] - sum[y0 * stride + x1 + 1] - sum[(y1 + 1) * stride + x0] + sum[y0 * stride + x0];
      out[y * w + x] = data[y * w + x] < (total / area) * 0.82 ? 1 : 0;
    }
  }
  return out;
}

/**
 * Sayfanın yatay mı dikey mi olduğunu tahmin eder. Metin/tablo çizgileri baskın
 * yönde daha çok kenar üretir; yan çekilmiş fotoğrafta oran tersine döner.
 */
export function orientation(g: Gray): "h" | "v" {
  const m = ink(g);
  let hx = 0;
  let vy = 0;
  for (let y = 1; y < g.h - 1; y++) {
    for (let x = 1; x < g.w - 1; x++) {
      const i = y * g.w + x;
      if (!m[i]) continue;
      if (!m[i - 1] || !m[i + 1]) hx++;
      if (!m[i - g.w] || !m[i + g.w]) vy++;
    }
  }
  return vy > hx * 1.35 ? "v" : "h";
}

/** Eğikliği derece cinsinden tahmin eder (yatay kenarların açı dağılımı). */
export function estimateSkew(g: Gray, maxDeg = 10): number {
  const bins = Math.round((maxDeg * 2) / 0.5) + 1;
  const hist = new Float64Array(bins);
  const { w, h, data } = g;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = data[i + 1] - data[i - 1];
      const gy = data[i + w] - data[i - w];
      if (Math.abs(gy) < Math.abs(gx) * 2) continue;
      const ang = (Math.atan2(gx, gy) * 180) / Math.PI;
      if (Math.abs(ang) > maxDeg) continue;
      const b = Math.round((ang + maxDeg) / 0.5);
      if (b >= 0 && b < bins) hist[b]++;
    }
  }
  let best = 0;
  let bestScore = -1;
  for (let b = 1; b < bins - 1; b++) {
    const score = hist[b - 1] + hist[b] * 2 + hist[b + 1];
    if (score > bestScore) {
      bestScore = score;
      best = b;
    }
  }
  return best * 0.5 - maxDeg;
}

/** Profilde eşiği geçen satırları, aralarındaki boşluğa göre gruplar. */
function groups(hits: number[], maxGap: number): number[][] {
  const out: number[][] = [];
  let current: number[] = [];
  for (const v of hits) {
    if (current.length === 0 || v - current[current.length - 1] <= maxGap) current.push(v);
    else {
      out.push(current);
      current = [v];
    }
  }
  if (current.length) out.push(current);
  return out;
}

/** Maskeyi yatay/dikey genişletir (hafif eğiklikte çizgileri birleştirir). */
function dilate(m: Uint8Array, w: number, h: number, rx: number, ry: number): Uint8Array {
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!m[y * w + x]) continue;
      for (let dx = -rx; dx <= rx; dx++) {
        const nx = x + dx;
        if (nx >= 0 && nx < w) tmp[y * w + nx] = 1;
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!tmp[y * w + x]) continue;
      for (let dy = -ry; dy <= ry; dy++) {
        const ny = y + dy;
        if (ny >= 0 && ny < h) out[ny * w + x] = 1;
      }
    }
  }
  return out;
}

/** Kalın koyu blokları (masa, gölge) atar; yalnızca ince çizgi satırlarını tutar. */
function thinLines(hits: number[], maxRun = 6): number[] {
  const out: number[] = [];
  let i = 0;
  while (i < hits.length) {
    let j = i;
    while (j + 1 < hits.length && hits[j + 1] - hits[j] === 1) j++;
    if (j - i + 1 <= maxRun) out.push(...hits.slice(i, j + 1));
    i = j + 1;
  }
  return out;
}

/**
 * Tablo bölgesini bulur (görselin düz olduğu varsayılır; gerekiyorsa önce
 * estimateSkew ile döndürülür). Güven düşükse null döner.
 */
export function tableBox(g: Gray): Box | null {
  const m = ink(g);
  const rowsMask = dilate(m, g.w, g.h, 1, 2);
  const colsMask = dilate(m, g.w, g.h, 2, 1);

  const rowInk = new Float64Array(g.h);
  for (let y = 0; y < g.h; y++) {
    const row = y * g.w;
    for (let x = 0; x < g.w; x++) rowInk[y] += rowsMask[row + x];
  }

  const rowHits = thinLines(
    Array.from({ length: g.h }, (_, y) => y).filter((y) => rowInk[y] / g.w > 0.55),
  );
  if (rowHits.length < 3) return null;

  const rowGroup = groups(rowHits, Math.max(4, Math.round(g.h * 0.3)))
    .filter((gr) => gr.length >= 3)
    .sort((a, b) => b.length - a.length)[0];
  if (!rowGroup) return null;
  const top = rowGroup[0];
  const bottom = rowGroup[rowGroup.length - 1];

  const colInk = new Float64Array(g.w);
  const bandHeight = bottom - top + 1;
  for (let y = top; y <= bottom; y++) {
    const row = y * g.w;
    for (let x = 0; x < g.w; x++) colInk[x] += colsMask[row + x];
  }
  const colHits: number[] = [];
  for (let x = 0; x < g.w; x++) if (colInk[x] / bandHeight > 0.85) colHits.push(x);
  if (colHits.length < 2) return null;

  const left = colHits[0];
  const right = colHits[colHits.length - 1];

  const box = { x: left / g.w, y: top / g.h, w: (right - left) / g.w, h: (bottom - top) / g.h };
  if (box.w < 0.1 || box.h < 0.03 || box.w > 0.99 || box.h > 0.95) return null;
  return box;
}
