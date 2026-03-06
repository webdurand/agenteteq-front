import { useState, useEffect, useCallback, useRef } from "react";
import { useCarousels, type Carousel, type Slide } from "../hooks/useCarousels";
import { useWSEvent } from "../hooks/useWebSocket";
import { Skeleton } from "./ui/Skeleton";

const STALE_THRESHOLD_MS = 10 * 60 * 1000;

function isStaleGenerating(carousel: Carousel): boolean {
  if (carousel.status !== "generating") return false;
  const created = new Date(carousel.created_at).getTime();
  return Date.now() - created > STALE_THRESHOLD_MS;
}

function getSlideStatus(slide: Slide, carousel: Carousel): "ready" | "generating" | "failed" {
  if (slide.image_url) return "ready";
  if (carousel.status === "failed" || isStaleGenerating(carousel)) return "failed";
  return "generating";
}

function GalleryImage({ slide, carousel, onClick }: {
  slide: Slide;
  carousel: Carousel;
  onClick: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const status = getSlideStatus(slide, carousel);

  return (
    <button
      onClick={status === "ready" && !imgError ? onClick : undefined}
      className={`group relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-surface transition-all ${
        status === "ready" && !imgError ? "border-line hover:border-accent cursor-pointer" : "border-line/50 cursor-default"
      }`}
    >
      {status === "ready" && !imgError ? (
        <img
          src={slide.image_url}
          alt={slide.prompt?.slice(0, 40)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : status === "failed" || imgError ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-content-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="opacity-40">
            <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
          </svg>
          <span className="text-[10px]">Falhou</span>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-content-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin opacity-40">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span className="text-[10px] animate-pulse">Gerando...</span>
        </div>
      )}
      {status === "ready" && !imgError && (
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
          <p className="text-white text-[10px] font-medium leading-tight line-clamp-2">{slide.style}</p>
          <p className="text-white/60 text-[10px] mt-0.5 line-clamp-1">{carousel.title}</p>
        </div>
      )}
    </button>
  );
}

function SlideModal({ slides, currentIndex, onClose, onNavigate }: {
  slides: Array<{ slide: Slide; carousel: Carousel }>;
  currentIndex: number;
  onClose: () => void;
  onNavigate: (idx: number) => void;
}) {
  const { slide, carousel } = slides[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < slides.length - 1;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(currentIndex - 1);
      if (e.key === "ArrowRight" && hasNext) onNavigate(currentIndex + 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentIndex, hasPrev, hasNext, onClose, onNavigate]);

  const navBtn = "absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors z-10";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full max-h-[90vh] flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-20 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/80 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Navigation arrows */}
        {hasPrev && (
          <button onClick={() => onNavigate(currentIndex - 1)} className={`${navBtn} left-2`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
        {hasNext && (
          <button onClick={() => onNavigate(currentIndex + 1)} className={`${navBtn} right-2`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}

        {/* Image */}
        <div className="rounded-2xl overflow-hidden bg-surface border border-line shadow-2xl">
          {slide.image_url && (
            <img src={slide.image_url} alt={slide.style} className="w-full object-contain max-h-[70vh]" />
          )}
          <div className="p-3 bg-surface-card border-t border-line flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-content truncate">{slide.style}</p>
              <p className="text-[10px] text-content-3 truncate">{carousel.title}</p>
            </div>
            <div className="flex items-center gap-3 ml-3 flex-shrink-0">
              <span className="text-[10px] text-content-4">{currentIndex + 1}/{slides.length}</span>
              {slide.image_url && (
                <a
                  href={slide.image_url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-accent hover:underline flex items-center gap-1"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Baixar
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ImagesPanel({ token, isMinimized, onToggleMinimize }: {
  token: string;
  isMinimized: boolean;
  onToggleMinimize: () => void;
}) {
  const { carousels, loading, loadingMore, hasMore, loadMore, refresh } = useCarousels(token);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useWSEvent("carousel_generated", () => refresh());

  const allSlides: Array<{ slide: Slide; carousel: Carousel }> = carousels.flatMap((c) =>
    (c.slides ?? []).map((s) => ({ slide: s, carousel: c }))
  );

  const viewableSlides = allSlides.filter(
    ({ slide, carousel }) => getSlideStatus(slide, carousel) === "ready"
  );

  const genuinelyPending = carousels.filter(
    (c) => c.status === "generating" && !isStaleGenerating(c)
  );

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loadingMore || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      loadMore();
    }
  }, [loadMore, loadingMore, hasMore]);

  return (
    <div className={`flex flex-col p-4 text-content ${isMinimized ? "" : "h-full"}`}>
      <div className={`flex items-center justify-between ${isMinimized ? "" : "mb-4"}`}>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium tracking-[0.2em] uppercase text-content-2">Imagens</h2>
          {allSlides.length > 0 && (
            <span className="text-[10px] text-content-3 bg-line/40 px-1.5 py-0.5 rounded-full">{allSlides.length}</span>
          )}
          {genuinelyPending.length > 0 && (
            <span className="text-[10px] text-accent animate-pulse">gerando...</span>
          )}
        </div>
        <button
          onClick={onToggleMinimize}
          className="w-6 h-6 flex items-center justify-center text-content-3 hover:text-content transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isMinimized ? <polyline points="6 9 12 15 18 9" /> : <polyline points="18 15 12 9 6 15" />}
          </svg>
        </button>
      </div>

      {!isMinimized && (
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto scrollbar-thin">
          {loading && allSlides.length === 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {[0, 1, 2, 3].map(i => (
                <Skeleton key={i} className="aspect-[4/3] rounded-xl" delay={i * 100} />
              ))}
            </div>
          ) : allSlides.length === 0 && genuinelyPending.length === 0 ? (
            <p className="text-sm text-content-3 text-center py-8">Nenhuma imagem ainda.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {allSlides.map(({ slide, carousel }, idx) => (
                <GalleryImage
                  key={`${carousel.id}-${idx}`}
                  slide={slide}
                  carousel={carousel}
                  onClick={() => {
                    const viewIdx = viewableSlides.findIndex(
                      v => v.slide === slide && v.carousel === carousel
                    );
                    if (viewIdx >= 0) setSelectedIdx(viewIdx);
                  }}
                />
              ))}
              {loadingMore && [0, 1].map(i => (
                <Skeleton key={`more-${i}`} className="aspect-[4/3] rounded-xl" delay={i * 100} />
              ))}
            </div>
          )}
        </div>
      )}

      {selectedIdx !== null && viewableSlides.length > 0 && (
        <SlideModal
          slides={viewableSlides}
          currentIndex={selectedIdx}
          onClose={() => setSelectedIdx(null)}
          onNavigate={setSelectedIdx}
        />
      )}
    </div>
  );
}
