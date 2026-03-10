import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Message } from "../hooks/chatTypes";
import { ImageGalleryModal } from "./ImageGalleryModal";

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (text: string, images?: string[]) => void;
  statusText: string;
  className?: string;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  isInitialLoading?: boolean;
  onOpenCheckout?: () => void;
  isProcessing?: boolean;
  onStop?: () => void;
}

// Detecta linhas com URL de imagem do Cloudinary/https/dataURI e separa texto de imagens
function parseMessageContent(text: string) {
  const lines = text.split("\n");
  const parts: Array<{ type: "text" | "image"; content: string }> = [];
  let textBuf: string[] = [];

  for (const line of lines) {
    const isImageUrl = /https?:\/\/[^\s]+\.(jpg|jpeg|png|webp|gif)/i.test(line) ||
      /res\.cloudinary\.com/.test(line) ||
      line.trim().startsWith("data:image/");
      
    if (isImageUrl) {
      if (textBuf.length > 0) {
        parts.push({ type: "text", content: textBuf.join("\n").trim() });
        textBuf = [];
      }
      const url = line.trim().startsWith("data:image/") 
        ? line.trim() 
        : (line.match(/https?:\/\/\S+/)?.[0] ?? line.trim());
      parts.push({ type: "image", content: url });
    } else {
      textBuf.push(line);
    }
  }
  if (textBuf.length > 0) parts.push({ type: "text", content: textBuf.join("\n").trim() });
  return parts;
}

const CAROUSEL_GENERATING_PREFIX = "__CAROUSEL_GENERATING__";
const CAROUSEL_READY_PREFIX = "__CAROUSEL_READY__";
const CAROUSEL_FAILED_PREFIX = "__CAROUSEL_FAILED__";
const IMAGE_EDITING_PREFIX = "__IMAGE_EDITING__";
const LIMIT_REACHED_PREFIX = "__LIMIT_REACHED__";

function LimitReachedBubble({ message, planType, onOpenCheckout }: { message: string; planType: string; onOpenCheckout?: () => void }) {
  return (
    <div className="flex flex-col gap-1 items-start">
      <span className="text-[10px] tracking-wider uppercase text-content-4 px-1">Teq</span>
      <div className="max-w-[90%]">
        <div className="px-4 py-4 rounded-2xl rounded-tl-sm bg-surface-card border border-line shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 flex-shrink-0 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm text-content leading-relaxed">{message}</p>
              {planType === "trial" && onOpenCheckout && (
                <button
                  onClick={onOpenCheckout}
                  className="self-start mt-1 px-4 py-2 rounded-xl bg-accent text-surface text-xs font-medium uppercase tracking-wider hover:opacity-90 transition-opacity"
                >
                  Assinar Premium
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageEditingBubble({ prompt }: { prompt: string }) {
  return (
    <div className="flex flex-col gap-1 items-start">
      <span className="text-[10px] tracking-wider uppercase text-content-4 px-1">Teq</span>
      <div className="max-w-[90%]">
        <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-surface-card border border-line shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 flex-shrink-0">
              <svg width="32" height="32" viewBox="0 0 32 32" className="animate-spin" style={{ animationDuration: "2s" }}>
                <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2" className="text-line" />
                <path d="M16 3a13 13 0 0 1 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent" />
              </svg>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-content-2">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm text-content font-medium">Editando imagem...</span>
              {prompt && <span className="text-[11px] text-content-3 line-clamp-1">{prompt}</span>}
              <span className="text-[10px] text-content-4 animate-pulse">Geralmente leva menos de 1 minuto</span>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-line overflow-hidden">
            <div className="h-full rounded-full bg-accent/60 animate-[indeterminate_1.5s_ease-in-out_infinite]" style={{ width: "40%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CarouselGeneratingBubble({ numSlides, slidesDone = 0 }: { numSlides: number; slidesDone?: number }) {
  const allDone = slidesDone >= numSlides && numSlides > 0;
  const statusText = allDone
    ? "Finalizando..."
    : slidesDone > 0
      ? `${slidesDone} de ${numSlides} prontas`
      : "Isso pode levar de 1 a 3 minutos";

  return (
    <div className="flex flex-col gap-1 items-start">
      <span className="text-[10px] tracking-wider uppercase text-content-4 px-1">Teq</span>
      <div className="max-w-[90%]">
        <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-surface-card border border-line shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 flex-shrink-0">
              <svg width="32" height="32" viewBox="0 0 32 32" className="animate-spin" style={{ animationDuration: "2.5s" }}>
                <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2" className="text-line" />
                <path d="M16 3a13 13 0 0 1 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-accent" />
              </svg>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-content-2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm text-content font-medium">Gerando {numSlides} {numSlides === 1 ? "imagem" : "imagens"}...</span>
              <span className={`text-[11px] text-content-3 ${slidesDone === 0 ? "animate-pulse" : ""}`}>{statusText}</span>
            </div>
          </div>
          <div className="flex gap-1.5 mt-3">
            {Array.from({ length: Math.min(numSlides, 10) }).map((_, i) => {
              const done = i < slidesDone;
              return (
                <div
                  key={i}
                  className="h-1.5 flex-1 rounded-full bg-line overflow-hidden"
                >
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      done ? "w-full bg-accent" : "w-full bg-accent/20 animate-pulse"
                    }`}
                    style={done ? {} : { animationDelay: `${i * 300}ms` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function CarouselReadyBubble({ slides }: { slides: Array<{ slide_number: number; style: string; image_url: string }> }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const validSlides = slides.filter(s => s.image_url);

  return (
    <>
    <div className="flex flex-col gap-1 items-start">
      <span className="text-[10px] tracking-wider uppercase text-content-4 px-1">Teq</span>
      <div className="max-w-[90%]">
        <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-surface-card border border-line shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent flex-shrink-0">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="text-sm text-content font-medium">
              {validSlides.length === 1 ? "Imagem pronta!" : `Carrossel pronto! ${validSlides.length} imagens`}
            </span>
          </div>
          <div className={`grid gap-1.5 ${validSlides.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {validSlides.map((slide, i) => (
              <button
                key={i}
                onClick={() => setSelectedIdx(i)}
                className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-line cursor-pointer touch-pan-y"
              >
                <img
                  src={slide.image_url}
                  alt={slide.style || `Slide ${slide.slide_number}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  draggable={false}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-1.5">
                  {slide.style && <span className="text-white text-[10px] font-medium leading-tight line-clamp-1">{slide.style}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
    {selectedIdx !== null && validSlides.length > 0 && createPortal(
      <ImageGalleryModal
        images={validSlides.map(s => ({ url: s.image_url, title: s.style || `Slide ${s.slide_number}` }))}
        currentIndex={selectedIdx}
        onClose={() => setSelectedIdx(null)}
        onNavigate={setSelectedIdx}
      />,
      document.body
    )}
    </>
  );
}

function CarouselFailedBubble() {
  return (
    <div className="flex flex-col gap-1 items-start">
      <span className="text-[10px] tracking-wider uppercase text-content-4 px-1">Teq</span>
      <div className="max-w-[90%]">
        <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-surface-card border border-red-500/20 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex-shrink-0 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
              </svg>
            </div>
            <span className="text-sm text-content">Erro ao gerar o carrossel. Tente novamente.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SystemNotification({ msg }: { msg: Message }) {
  return (
    <div className="flex justify-center py-1">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-card/60 border border-line/50 max-w-[85%]">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-content-3 flex-shrink-0">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span className="text-[11px] text-content-3 leading-snug">{msg.text}</span>
      </div>
    </div>
  );
}

function MessageBubble({ msg, onOpenCheckout }: { msg: Message; onOpenCheckout?: () => void }) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  if (msg.role === "system") {
    return <SystemNotification msg={msg} />;
  }

  if (msg.text.startsWith(LIMIT_REACHED_PREFIX)) {
    try {
      const payload = JSON.parse(msg.text.slice(LIMIT_REACHED_PREFIX.length));
      return <LimitReachedBubble message={payload.message} planType={payload.plan_type} onOpenCheckout={onOpenCheckout} />;
    } catch {
      return <LimitReachedBubble message="Seu limite de gerações acabou." planType="free" onOpenCheckout={onOpenCheckout} />;
    }
  }

  if (msg.text.startsWith(CAROUSEL_GENERATING_PREFIX)) {
    try {
      const payload = JSON.parse(msg.text.slice(CAROUSEL_GENERATING_PREFIX.length));
      return <CarouselGeneratingBubble numSlides={payload.num_slides ?? 0} slidesDone={payload.slides_done ?? 0} />;
    } catch {
      return <CarouselGeneratingBubble numSlides={0} />;
    }
  }

  if (msg.text.startsWith(CAROUSEL_READY_PREFIX)) {
    try {
      const payload = JSON.parse(msg.text.slice(CAROUSEL_READY_PREFIX.length));
      return <CarouselReadyBubble slides={payload.slides ?? []} />;
    } catch {
      return null;
    }
  }

  if (msg.text.startsWith(CAROUSEL_FAILED_PREFIX)) {
    return <CarouselFailedBubble />;
  }

  if (msg.text.startsWith(IMAGE_EDITING_PREFIX)) {
    try {
      const payload = JSON.parse(msg.text.slice(IMAGE_EDITING_PREFIX.length));
      return <ImageEditingBubble prompt={payload.prompt ?? ""} />;
    } catch {
      return <ImageEditingBubble prompt="" />;
    }
  }

  const isUser = msg.role === "user";
  const parts = parseMessageContent(msg.text);
  const imageParts = parts.filter(p => p.type === "image");

  return (
    <>
    <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
      <span className="text-[10px] tracking-wider uppercase text-content-4 px-1">
        {isUser ? "Você" : "Teq"}
      </span>
      <div className={`flex flex-col gap-2 max-w-[90%] ${isUser ? "items-end" : "items-start"}`}>
        {parts.map((part, i) => {
          if (part.type === "image") {
            const globalImgIdx = imageParts.indexOf(part);
            return (
              <button 
                key={i} 
                onClick={() => setSelectedIdx(globalImgIdx)} 
                className="block group cursor-pointer text-left touch-pan-y"
              >
                <div className="relative overflow-hidden rounded-xl border border-line shadow-sm">
                  <img
                    src={part.content}
                    alt={`Slide ${i + 1}`}
                    className="w-full max-w-[260px] object-cover rounded-xl group-hover:opacity-90 transition-opacity"
                    draggable={false}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 flex items-end opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/40 to-transparent rounded-xl">
                    <span className="text-white text-[10px] p-2 tracking-wide">Visualizar ↗</span>
                  </div>
                </div>
              </button>
            );
          }
          if (!part.content) return null;
          return (
            <div
              key={i}
              className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                isUser
                  ? "bg-content text-surface rounded-tr-sm"
                  : "bg-surface-card text-content border border-line rounded-tl-sm shadow-sm"
              }`}
            >
              {part.content}
            </div>
          );
        })}
      </div>
    </div>
    {selectedIdx !== null && imageParts.length > 0 && createPortal(
      <ImageGalleryModal
        images={imageParts.map(p => ({ url: p.content, title: "Imagem do chat" }))}
        currentIndex={selectedIdx}
        onClose={() => setSelectedIdx(null)}
        onNavigate={setSelectedIdx}
      />,
      document.body
    )}
    </>
  );
}

export function ChatPanel({ 
  messages, 
  onSendMessage, 
  statusText, 
  className = "",
  onLoadMore,
  isLoadingMore,
  hasMore,
  isInitialLoading,
  onOpenCheckout,
  isProcessing = false,
  onStop
}: ChatPanelProps) {
  const [text, setText] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const lastSentRef = useRef(0);
  const SEND_COOLDOWN_MS = 1500;
  const didInitialScroll = useRef(false);

  // Preserva posição do scroll ao carregar mensagens antigas; rola para o fim em novas
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    if (el.dataset.scrollHeight) {
      const prev = parseInt(el.dataset.scrollHeight, 10);
      el.scrollTop = el.scrollHeight - prev;
      delete el.dataset.scrollHeight;
    } else if (!didInitialScroll.current && messages.length > 0) {
      // First load: scroll to bottom after content renders
      didInitialScroll.current = true;
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, statusText]);

  // Auto-resize do textarea conforme o conteúdo cresce
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [text]);

  const handleSubmit = () => {
    if (isProcessing) return;
    if (Date.now() - lastSentRef.current < SEND_COOLDOWN_MS) return;
    if (!text.trim() && pendingImages.length === 0) return;
    lastSentRef.current = Date.now();
    onSendMessage(text.trim(), pendingImages.length > 0 ? pendingImages : undefined);
    setText("");
    setPendingImages([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const processFiles = (files: File[]) => {
    const available = 10 - pendingImages.length;
    if (available <= 0) {
      alert("Máximo de 10 imagens permitidas.");
      return;
    }
    
    const filesToProcess = files.slice(0, available);
    if (files.length > available) {
      alert(`Apenas ${available} imagem(ns) adicionada(s). Limite de 10 atingido.`);
    }
    
    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        if (!result) return;
        
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.naturalWidth || img.width || 800;
          let height = img.naturalHeight || img.height || 800;
          
          const MAX_SIZE = 1600;
          if (width > MAX_SIZE || height > MAX_SIZE) {
            const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
            width = width * ratio;
            height = height * ratio;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            const webpDataUrl = canvas.toDataURL("image/webp", 0.85);
            
            setPendingImages(current => {
              if (current.length >= 10) return current;
              return [...current, webpDataUrl];
            });
          }
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    
    if (imageFiles.length > 0) {
      e.preventDefault();
      processFiles(imageFiles);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processFiles(Array.from(files));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 w-full ${className}`}>
      {/* min-h-0 é essencial para flex-1 respeitar overflow e permitir scroll */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-4 flex flex-col gap-4"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.scrollTop === 0 && hasMore && !isLoadingMore && onLoadMore) {
            el.dataset.scrollHeight = String(el.scrollHeight);
            onLoadMore();
          }
        }}
      >
        {isLoadingMore && !isInitialLoading && (
          <div className="flex justify-center py-2">
            <span className="text-[10px] uppercase tracking-widest text-content-3 animate-pulse flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Carregando mensagens anteriores
            </span>
          </div>
        )}
        
        {isInitialLoading && messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-50">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin mb-4 text-accent">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <p className="text-sm italic">Carregando histórico...</p>
          </div>
        ) : messages.length === 0 && !isLoadingMore ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-50">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <p className="text-sm italic">O que vamos fazer hoje?</p>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} msg={msg} onOpenCheckout={onOpenCheckout} />)
        )}
        
        {statusText && !statusText.includes("Teq") && (
          <div className="flex items-start gap-2 opacity-50">
             <div className="px-4 py-2.5 rounded-2xl text-sm bg-surface-card text-content border border-line rounded-tl-sm italic flex items-center gap-2 shadow-sm">
               <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
               {statusText}
             </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 p-4 border-t border-line bg-surface/30 backdrop-blur-md">
        <div className="relative max-w-4xl mx-auto w-full">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/*"
            multiple
          />

          <div className="relative flex flex-col bg-surface border border-line rounded-2xl shadow-inner overflow-hidden focus-within:border-content transition-all">
            {pendingImages.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 p-3 border-b border-line bg-surface-card max-h-40 overflow-y-auto scrollbar-thin">
                {pendingImages.map((img, i) => (
                  <div key={i} className="relative group flex-shrink-0">
                    <img src={img} alt="Preview" className="w-16 h-16 object-contain bg-black/5 rounded-xl shadow-sm border border-line" />
                    <button 
                      onClick={() => setPendingImages(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-2 -right-2 bg-content text-surface rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center gap-0">
              <div className="w-11 h-11 flex-shrink-0 flex items-center justify-center">
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-11 h-11 flex items-center justify-center text-content-4 hover:text-content transition-colors rounded-full -m-1"
                  title="Anexar arquivo/imagem"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                  </svg>
                </button>
              </div>

              <textarea
                ref={textareaRef}
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                disabled={isProcessing}
                placeholder={isProcessing ? "Aguarde a resposta..." : "Pergunte alguma coisa (Shift+Enter para nova linha)"}
                className={`flex-1 bg-transparent py-3 text-sm focus:outline-none placeholder:text-content-4 resize-none overflow-y-auto scrollbar-thin leading-relaxed min-h-[44px] ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
              />
              
              <div className="w-11 h-11 flex-shrink-0 flex items-center justify-center pr-1">
                {isProcessing && onStop ? (
                  <button 
                    type="button"
                    onClick={onStop}
                    className="w-8 h-8 flex items-center justify-center text-surface bg-content hover:bg-content/80 transition-colors rounded-full p-0"
                    title="Parar geração"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="4" y="4" width="16" height="16" rx="2" />
                    </svg>
                  </button>
                ) : text.trim() || pendingImages.length > 0 ? (
                  <button 
                    type="button"
                    onClick={handleSubmit}
                    className="w-8 h-8 flex items-center justify-center text-surface bg-content hover:bg-content/80 transition-colors rounded-full p-0"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="block shrink-0">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={toggleRecording}
                    className={`w-8 h-8 flex items-center justify-center transition-colors rounded-full ${isRecording ? "text-surface bg-red-500 animate-pulse" : "text-content-4 hover:text-content"}`}
                    title="Gravar áudio"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                      <line x1="12" y1="19" x2="12" y2="22"></line>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
