"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/nook/icon";

interface GalleryProps {
  photos: string[];
  title: string;
}

export function Gallery({ photos, title }: GalleryProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const tiles = photos.slice(0, 5);

  const close = useCallback(() => setOpen(false), []);
  const prev = useCallback(
    () => setIndex((i) => (i - 1 + photos.length) % photos.length),
    [photos.length],
  );
  const next = useCallback(
    () => setIndex((i) => (i + 1) % photos.length),
    [photos.length],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, prev, next]);

  function openAt(i: number) {
    setIndex(i);
    setOpen(true);
  }

  return (
    <>
      <section className="gallery">
        {tiles.map((src, i) => (
          <button
            key={i}
            type="button"
            className="g-photo"
            style={{ backgroundImage: `url(${src})` }}
            aria-label={`Open photo ${i + 1} of ${photos.length}`}
            onClick={() => openAt(i)}
          >
            {i === 0 && (
              <span className="g-all-btn">
                <Icon name="camera" size={12} /> All {photos.length} photos
              </span>
            )}
          </button>
        ))}
      </section>

      {open && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Photos of ${title}`}
        >
          <div className="lightbox-bar">
            <span>
              {index + 1} / {photos.length}
            </span>
            <button
              type="button"
              className="btn btn-icon"
              onClick={close}
              aria-label="Close"
              style={{ background: "transparent", color: "#fff", borderColor: "transparent" }}
            >
              <Icon name="x" size={18} />
            </button>
          </div>
          <div className="lightbox-stage">
            <button
              type="button"
              className="btn btn-icon"
              onClick={prev}
              aria-label="Previous"
              style={{ position: "absolute", left: 24, background: "rgba(255,255,255,0.1)", color: "#fff", borderColor: "transparent" }}
            >
              <Icon name="chevron-left" size={20} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[index]}
              alt={`${title} — photo ${index + 1}`}
              className="lightbox-img"
            />
            <button
              type="button"
              className="btn btn-icon"
              onClick={next}
              aria-label="Next"
              style={{ position: "absolute", right: 24, background: "rgba(255,255,255,0.1)", color: "#fff", borderColor: "transparent" }}
            >
              <Icon name="chevron-right" size={20} />
            </button>
          </div>
          <div className="lightbox-thumbs">
            {photos.map((src, i) => (
              <button
                key={i}
                type="button"
                className={`lightbox-thumb${i === index ? " active" : ""}`}
                style={{ backgroundImage: `url(${src})` }}
                aria-label={`Photo ${i + 1}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
