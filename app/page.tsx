"use client";

import { useState } from "react";
import CropUpload from "./crop";
import { buildRows, parseNumber, type Point, type Row } from "@/lib/points";
import { downloadXlsx, toGrid, toTsv } from "@/lib/xlsx";

type Draft = { no: string; y: string; x: string; suspect?: boolean };
type Result = { durulan: string; rows: Row[]; totalY: number; totalX: number };

export default function Page() {
  const [draft, setDraft] = useState<Draft[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState<"ocr" | "ai" | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  async function onImage(next: File) {
    setFile(next);
    setBusy("ocr");
    setProblems([]);
    setResult(null);
    try {
      const { readTable } = await import("@/lib/ocr");
      const points = await readTable(next);
      if (points.length === 0) throw new Error("Tabloda satır bulunamadı. Kırpımı tabloya daha yakın seçip tekrar dene.");
      setDraft(
        points.map((p) => ({ no: p.no, y: p.y.toFixed(2), x: p.x.toFixed(2), suspect: p.suspect })),
      );
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
  }

  async function onCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(toTsv(result.rows, result.totalY, result.totalX));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const grid = result ? toGrid(result.rows, result.totalY, result.totalX) : [];

  return (
    <main className="wrap">
      <h1>Kontrol Ölçü Çizelgesi</h1>
      <p className="muted">Koordinat tablosunun fotoğrafını yükle; tablo kısmını seç, İTRF satırlarını okuyup çizelgeyi üretir.</p>

      <section className="card">
        <h2>1. Fotoğraf yükle</h2>
        <CropUpload onConfirm={onImage} />
        {busy === "ocr" && <p className="muted">Tablo okunuyor (tarayıcıda, AI&apos;sız)…</p>}
        {busy === "ai" && <p className="muted">AI ile okunuyor…</p>}
      </section>

      {problems.length > 0 && (
        <section className="card warn">
          {problems.map((p, i) => (
            <div key={i}>{p}</div>
          ))}
        </section>
      )}

      {draft.length > 0 && (
        <section className="card">
          <h2>2. Noktaları kontrol et</h2>
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Nokta No</th>
                  <th>Y (İTRF)</th>
                  <th>X (İTRF)</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {draft.map((r, i) => (
                  <tr key={i} className={r.suspect ? "suspect" : undefined}>
                    <td>
                      <input value={r.no} onChange={(e) => update(i, "no", e.target.value)} />
                    </td>
                    <td>
                      <input value={r.y} onChange={(e) => update(i, "y", e.target.value)} />
                    </td>
                    <td>
                      <input value={r.x} onChange={(e) => update(i, "x", e.target.value)} />
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
            <button className="ghost" onClick={() => setDraft((d) => [...d, { no: "", y: "", x: "" }])}>
              Satır ekle
            </button>
            <button className="ghost" onClick={onAiReread} disabled={busy !== null}>
              AI ile tekrar oku
            </button>
            <button onClick={onCompute}>Hesapla</button>
          </div>
        </section>
      )}

      {result && (
        <section className="card">
          <h2>3. Çizelge</h2>
          <p className="muted">Durulan nokta: {result.durulan || "—"}</p>
          <div className="scroll">
            <table className="result">
              <thead>
                <tr>
                  {grid[0].map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.slice(1).map((row, i) => (
                  <tr key={i} className={i === grid.length - 2 ? "total" : undefined}>
                    {row.map((c, j) => (
                      <td key={j}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="actions">
            <button onClick={onCopy}>{copied ? "Kopyalandı" : "Kopyala"}</button>
            <button className="ghost" onClick={() => downloadXlsx(result.rows, result.totalY, result.totalX)}>
              Excel indir
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
