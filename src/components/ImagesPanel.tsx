import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ImageGalleryModal } from "./ImageGalleryModal";
import { PDFViewerModal } from "./PDFViewerModal";
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

type GalleryItem =
  | { kind: "slide"; slide: Slide; carousel: Carousel }
  | { kind: "pdf"; carousel: Carousel };

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
      className={`group relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-surface transition-all touch-pan-y ${
        status === "ready" && !imgError ? "border-line hover:border-accent cursor-pointer" : "border-line/50 cursor-default"
      }`}
    >
      {status === "ready" && !imgError ? (
        <img
          src={slide.image_url}
          alt={slide.prompt?.slice(0, 40)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          draggable={false}
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

function GalleryPDF({ carousel, onClick }: { carousel: Carousel; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-line hover:border-accent bg-surface transition-all cursor-pointer touch-pan-y"
    >
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-content-2">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="opacity-60 group-hover:opacity-90 transition-opacity">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="14 2 14 8 20 8" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="9" y1="13" x2="15" y2="13" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="9" y1="17" x2="13" y2="17" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="text-[10px] font-medium text-center px-2 line-clamp-2">{carousel.title}</span>
        <span className="text-[9px] text-content-3">PDF</span>
      </div>
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <span className="text-white text-xs">Visualizar</span>
      </div>
    </button>
  );
}


export function ImagesPanel({ token, isMinimized, onToggleMinimize }: {
  token: string;
  isMinimized: boolean;
  onToggleMinimize: () => void;
}) {
  const SLIDES_PER_PAGE = 10;
  const { carousels, loading, loadingMore, hasMore, loadMore, refresh, deleteCarousel } = useCarousels(token);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<Carousel | null>(null);
  const [visibleCount, setVisibleCount] = useState(SLIDES_PER_PAGE);
  const scrollRef = useRef<HTMLDivElement>(null);

  useWSEvent("carousel_generated", () => refresh());

  const allItems = useMemo<GalleryItem[]>(() => carousels.flatMap<GalleryItem>((c) => {
    if ((c.type ?? "carousel") === "pdf") {
      return [{ kind: "pdf", carousel: c }];
    }
    return (c.slides ?? []).map((s) => ({ kind: "slide", slide: s, carousel: c }));
  }), [carousels]);

  const viewableSlides = useMemo(() => allItems.filter(
    (item): item is Extract<GalleryItem, { kind: "slide" }> =>
      item.kind === "slide" && getSlideStatus(item.slide, item.carousel) === "ready"
  ), [allItems]);

  const genuinelyPending = carousels.filter(
    (c) => c.status === "generating" && !isStaleGenerating(c)
  );

  const hasMoreItems = visibleCount < allItems.length || hasMore;

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || loadingMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      if (visibleCount < allItems.length) {
        setVisibleCount(prev => prev + SLIDES_PER_PAGE);
      } else if (hasMore) {
        loadMore();
      }
    }
  }, [loadMore, loadingMore, hasMore, visibleCount, allItems.length]);

  useEffect(() => {
    if (!loadingMore && visibleCount > allItems.length && hasMore) {
      loadMore();
    }
  }, [visibleCount, allItems.length, hasMore, loadingMore, loadMore]);

  return (
    <div className={`flex flex-col p-4 text-content ${isMinimized ? "" : "h-full"}`}>
      <button onClick={onToggleMinimize} className={`flex items-center justify-between w-full text-left cursor-pointer ${isMinimized ? "" : "mb-4"}`}>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium tracking-[0.2em] uppercase text-content-2">Midia</h2>
          {allItems.length > 0 && (
            <span className="text-[10px] text-content-3 bg-line/40 px-1.5 py-0.5 rounded-full">{allItems.length}</span>
          )}
          {genuinelyPending.length > 0 && (
            <span className="text-[10px] text-accent animate-pulse">gerando...</span>
          )}
        </div>
        <span className="w-6 h-6 flex items-center justify-center text-content-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isMinimized ? <polyline points="6 9 12 15 18 9" /> : <polyline points="18 15 12 9 6 15" />}
          </svg>
        </span>
      </button>

      {!isMinimized && (
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto scrollbar-thin">
          {loading && allItems.length === 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {[0, 1, 2, 3].map(i => (
                <Skeleton key={i} className="aspect-[4/3] rounded-xl" delay={i * 100} />
              ))}
            </div>
          ) : allItems.length === 0 && genuinelyPending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-content-4">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <p className="text-sm text-content-3">Nenhuma mídia ainda.</p>
              <p className="text-xs text-content-4">Peça ao TEQ para criar um carrossel, imagem ou arte para suas redes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {allItems.slice(0, visibleCount).map((item, idx) =>
                item.kind === "pdf" ? (
                  <GalleryPDF
                    key={item.carousel.id}
                    carousel={item.carousel}
                    onClick={() => setSelectedPdf(item.carousel)}
                  />
                ) : (
                  <GalleryImage
                    key={`${item.carousel.id}-${idx}`}
                    slide={item.slide}
                    carousel={item.carousel}
                    onClick={() => {
                      const viewIdx = viewableSlides.findIndex(
                        v => v.slide === item.slide && v.carousel === item.carousel
                      );
                      if (viewIdx >= 0) setSelectedIdx(viewIdx);
                    }}
                  />
                )
              )}
              {(loadingMore || (hasMoreItems && visibleCount >= allItems.length)) && [0, 1].map(i => (
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

      {selectedPdf && selectedPdf.file_url && createPortal(
        <PDFViewerModal
          url={selectedPdf.file_url}
          title={selectedPdf.title}
          carouselId={selectedPdf.id}
          onClose={() => setSelectedPdf(null)}
          onDelete={async (id) => {
            const ok = await deleteCarousel(id);
            if (ok) setSelectedPdf(null);
            return ok;
          }}
        />,
        document.body
      )}
    </div>
  );
}
