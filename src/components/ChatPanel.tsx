import { useEffect, useRef, useState } from "react";
import type { Message } from "../hooks/useVoiceChat";
import { GlassCard } from "./GlassCard";

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  statusText: string;
}

export function ChatPanel({ messages, onSendMessage, statusText }: ChatPanelProps) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, statusText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text);
    setText("");
  };

  return (
    <GlassCard className="flex flex-col h-[500px] lg:h-full lg:flex-1 min-h-0 w-full lg:max-w-[360px] flex-shrink-0">
      <div className="p-4 border-b border-line flex items-center justify-between">
        <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-content-2">Terminal</h2>
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-content-3">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
          Conectado
        </span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 flex flex-col gap-4">
        {messages.length === 0 ? (
          <p className="text-content-3 text-sm text-center py-10 italic">O que vamos fazer hoje?</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <span className="text-[10px] tracking-wider uppercase text-content-4 px-1">
                {msg.role === "user" ? "Você" : "Teq"}
              </span>
              <div
                className={`px-4 py-2.5 rounded-2xl text-sm max-w-[90%] leading-relaxed ${
                  msg.role === "user"
                    ? "bg-content text-surface rounded-tr-sm"
                    : "bg-surface-card text-content border border-line rounded-tl-sm"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
        
        {statusText && statusText !== "Diga \"E aí Teq\" ou clique para falar" && (
          <div className="flex items-start gap-2 opacity-50">
             <div className="px-4 py-2.5 rounded-2xl text-sm bg-surface-card text-content border border-line rounded-tl-sm italic">
               {statusText}
             </div>
          </div>
        )}
        
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-line bg-surface/50">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Digite algo..."
            className="w-full bg-surface-up border border-line rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-content transition-all placeholder:text-content-4 shadow-sm"
          />
          <button 
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-content-3 hover:text-content transition-colors"
            disabled={!text.trim()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>
    </GlassCard>
  );
}
