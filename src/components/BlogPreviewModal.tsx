import { useState } from "react";
import { useWSEvent } from "../hooks/useWebSocket";

export function BlogPreviewModal() {
  const [preview, setPreview] = useState<{title: string, content: string} | null>(null);

  useWSEvent("blog_preview", (data) => {
    setPreview(data);
  });

  if (!preview) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-up border border-line shadow-2xl rounded-3xl w-full max-w-4xl max-h-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="p-6 border-b border-line flex items-center justify-between bg-surface-card">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </span>
            <div>
              <h2 className="text-sm font-medium text-content tracking-wide">Preview do Post</h2>
              <p className="text-[10px] uppercase tracking-wider text-content-3">Rascunho gerado pelo Teq</p>
            </div>
          </div>
          
          <button 
            onClick={() => setPreview(null)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-line text-content-3 hover:text-content transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 font-mono text-sm leading-relaxed text-content bg-surface">
          <h1 className="text-2xl font-bold mb-6 pb-4 border-b border-line">{preview.title}</h1>
          <div className="whitespace-pre-wrap">{preview.content}</div>
        </div>

        <div className="p-4 border-t border-line flex justify-end gap-3 bg-surface-card">
          <button 
            onClick={() => setPreview(null)}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-content hover:bg-line transition-colors"
          >
            Fechar
          </button>
          <button 
            onClick={() => setPreview(null)}
            className="px-6 py-2.5 rounded-xl text-sm font-medium bg-content text-surface hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            Tudo Certo
          </button>
        </div>
      </div>
    </div>
  );
}
