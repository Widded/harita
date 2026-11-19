"use client";

import { useState } from "react";
import CropUpload from "./crop";
import { buildRows, parseNumber, type Point, type Row } from "@/lib/points";
import { downloadXlsx } from "@/lib/xlsx";
import { toGrid, toTsv } from "@/lib/grid";

type Draft = { no: string; y: string; x: string; suspect?: boolean };
type Result = { durulan: string; rows: Row[]; totalY: number; totalX: number };

const NUM_COLS = new Set([5, 6, 7, 8, 11, 12]);

/** Panoya kopyalar; API reddederse eski yönteme düşer. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export default function Page() {
  const [draft, setDraft] = useState<Draft[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState<"ocr" | "ai" | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const [selCol, setSelCol] = useState<number | null>(null);
  const [colCopied, setColCopied] = useState(false);

  async function onImage(next: File) {
    setFile(next);
    setBusy("ocr");
    setProblems([]);
    setResult(null);
    try {
      const { readTable } = await import("@/lib/ocr");
      const { points, text } = await readTable(next);
      setOcrText(text);
      if (points.length === 0) throw new Error("Tabloda satır bulunamadı. Kırpımı tabloya daha yakın seçip tekrar dene.");
      setDraft(points.map((p) => ({ no: p.no, y: p.y.toFixed(2), x: p.x.toFixed(2), suspect: p.suspect })));
      const bad = points.filter((p) => p.suspect).length;
      if (bad > 0) {
        setProblems([`${bad} satırda ondalık onarımı yapıldı (sarı satırlar). Kontrol et veya "AI ile tekrar oku".`]);
      }
    } catch (e) {
      setProblems([e instanceof Error ? e.message : "Görsel okunamadı."]);
    } finally {
      setBusy(null);
    }
  }

  async function onAiReread() {
    if (!file) return;
    setBusy("ai");
    setProblems([]);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/extract", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Görsel okunamadı.");
      const rows = (json.rows as { no: string; y: number; x: number }[]).filter(
        (r) => Number.isFinite(r.y) && Number.isFinite(r.x) && r.x > 1_000_000,
      );
      if (rows.length === 0) throw new Error("AI görselde İTRF satırı bulamadı.");
      setDraft(rows.map((r) => ({ no: r.no, y: r.y.toFixed(2), x: r.x.toFixed(2) })));
      setProblems(["AI ile okundu. Değerleri kontrol edip Hesapla."]);
    } catch (e) {
      setProblems([e instanceof Error ? e.message : "Görsel okunamadı."]);
    } finally {
      setBusy(null);
    }
  }

  function update(i: number, key: keyof Draft, value: string) {
    setDraft((d) => d.map((r, j) => (j === i ? { ...r, [key]: value, suspect: false } : r)));
  }

  function onCompute() {
    const points: Point[] = [];
    const errs: string[] = [];
    draft.forEach((r, i) => {
      const y = parseNumber(r.y);
      const x = parseNumber(r.x);
      if (!r.no.trim() || y === null || x === null) {
        errs.push(`Satır ${i + 1}: nokta no veya koordinat eksik/hatalı.`);
        return;
      }
      points.push({ no: r.no.trim(), y, x });
    });
    if (errs.length > 0) {
      setProblems(errs);
      setResult(null);
      return;
    }
    setProblems([]);
    setResult(buildRows(points));
    setSelCol(null);
  }

  async function onCopy() {
    if (!result) return;
    const ok = await copyText(toTsv(result.rows, result.totalY, result.totalX));
    if (!ok) {
      setProblems(["Panoya kopyalanamadı."]);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function copyColumn() {
    if (selCol === null || !result) return;
    const lines = grid.slice(1, -1).map((r) => r[selCol] ?? "");
    const ok = await copyText(lines.join("\n"));
    if (!ok) {
      setProblems(["Panoya kopyalanamadı."]);
      return;
    }
    setColCopied(true);
    setTimeout(() => setColCopied(false), 1500);
  }

  const grid = result ? toGrid(result.rows, result.totalY, result.totalX) : [];

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 21h18" />
              <path d="M6 21V9l6-5 6 5v12" />
              <path d="M9.5 21v-6h5v6" />
            </svg>
            <div className="brand-text">
              <strong>Kontrol Ölçü Çizelgesi</strong>
              <span>İTRF koordinat tablosu → resmi form</span>
            </div>
          </div>
          <a className="topbar-link" href="https://github.com/Widded/harita" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </header>

      <main className="wrap">
        <p className="lead">
          Koordinat tablosunun fotoğrafını yükle, tablo kısmını seç. Satırlar tarayıcında okunur, kontrol et ve çizelgeyi indir.
        </p>

        <section className="card">
          <h2 className="step-title">
            <span className="step">1</span> Fotoğraf yükle
          </h2>
          <CropUpload onConfirm={onImage} />
          <p className="status" aria-live="polite">
            {busy === "ocr" && (
              <>
                <span className="spinner" aria-hidden="true" /> Tablo okunuyor (tarayıcıda, AI&apos;sız)…
              </>
            )}
            {busy === "ai" && (
              <>
                <span className="spinner" aria-hidden="true" /> AI ile okunuyor…
              </>
            )}
          </p>
        </section>

        <div aria-live="polite">
          {problems.length > 0 && (
            <section className="card warn">
              {problems.map((p, i) => (
                <div key={i}>{p}</div>
              ))}
            </section>
          )}
        </div>

        {draft.length > 0 && (
          <section className="card">
            <div className="card-head">
              <h2 className="step-title">
                <span className="step">2</span> Noktaları kontrol et
              </h2>
              <button className="ghost" onClick={() => setDraft((d) => [...d, { no: "", y: "", x: "" }])}>
                Satır ekle
              </button>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nokta No</th>
                    <th className="num">Y (İTRF)</th>
                    <th className="num">X (İTRF)</th>
                    <th aria-label="İşlem" />
                  </tr>
                </thead>
                <tbody>
                  {draft.map((r, i) => (
                    <tr key={i} className={r.suspect ? "suspect" : undefined}>
                      <td>
                        <input aria-label={`${i + 1}. satır nokta no`} value={r.no} onChange={(e) => update(i, "no", e.target.value)} />
                      </td>
                      <td className="num">
                        <input aria-label={`${i + 1}. satır Y`} value={r.y} onChange={(e) => update(i, "y", e.target.value)} />
                      </td>
                      <td className="num">
                        <input aria-label={`${i + 1}. satır X`} value={r.x} onChange={(e) => update(i, "x", e.target.value)} />
                      </td>
                      <td>
                        <button className="ghost" onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}>
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="actions">
              <button onClick={onCompute}>Hesapla</button>
              <button className="ghost" onClick={onAiReread} disabled={busy !== null}>
                AI ile tekrar oku
              </button>
            </div>

            {ocrText && (
              <details>
                <summary>OCR metnini göster ({draft.length} satır okundu)</summary>
                <pre className="ocr-text">{ocrText}</pre>
              </details>
            )}
          </section>
        )}

        {result && (
          <section className="card">
            <div className="card-head">
              <h2 className="step-title">
                <span className="step">3</span> Çizelge
              </h2>
              <div className="actions tool">
                <button className="ghost" onClick={copyColumn} disabled={selCol === null}>
                  {colCopied ? "Sütun kopyalandı" : selCol === null ? "Sütun seç" : "Sütunu kopyala"}
                </button>
                <button onClick={onCopy}>{copied ? "Kopyalandı" : "Kopyala"}</button>
                <button className="ghost" onClick={() => void downloadXlsx(result.rows, result.totalY, result.totalX)}>
                  Excel indir
                </button>
              </div>
            </div>

            <p className="muted">Durulan nokta: {result.durulan || "—"}</p>

            <div className="table-wrap">
              <table className="result">
                <thead>
                  <tr>
                    {grid[0].map((h, i) => (
                      <th key={i} scope="col" className={`${NUM_COLS.has(i) ? "num" : ""}${selCol === i ? " selected" : ""}`}>
                        <button
                          type="button"
                          className="th-btn"
                          aria-pressed={selCol === i}
                          title="Sütunu seç"
                          onClick={() => {
                            setSelCol(selCol === i ? null : i);
                            setColCopied(false);
                          }}
                        >
                          {h}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.slice(1).map((row, i) => (
                    <tr key={i} className={i === grid.length - 2 ? "total" : undefined}>
                      {row.map((c, j) => (
                        <td key={j} className={`${NUM_COLS.has(j) ? "num" : ""}${selCol === j ? " selected" : ""}`}>
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
