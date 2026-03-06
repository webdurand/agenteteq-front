import { useEffect, useRef, useState } from "react";
import type { Message } from "../hooks/useVoiceChat";

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  statusText: string;
  className?: string;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMore?: boolean;
}

// Detecta linhas com URL de imagem do Cloudinary/https e separa texto de imagens
function parseMessageContent(text: string) {
  const lines = text.split("\n");
  const parts: Array<{ type: "text" | "image"; content: string }> = [];
  let textBuf: string[] = [];

  for (const line of lines) {
    const isImageUrl = /https?:\/\/[^\s]+\.(jpg|jpeg|png|webp|gif)/i.test(line) ||
      /res\.cloudinary\.com/.test(line);
    if (isImageUrl) {
      if (textBuf.length > 0) {
        parts.push({ type: "text", content: textBuf.join("\n").trim() });
        textBuf = [];
      }
      const url = line.match(/https?:\/\/\S+/)?.[0] ?? line.trim();
      parts.push({ type: "image", content: url });
    } else {
      textBuf.push(line);
    }
  }
  if (textBuf.length > 0) parts.push({ type: "text", content: textBuf.join("\n").trim() });
  return parts;
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const parts = parseMessageContent(msg.text);

  return (
    <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
      <span className="text-[10px] tracking-wider uppercase text-content-4 px-1">
        {isUser ? "Você" : "Teq"}
      </span>
      <div className={`flex flex-col gap-2 max-w-[90%] ${isUser ? "items-end" : "items-start"}`}>
        {parts.map((part, i) => {
          if (part.type === "image") {
            return (
              <a key={i} href={part.content} target="_blank" rel="noopener noreferrer" className="block group">
                <div className="relative overflow-hidden rounded-xl border border-line shadow-sm">
                  <img
                    src={part.content}
                    alt={`Slide ${i + 1}`}
                    className="w-full max-w-[260px] object-cover rounded-xl group-hover:opacity-90 transition-opacity"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 flex items-end opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/40 to-transparent rounded-xl">
                    <span className="text-white text-[10px] p-2 tracking-wide">Abrir original ↗</span>
                  </div>
                </div>
              </a>
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
  );
}

export function ChatPanel({ 
  messages, 
  onSendMessage, 
  statusText, 
  className = "",
  onLoadMore,
  isLoadingMore,
  hasMore
}: ChatPanelProps) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Preserva posição do scroll ao carregar mensagens antigas; rola para o fim em novas
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    if (el.dataset.scrollHeight) {
      const prev = parseInt(el.dataset.scrollHeight, 10);
      el.scrollTop = el.scrollHeight - prev;
      delete el.dataset.scrollHeight;
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
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          alert("Envio de imagem via paste será implementado em breve!");
        }
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert("Upload de arquivo será implementado em breve!");
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  return (
    <div className={`flex flex-col h-full w-full ${className}`}>
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
        {isLoadingMore && (
          <div className="flex justify-center py-2 opacity-50">
            <span className="text-[10px] uppercase tracking-widest animate-pulse">Carregando...</span>
          </div>
        )}
        
        {messages.length === 0 && !isLoadingMore ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-50">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <p className="text-sm italic">O que vamos fazer hoje?</p>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
        )}
        
        {statusText && statusText !== "Diga \"E aí Teq\" ou clique para falar" && statusText !== "Diga 'Teq' ou comece a falar" && (
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
        <div className="relative flex items-end gap-2 max-w-4xl mx-auto w-full">
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-content-3 hover:text-content transition-colors rounded-full hover:bg-surface-card mb-0.5"
            title="Anexar arquivo/imagem"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
            </svg>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/*"
          />

          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Digite algo... (Shift+Enter para nova linha)"
              className="w-full bg-surface border border-line rounded-2xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-content transition-all placeholder:text-content-4 shadow-inner resize-none overflow-hidden leading-relaxed"
            />
            {text.trim() ? (
              <button 
                type="button"
                onClick={handleSubmit}
                className="absolute right-2 bottom-2 w-8 h-8 flex items-center justify-center text-accent hover:text-accent/80 transition-colors bg-accent/10 rounded-full"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            ) : (
              <button 
                type="button"
                onClick={toggleRecording}
                className={`absolute right-2 bottom-2 w-8 h-8 flex items-center justify-center transition-colors rounded-full ${isRecording ? "text-red-500 bg-red-500/10 animate-pulse" : "text-content-3 hover:text-content hover:bg-surface-card"}`}
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
  );
}
