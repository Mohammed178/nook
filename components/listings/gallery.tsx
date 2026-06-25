"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Icon } from "@/components/nook/icon";
import { useDict } from "@/lib/i18n/context";
import { format } from "@/lib/i18n/config";
import { spring } from "@/lib/motion";
import type { ListingVideoMeta } from "@/lib/types";

interface GalleryProps {
  photos: string[];
  videos?: ListingVideoMeta[];
  title: string;
}

// Photos and videos share one ordered media set so videos sit "up with the
// pictures" in the gallery and the lightbox. Photos come first (the first tile
// is the cover that spans two rows and carries the count badge); videos follow.
type MediaItem =
  | { kind: "photo"; src: string }
  | { kind: "video"; src: string; title: string };

const TILE_COUNT = 5;

export function Gallery({ photos, videos, title }: GalleryProps) {
  const dict = useDict();
  const d = dict.listingDetail;
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  // The tile the lightbox was opened from, the shared-element morph runs
  // only between that tile and the stage photo. Arrowing to other media
  // falls back to a plain crossfade.
  const [openedFrom, setOpenedFrom] = useState(0);
  const reduceMotion = useReducedMotion();

  const media: MediaItem[] = [
    ...photos.map((src): MediaItem => ({ kind: "photo", src })),
    ...(videos ?? []).map((v): MediaItem => ({
      kind: "video",
      src: v.src,
      title: v.title,
    })),
  ];
  const tiles = media.slice(0, TILE_COUNT);

  const close = useCallback(() => setOpen(false), []);
  // Arrowing breaks the shared-element link (openedFrom = -1) so the item
  // being replaced never morphs back to a grid tile behind the backdrop.
  const prev = useCallback(() => {
    setOpenedFrom(-1);
    setIndex((i) => (i - 1 + media.length) % media.length);
  }, [media.length]);
  const next = useCallback(() => {
    setOpenedFrom(-1);
    setIndex((i) => (i + 1) % media.length);
  }, [media.length]);

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

  const current = media[index];
  // Only photos morph; a video tile crossfades into the player (no shared
  // layout between a poster frame and a <video controls>).
  const morphId =
    !reduceMotion &&
    openedFrom >= 0 &&
    index === openedFrom &&
    openedFrom < TILE_COUNT &&
    current?.kind === "photo"
      ? `gallery-photo-${openedFrom}`
      : undefined;

  // While the lightbox is open, only the origin tile keeps its layoutId, so
  // thumb-clicks/arrows can't trigger stray layout adoptions on other tiles.
  function tileLayoutId(i: number): string | undefined {
    if (reduceMotion) return undefined;
    if (media[i]?.kind !== "photo") return undefined;
    if (open && i !== openedFrom) return undefined;
    return `gallery-photo-${i}`;
  }

  return (
    <>
      <section className="gallery">
        {tiles.map((m, i) =>
          m.kind === "photo" ? (
            <motion.button
              key={i}
              type="button"
              className="g-photo"
              layoutId={tileLayoutId(i)}
              style={{ backgroundImage: `url(${m.src})` }}
              aria-label={format(d.openPhoto, { i: i + 1, total: media.length })}
              onClick={() => openAt(i)}
            >
              {i === 0 && (
                <span className="g-all-btn">
                  <Icon name="camera" size={12} />{" "}
                  {format(d.allPhotos, { count: photos.length })}
                </span>
              )}
            </motion.button>
          ) : (
            <button
              key={i}
              type="button"
              className="g-photo g-video"
              aria-label={format(d.playVideo, { i: i + 1 })}
              onClick={() => openAt(i)}
            >
              {/* Poster only: metadata preload paints the first frame without
                  pulling the clip. Muted/no-controls so the tile reads as a
                  thumbnail; playback happens in the lightbox. */}
              <video
                className="g-video-poster"
                src={m.src}
                preload="metadata"
                muted
                playsInline
                tabIndex={-1}
              />
              <span className="g-play" aria-hidden="true">
                <Icon name="play" size={20} />
              </span>
            </button>
          ),
        )}
      </section>

      <AnimatePresence>
        {open && current && (
          <div
            className="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={format(d.photosOf, { title })}
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
                {index + 1} / {media.length}
              </span>
              <button
                type="button"
                className="btn btn-icon"
                onClick={close}
                aria-label={dict.common.close}
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
                aria-label={dict.common.previous}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ position: "absolute", left: 24, zIndex: 1, background: "rgba(255,255,255,0.1)", color: "#fff", borderColor: "transparent" }}
              >
                <Icon name="chevron-left" size={20} />
              </motion.button>
              {current.kind === "photo" ? (
                <motion.img
                  key={index}
                  src={current.src}
                  alt={`${title}, photo ${index + 1}`}
                  className="lightbox-img"
                  layoutId={morphId}
                  initial={morphId ? undefined : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={morphId ? undefined : { opacity: 0 }}
                  transition={morphId ? spring : { duration: 0.2 }}
                />
              ) : (
                <motion.video
                  key={index}
                  src={current.src}
                  className="lightbox-video"
                  controls
                  autoPlay
                  playsInline
                  aria-label={current.title}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              )}
              <motion.button
                type="button"
                className="btn btn-icon"
                onClick={next}
                aria-label={dict.common.next}
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
              {media.map((m, i) => (
                <button
                  key={i}
                  type="button"
                  className={`lightbox-thumb${i === index ? " active" : ""}${m.kind === "video" ? " lightbox-thumb-video" : ""}`}
                  style={m.kind === "photo" ? { backgroundImage: `url(${m.src})` } : undefined}
                  aria-label={
                    m.kind === "photo"
                      ? format(d.photoN, { i: i + 1 })
                      : format(d.playVideo, { i: i + 1 })
                  }
                  onClick={() => {
                    if (i !== openedFrom) setOpenedFrom(-1);
                    setIndex(i);
                  }}
                >
                  {m.kind === "video" && (
                    <>
                      <video
                        className="lightbox-thumb-poster"
                        src={m.src}
                        preload="metadata"
                        muted
                        playsInline
                        tabIndex={-1}
                      />
                      <span className="g-play g-play-sm" aria-hidden="true">
                        <Icon name="play" size={12} />
                      </span>
                    </>
                  )}
                </button>
              ))}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
