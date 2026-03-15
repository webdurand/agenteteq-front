import { useEffect, useState } from "react";

export function PDFViewerModal({ url, title, carouselId, onClose, onDelete }: {
  url: string;
  title?: string;
  carouselId?: string;
  onClose: () => void;
  onDelete?: (carouselId: string) => Promise<boolean>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full max-h-[90vh] flex flex-col mx-4 rounded-2xl overflow-hidden bg-surface border border-line shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-surface-card">
          <div className="flex items-center gap-2 min-w-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="14 2 14 8 20 8" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="9" y1="13" x2="15" y2="13" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="9" y1="17" x2="13" y2="17" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-sm font-medium text-content truncate">{title || "PDF"}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-content-3 hover:text-content hover:bg-line/40 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* PDF Viewer */}
        <iframe
          src={url}
          className="flex-1 w-full border-0"
          style={{ minHeight: "70vh" }}
          title={title || "PDF"}
        />

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-line bg-surface-card">
          <div className="flex items-center gap-3">
            <a
              href={url}
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
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-content-3 hover:text-content flex items-center gap-1 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Abrir em nova aba
            </a>
          </div>
          <div className="flex items-center gap-3">
            {onDelete && carouselId && (
              confirmDelete ? (
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={deleting}
                    onClick={async () => {
                      setDeleting(true);
                      const ok = await onDelete(carouselId);
                      setDeleting(false);
                      if (ok) {
                        setConfirmDelete(false);
                        onClose();
                      }
                    }}
                    className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                  >
                    {deleting ? "Apagando..." : "Confirmar"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-[10px] text-content-3 hover:text-content transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-[10px] text-content-3 hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Apagar
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
