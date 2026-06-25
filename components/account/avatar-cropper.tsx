"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/nook/icon";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

// Dependency-free square crop modal. The user pans (drag) and zooms (slider) a
// chosen image inside a fixed square viewport; on apply we redraw the visible
// region to an OUTPUT×OUTPUT canvas and hand back a Blob. All work is local to
// the browser — only the cropped bytes are ever uploaded. A circular guide hints
// the avatar's displayed shape; the exported image is the full square so it also
// works if an avatar is ever shown un-rounded.

const VIEWPORT = 320; // displayed crop square (CSS px)
const OUTPUT = 512; // exported square (px)
const MAX_ZOOM = 4;

interface AvatarCropperProps {
  file: File;
  dict: Dictionary;
  onCancel: () => void;
  onConfirm: (blob: Blob, type: string) => void;
}

interface Point {
  x: number;
  y: number;
}

function clampOffset(o: Point, scaledW: number, scaledH: number): Point {
  // The image must always cover the viewport: its top-left is in [V - size, 0].
  return {
    x: Math.min(0, Math.max(VIEWPORT - scaledW, o.x)),
    y: Math.min(0, Math.max(VIEWPORT - scaledH, o.y)),
  };
}

export function AvatarCropper({
  file,
  dict,
  onCancel,
  onConfirm,
}: AvatarCropperProps) {
  const a = dict.account;
  const c = dict.common;
  // The cropper is mounted with one fixed file (the parent remounts it per pick),
  // so the object URL is created once and only revoked on unmount.
  const [url] = useState(() => URL.createObjectURL(file));
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const dragRef = useRef<Point | null>(null);

  // Load the image to read natural dimensions, then centre it. All state is set
  // from the (async) onload callback, never synchronously in the effect body.
  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      const bs = VIEWPORT / Math.min(image.naturalWidth, image.naturalHeight);
      const w = image.naturalWidth * bs;
      const h = image.naturalHeight * bs;
      setImg(image);
      setZoom(1);
      setOffset({ x: (VIEWPORT - w) / 2, y: (VIEWPORT - h) / 2 });
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  // Cover scale: the smaller natural side fills the viewport at zoom 1.
  const baseScale = img
    ? VIEWPORT / Math.min(img.naturalWidth, img.naturalHeight)
    : 1;
  const scale = baseScale * zoom;

  // Zoom about the viewport centre so the focal point stays put, then re-clamp.
  function onZoom(next: number) {
    if (!img) return;
    const prevScale = baseScale * zoom;
    const nextScale = baseScale * next;
    const cx = VIEWPORT / 2;
    const cy = VIEWPORT / 2;
    const ix = (cx - offset.x) / prevScale;
    const iy = (cy - offset.y) / prevScale;
    const raw = { x: cx - ix * nextScale, y: cy - iy * nextScale };
    setZoom(next);
    setOffset(
      clampOffset(
        raw,
        img.naturalWidth * nextScale,
        img.naturalHeight * nextScale,
      ),
    );
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current || !img) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    dragRef.current = { x: e.clientX, y: e.clientY };
    setOffset((o) =>
      clampOffset(
        { x: o.x + dx, y: o.y + dy },
        img.naturalWidth * scale,
        img.naturalHeight * scale,
      ),
    );
  }
  function onPointerUp() {
    dragRef.current = null;
  }

  const apply = useCallback(() => {
    if (!img) return;
    setBusy(true);
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setBusy(false);
      return;
    }
    // Source rect (natural px) currently framed by the viewport.
    const sx = -offset.x / scale;
    const sy = -offset.y / scale;
    const sSize = VIEWPORT / scale;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT, OUTPUT);
    // Prefer webp; fall back to png if the browser can't encode webp.
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onConfirm(blob, "image/webp");
          return;
        }
        canvas.toBlob(
          (b2) => {
            if (b2) onConfirm(b2, "image/png");
            else setBusy(false);
          },
          "image/png",
        );
      },
      "image/webp",
      0.9,
    );
  }, [img, offset, scale, onConfirm]);

  // Esc cancels; lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onCancel]);

  return (
    <div
      className="cropper"
      role="dialog"
      aria-modal="true"
      aria-label={a.avatarCropTitle}
    >
      <div className="cropper-backdrop" onClick={onCancel} />
      <div className="cropper-panel">
        <h2 className="cropper-title">{a.avatarCropTitle}</h2>
        <div
          className="cropper-stage"
          style={{ width: VIEWPORT, height: VIEWPORT }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="cropper-img"
              src={url}
              alt=""
              draggable={false}
              style={{
                width: img ? img.naturalWidth * scale : undefined,
                height: img ? img.naturalHeight * scale : undefined,
                transform: `translate(${offset.x}px, ${offset.y}px)`,
              }}
            />
          ) : null}
          <div className="cropper-mask" aria-hidden="true" />
        </div>

        <label className="cropper-zoom">
          <Icon name="search" size={14} aria-hidden="true" />
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => onZoom(Number(e.target.value))}
            aria-label={a.avatarZoom}
            disabled={!img || busy}
          />
        </label>

        <p className="cropper-help">{a.avatarCropHelp}</p>

        <div className="cropper-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onCancel}
            disabled={busy}
          >
            {c.cancel}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={apply}
            disabled={busy || !img}
          >
            {busy ? c.saving : c.apply}
          </button>
        </div>
      </div>
    </div>
  );
}
