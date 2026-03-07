import { useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { ImageGalleryModal } from "./ImageGalleryModal";
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


export function ImagesPanel({ token, isMinimized, onToggleMinimize }: {
  token: string;
  isMinimized: boolean;
  onToggleMinimize: () => void;
}) {
  const { carousels, loading, loadingMore, hasMore, loadMore, refresh, deleteCarousel } = useCarousels(token);
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

      {selectedIdx !== null && viewableSlides.length > 0 && createPortal(
        <ImageGalleryModal
          images={viewableSlides.map(v => ({
            url: v.slide.image_url!,
            title: v.slide.style,
            subtitle: v.carousel.title,
            carouselId: v.carousel.id,
          }))}
          currentIndex={selectedIdx}
          onClose={() => setSelectedIdx(null)}
          onNavigate={setSelectedIdx}
          onDelete={async (carouselId) => {
            const ok = await deleteCarousel(carouselId);
            if (ok) {
              setSelectedIdx(null);
            }
            return ok;
          }}
        />,
        document.body
      )}
    </div>
  );
}
