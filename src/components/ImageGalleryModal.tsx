import { useEffect } from "react";

export interface GalleryImage {
  url: string;
  title?: string;
  subtitle?: string;
}

export function ImageGalleryModal({ images, currentIndex, onClose, onNavigate }: {
  images: GalleryImage[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (idx: number) => void;
}) {
  const current = images[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

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
          {current?.url && (
            <img src={current.url} alt={current.title} className="w-full object-contain max-h-[70vh]" />
          )}
          <div className="p-3 bg-surface-card border-t border-line flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {current?.title && <p className="text-xs font-medium text-content truncate">{current.title}</p>}
              {current?.subtitle && <p className="text-[10px] text-content-3 truncate">{current.subtitle}</p>}
            </div>
            <div className="flex items-center gap-3 ml-3 flex-shrink-0">
              <span className="text-[10px] text-content-4">{currentIndex + 1}/{images.length}</span>
              {current?.url && (
                <a
                  href={current.url}
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
