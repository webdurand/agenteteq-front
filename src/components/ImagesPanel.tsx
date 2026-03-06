import { useState } from "react";
import { useCarousels, type Carousel, type Slide } from "../hooks/useCarousels";
import { useWSEvent } from "../hooks/useWebSocket";

function GalleryImage({ slide, carousel, onClick }: {
  slide: Slide;
  carousel: Carousel;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-line bg-surface hover:border-accent transition-all"
    >
      {slide.image_url ? (
        <img
          src={slide.image_url}
          alt={slide.prompt?.slice(0, 40)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-content-3 text-xs animate-pulse">
          {carousel.status === "failed" ? "Falhou" : "Gerando..."}
        </div>
      )}
      {/* Overlay com info no hover */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
        <p className="text-white text-[10px] font-medium leading-tight line-clamp-2">{slide.style}</p>
        <p className="text-white/60 text-[10px] mt-0.5 line-clamp-1">{carousel.title}</p>
      </div>
    </button>
  );
}

function SlideModal({ slide, carousel, onClose }: {
  slide: Slide;
  carousel: Carousel;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-line rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b border-line flex justify-between items-center bg-surface-card">
          <div>
            <p className="text-xs font-medium text-content">{slide.style}</p>
            <p className="text-[10px] text-content-3">{carousel.title}</p>
          </div>
          <div className="flex items-center gap-2">
            {slide.image_url && (
              <a
                href={slide.image_url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-accent hover:underline flex items-center gap-1"
                title="Baixar imagem"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Baixar
              </a>
            )}
            <button onClick={onClose} className="text-content-3 hover:text-content">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
        {slide.image_url && (
          <img src={slide.image_url} alt={slide.style} className="w-full object-contain max-h-[70vh]" />
        )}
        {slide.prompt && (
          <p className="text-[11px] text-content-3 p-3 border-t border-line">{slide.prompt}</p>
        )}
      </div>
    </div>
  );
}

export function ImagesPanel({ token, isMinimized, onToggleMinimize }: {
  token: string;
  isMinimized: boolean;
  onToggleMinimize: () => void;
}) {
  const { carousels, loading, refresh } = useCarousels(token);
  const [selected, setSelected] = useState<{ slide: Slide; carousel: Carousel } | null>(null);

  useWSEvent("carousel_generated", () => refresh());

  // Flatten todos os slides de todos os carrosséis numa lista plana
  const allSlides: Array<{ slide: Slide; carousel: Carousel }> = carousels.flatMap((c) =>
    (c.slides ?? []).map((s) => ({ slide: s, carousel: c }))
  );

  // Slides sem imagem ainda (gerando)
  const pendingCarousels = carousels.filter((c) => c.status === "generating");

  return (
    <div className={`flex flex-col p-4 text-content ${isMinimized ? "" : "h-full"}`}>
      <div className={`flex items-center justify-between ${isMinimized ? "" : "mb-4"}`}>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium tracking-[0.2em] uppercase text-content-2">Imagens</h2>
          {allSlides.length > 0 && (
            <span className="text-[10px] text-content-3 bg-line/40 px-1.5 py-0.5 rounded-full">{allSlides.length}</span>
          )}
          {pendingCarousels.length > 0 && (
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
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading && allSlides.length === 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-[4/3] rounded-xl bg-line/20 animate-pulse" />
              ))}
            </div>
          ) : allSlides.length === 0 && pendingCarousels.length === 0 ? (
            <p className="text-sm text-content-3 text-center py-8">Nenhuma imagem ainda.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {allSlides.map(({ slide, carousel }, idx) => (
                <GalleryImage
                  key={`${carousel.id}-${idx}`}
                  slide={slide}
                  carousel={carousel}
                  onClick={() => setSelected({ slide, carousel })}
                />
              ))}
              {/* Placeholders para slides ainda sendo gerados */}
              {pendingCarousels.flatMap((c) =>
                (c.slides ?? []).filter((s) => !s.image_url).map((_s, i) => (
                  <div key={`pending-${c.id}-${i}`} className="aspect-[4/3] rounded-xl border border-line/50 border-dashed flex items-center justify-center text-content-3 text-xs animate-pulse">
                    Gerando...
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {selected && (
        <SlideModal
          slide={selected.slide}
          carousel={selected.carousel}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
