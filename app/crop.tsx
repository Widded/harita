"use client";

import { useRef, useState } from "react";
import { estimateSkew, orientation, tableBox, toGray, type Box } from "@/lib/detect";

type Rect = { x: number; y: number; w: number; h: number };

export default function CropUpload({ onConfirm }: { onConfirm: (file: File) => void }) {
  const [src, setSrc] = useState<string | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [auto, setAuto] = useState(false);
  const [rotation, setRotation] = useState(0);
  const skewRef = useRef(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  function draw(nextRotation = rotation, skew = skewRef.current) {
    const img = imgRef.current;
    const cv = canvasRef.current;
    if (!img || !cv) return;
    const swap = nextRotation % 180 !== 0;
    const bw = swap ? img.naturalHeight : img.naturalWidth;
    const bh = swap ? img.naturalWidth : img.naturalHeight;
    const angle = ((nextRotation + skew) * Math.PI) / 180;
    const w = Math.round(Math.abs(bw * Math.cos(angle)) + Math.abs(bh * Math.sin(angle)));
    const h = Math.round(Math.abs(bw * Math.sin(angle)) + Math.abs(bh * Math.cos(angle)));
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.translate(w / 2, h / 2);
    ctx.rotate(angle);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  }

  function onFile(file: File | undefined | null) {
    if (!file) return;
    setRect(null);
    setAuto(false);
    setRotation(0);
    skewRef.current = 0;
    const url = URL.createObjectURL(file);
    setSrc(url);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      draw(0);
      detect(0, 0);
    };
    img.src = url;
  }

  /** Tabloyu bulur; gerekirse fotoğrafı 90° çevirip eğikliğini düzeltir. */
  function detect(rot: number, stage: number) {
    const cv = canvasRef.current;
    if (!cv || !cv.width) return;
    const scale = Math.min(1, 640 / Math.max(cv.width, cv.height));
    const sw = Math.max(1, Math.round(cv.width * scale));
    const sh = Math.max(1, Math.round(cv.height * scale));
    const small = document.createElement("canvas");
    small.width = sw;
    small.height = sh;
    const ctx = small.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(cv, 0, 0, sw, sh);
    const gray = toGray(ctx.getImageData(0, 0, sw, sh).data, sw, sh);

    if (stage === 0 && orientation(gray) === "v") {
      const next = (rot + 90) % 360;
      setRotation(next);
      draw(next);
      detect(next, 1);
      return;
    }

    if (stage <= 1) {
      const skew = estimateSkew(gray);
      if (Math.abs(skew) >= 1) {
        skewRef.current = skew;
        draw(rot, skew);
        detect(rot, 2);
        return;
      }
    }

    const box = tableBox(gray);
    if (box) applyBox(box);
  }

  /** Normalize kutuyu ekran koordinatına çevirir (yerleşim hazır olana kadar bekler). */
  function applyBox(box: Box, tries = 0) {
    requestAnimationFrame(() => {
      const el = canvasRef.current;
      if (!el || el.clientWidth === 0) {
        if (tries < 20) applyBox(box, tries + 1);
        return;
      }
      const w = el.clientWidth;
      const h = el.clientHeight;
      const pad = 0.01;
      setRect({
        x: Math.max(0, box.x - pad) * w,
        y: Math.max(0, box.y - pad) * h,
        w: Math.min(1, box.w + pad * 2) * w,
        h: Math.min(1, box.h + pad * 2) * h,
      });
      setAuto(true);
    });
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

    const out = document.createElement("canvas");
    out.width = sw;
    out.height = sh;
    out.getContext("2d")?.drawImage(cv, sx, sy, sw, sh, 0, 0, sw, sh);
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
          <p className="muted">
            {auto
              ? "Tablo otomatik seçildi. Gerekirse kenarlardan düzelt, sonra oku."
              : "Tabloyu parmağınla veya fareyle seç. Seçmezsen tüm fotoğraf okunur."}
          </p>
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
