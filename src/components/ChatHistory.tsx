import { useEffect, useRef, useState } from "react";
import type { Message } from "../hooks/useVoiceChat";

interface ChatHistoryProps {
  messages: Message[];
}

export function ChatHistory({ messages }: ChatHistoryProps) {
  const [open, setOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  return (
    <div className="fixed bottom-6 right-6 flex flex-col items-end gap-2">
      {open && (
        <div className="w-80 max-h-96 rounded-2xl overflow-y-auto scrollbar-thin bg-surface-up border border-line backdrop-blur-md flex flex-col gap-3 p-4 shadow-xl">
          {messages.length === 0 ? (
            <p className="text-content-3 text-sm text-center py-4">
              Nenhuma mensagem ainda
            </p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col gap-0.5 ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <span className="text-xs text-content-3 px-1">
                  {msg.role === "user" ? "Você" : "Teq"}
                </span>
                <div
                  className={[
                    "px-3 py-2 rounded-xl text-sm max-w-full leading-relaxed",
                    msg.role === "user"
                      ? "bg-content text-surface"
                      : "bg-surface-card text-content border border-line",
                  ].join(" ")}
                >
                  {msg.text}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="
          relative flex items-center justify-center w-11 h-11 rounded-full
          bg-surface-up border border-line
          text-content-3 hover:text-content
          transition-all duration-200 active:scale-95 shadow-lg
        "
        title={open ? "Fechar histórico" : "Ver histórico"}
      >
        {messages.length > 0 && !open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-content text-surface text-[10px] flex items-center justify-center font-medium">
            {messages.length > 9 ? "9+" : messages.length}
          </span>
        )}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          {open ? (
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </button>
    </div>
  );
}
