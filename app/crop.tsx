"use client";

import { useRef, useState } from "react";

type Rect = { x: number; y: number; w: number; h: number };

export default function CropUpload({ onConfirm }: { onConfirm: (file: File) => void }) {
  const [src, setSrc] = useState<string | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [rotation, setRotation] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  function draw(nextRotation = rotation) {
    const img = imgRef.current;
    const cv = canvasRef.current;
    if (!img || !cv) return;
    const swap = nextRotation % 180 !== 0;
    cv.width = swap ? img.naturalHeight : img.naturalWidth;
    cv.height = swap ? img.naturalWidth : img.naturalHeight;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.translate(cv.width / 2, cv.height / 2);
    ctx.rotate((nextRotation * Math.PI) / 180);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  }

  function onFile(file: File | undefined | null) {
    if (!file) return;
    setRect(null);
    setRotation(0);
    const url = URL.createObjectURL(file);
    setSrc(url);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      draw(0);
    };
    img.src = url;
  }

  function rotate() {
    const next = (rotation + 90) % 360;
    setRotation(next);
    setRect(null);
    draw(next);
  }

  function point(e: React.PointerEvent) {
    const box = boxRef.current!.getBoundingClientRect();
    return {
      x: Math.min(Math.max(e.clientX - box.left, 0), box.width),
      y: Math.min(Math.max(e.clientY - box.top, 0), box.height),
    };
  }

  function down(e: React.PointerEvent) {
    if (!src) return;
    const p = point(e);
    start.current = p;
    setRect({ x: p.x, y: p.y, w: 0, h: 0 });
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {
      // sentetik olaylarda pointer yakalama olmayabilir
    }
  }

  function move(e: React.PointerEvent) {
    if (!start.current) return;
    const p = point(e);
    const s = start.current;
    setRect({
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      w: Math.abs(p.x - s.x),
      h: Math.abs(p.y - s.y),
    });
  }

  function up() {
    if (rect && (rect.w < 12 || rect.h < 12)) setRect(null);
    start.current = null;
  }

  function confirm() {
    const cv = canvasRef.current;
    const box = boxRef.current;
    if (!cv || !box) return;
    const scale = cv.width / box.getBoundingClientRect().width;
    const r = rect ?? { x: 0, y: 0, w: box.clientWidth, h: box.clientHeight };
    const sx = Math.round(r.x * scale);
    const sy = Math.round(r.y * scale);
    const sw = Math.max(1, Math.round(r.w * scale));
    const sh = Math.max(1, Math.round(r.h * scale));

    const pad = Math.round(Math.min(sw, sh) * 0.03);
    const px = Math.max(0, sx - pad);
    const py = Math.max(0, sy - pad);
    const pw = Math.min(cv.width - px, sw + pad * 2);
    const ph = Math.min(cv.height - py, sh + pad * 2);

    const out = document.createElement("canvas");
    out.width = pw;
    out.height = ph;
    out.getContext("2d")?.drawImage(cv, px, py, pw, ph, 0, 0, pw, ph);
    out.toBlob(
      (blob) => {
        if (!blob) return;
        onConfirm(new File([blob], "kirpim.jpg", { type: "image/jpeg" }));
        setSrc(null);
        setRect(null);
      },
      "image/jpeg",
      0.95,
    );
  }

  return (
    <div>
      {!src && (
        <label
          className="dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFile(e.dataTransfer.files?.[0]);
          }}
        >
          <input
            type="file"
            accept="image/*"
            className="visually-hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 16V4" />
            <path d="m7 9 5-5 5 5" />
            <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
          <span className="dropzone-title">Fotoğraf seç veya sürükle</span>
          <span className="dropzone-hint">Yükleme sonrası tablo kısmını seçebilirsin · JPG, PNG</span>
        </label>
      )}

      {src && (
        <>
          <p className="muted">Tabloyu parmağınla veya fareyle seç. Seçmezsen tüm fotoğraf okunur.</p>
          <div className="crop-stage">
            <div className="crop-box" ref={boxRef} onPointerDown={down} onPointerMove={move} onPointerUp={up}>
              <canvas ref={canvasRef} />
              {rect && <div className="crop-sel" style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }} />}
            </div>
          </div>
          <div className="actions">
            <button className="ghost" onClick={rotate}>
              Döndür
            </button>
            <button className="ghost" onClick={() => setRect(null)} disabled={!rect}>
              Seçimi temizle
            </button>
            <button onClick={confirm}>Bu kısmı oku</button>
          </div>
        </>
      )}
    </div>
  );
}
