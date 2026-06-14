"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Icon } from "@/components/nook/icon";
import { spring } from "@/lib/motion";

interface GalleryProps {
  photos: string[];
  title: string;
}

const TILE_COUNT = 5;

export function Gallery({ photos, title }: GalleryProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  // The tile the lightbox was opened from, the shared-element morph runs
  // only between that tile and the stage photo. Arrowing to other photos
  // falls back to a plain crossfade.
  const [openedFrom, setOpenedFrom] = useState(0);
  const reduceMotion = useReducedMotion();
  const tiles = photos.slice(0, TILE_COUNT);

  const close = useCallback(() => setOpen(false), []);
  // Arrowing breaks the shared-element link (openedFrom = -1) so the photo
  // being replaced never morphs back to a grid tile behind the backdrop.
  const prev = useCallback(() => {
    setOpenedFrom(-1);
    setIndex((i) => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);
  const next = useCallback(() => {
    setOpenedFrom(-1);
    setIndex((i) => (i + 1) % photos.length);
  }, [photos.length]);

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
    setOpenedFrom(i);
    setOpen(true);
  }

  const morphId =
    !reduceMotion && openedFrom >= 0 && index === openedFrom && openedFrom < TILE_COUNT
      ? `gallery-photo-${openedFrom}`
      : undefined;

  // While the lightbox is open, only the origin tile keeps its layoutId, so
  // thumb-clicks/arrows can't trigger stray layout adoptions on other tiles.
  function tileLayoutId(i: number): string | undefined {
    if (reduceMotion) return undefined;
    if (open && i !== openedFrom) return undefined;
    return `gallery-photo-${i}`;
  }

  return (
    <>
      <section className="gallery">
        {tiles.map((src, i) => (
          <motion.button
            key={i}
            type="button"
            className="g-photo"
            layoutId={tileLayoutId(i)}
            style={{ backgroundImage: `url(${src})` }}
            aria-label={`Open photo ${i + 1} of ${photos.length}`}
            onClick={() => openAt(i)}
          >
            {i === 0 && (
              <span className="g-all-btn">
                <Icon name="camera" size={12} /> All {photos.length} photos
              </span>
            )}
          </motion.button>
        ))}
      </section>

      <AnimatePresence>
        {open && (
          <div
            className="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={`Photos of ${title}`}
          >
            <motion.div
              className="lightbox-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={close}
            />
            <motion.div
              className="lightbox-bar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
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
            </motion.div>
            <div className="lightbox-stage">
              <motion.button
                type="button"
                className="btn btn-icon"
                onClick={prev}
                aria-label="Previous"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ position: "absolute", left: 24, zIndex: 1, background: "rgba(255,255,255,0.1)", color: "#fff", borderColor: "transparent" }}
              >
                <Icon name="chevron-left" size={20} />
              </motion.button>
              <motion.img
                key={index}
                src={photos[index]}
                alt={`${title}, photo ${index + 1}`}
                className="lightbox-img"
                layoutId={morphId}
                initial={morphId ? undefined : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={morphId ? undefined : { opacity: 0 }}
                transition={morphId ? spring : { duration: 0.2 }}
              />
              <motion.button
                type="button"
                className="btn btn-icon"
                onClick={next}
                aria-label="Next"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ position: "absolute", right: 24, zIndex: 1, background: "rgba(255,255,255,0.1)", color: "#fff", borderColor: "transparent" }}
              >
                <Icon name="chevron-right" size={20} />
              </motion.button>
            </div>
            <motion.div
              className="lightbox-thumbs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {photos.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  className={`lightbox-thumb${i === index ? " active" : ""}`}
                  style={{ backgroundImage: `url(${src})` }}
                  aria-label={`Photo ${i + 1}`}
                  onClick={() => {
                    if (i !== openedFrom) setOpenedFrom(-1);
                    setIndex(i);
                  }}
                />
              ))}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
