import { useCallback, useEffect, useState } from "react";
import { wsClient } from "./useWebSocket";
import { useHistory } from "./useHistory";
import type { Message } from "./chatTypes";

export function useChat(token: string | null) {
  const {
    messages,
    setMessages,
    isLoading: historyLoading,
    isInitialLoading: historyInitialLoading,
    hasMore: historyHasMore,
    loadMore: historyLoadMore,
  } = useHistory(token);

  const [statusText, setStatusText] = useState("");
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingPrompt, setOnboardingPrompt] = useState("");
  const [imageEditingPrompt, setImageEditingPrompt] = useState<string | null>(null);

  const addMessage = useCallback((role: Message["role"], text: string) => {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role, text, timestamp: new Date() }]);
  }, [setMessages]);

  useEffect(() => {
    if (token) {
      wsClient.setToken(token);
    }
  }, [token]);

  useEffect(() => {
    const handleMessage = (msg: any) => {
      switch (msg.type) {
        case "status":
          setStatusText(msg.text ?? "");
          break;

        case "response":
          if (msg.mime_type === "none" && msg.text) {
            addMessage("agent", msg.text);
          }
          setStatusText("");
          break;

        case "onboarding":
          setNeedsOnboarding(true);
          setOnboardingPrompt(msg.text ?? "");
          setStatusText(msg.text ?? "");
          break;

        case "onboarding_complete":
          setNeedsOnboarding(false);
          addMessage("agent", msg.text ?? "Cadastro concluido.");
          setStatusText("");
          break;

        case "error":
          setStatusText(msg.message ?? "Erro interno.");
          break;

        case "carousel_generating": {
          const placeholderId = `carousel_gen_${msg.carousel_id}`;
          const numSlides = msg.num_slides ?? 0;
          const placeholderText = `__CAROUSEL_GENERATING__${JSON.stringify({ carousel_id: msg.carousel_id, num_slides: numSlides, slides_done: 0 })}`;
          setMessages((prev) => [...prev, { id: placeholderId, role: "agent", text: placeholderText, timestamp: new Date() }]);
          break;
        }

        case "slide_done": {
          const carouselId = msg.carousel_id;
          const slideIndex = msg.slide_index ?? 0;
          setMessages((prev) => {
            const genIdx = prev.findIndex((m) => m.id === `carousel_gen_${carouselId}`);
            if (genIdx < 0) return prev;
            try {
              const existing = JSON.parse(prev[genIdx].text.slice("__CAROUSEL_GENERATING__".length));
              const done = Math.max(existing.slides_done ?? 0, slideIndex + 1);
              const updated = [...prev];
              updated[genIdx] = {
                ...updated[genIdx],
                text: `__CAROUSEL_GENERATING__${JSON.stringify({ ...existing, slides_done: done })}`,
              };
              return updated;
            } catch {
              return prev;
            }
          });
          break;
        }

        case "carousel_ready": {
          const slides = msg.slides ?? [];
          const lines = slides.map((s: any, i: number) => {
            const num = s.slide_number ?? (i + 1);
            const style = s.style ? ` — ${s.style}` : "";
            return `**Slide ${num}${style}**\n${s.image_url}`;
          });
          const formatted = `🎨 Carrossel pronto! Confira os ${slides.length} slides:\n\n${lines.join("\n\n")}`;
          setMessages((prev) => {
            const genIdx = prev.findIndex((m) => m.id.startsWith("carousel_gen_"));
            if (genIdx >= 0) {
              const updated = [...prev];
              updated[genIdx] = { ...updated[genIdx], text: formatted };
              return updated;
            }
            return [...prev, { id: crypto.randomUUID(), role: "agent", text: formatted, timestamp: new Date() }];
          });
          break;
        }

        case "image_editing":
          setImageEditingPrompt(msg.prompt ?? "");
          break;

        case "image_edit_ready":
          setImageEditingPrompt(null);
          if (msg.image_url) {
            addMessage("agent", `Pronto! Aqui está a imagem editada:\n${msg.image_url}`);
          }
          break;

        case "limit_reached": {
          const payload = JSON.stringify({
            message: msg.message ?? "",
            plan_type: msg.plan_type ?? "free",
          });
          addMessage("agent", `__LIMIT_REACHED__${payload}`);
          setStatusText("");
          break;
        }

        case "action_log": {
          const channel = msg.channel || "unknown";
          if (channel === "web" || channel === "web_text") {
            break;
          }
          const text = `[${channel}] ${msg.action}: ${msg.summary}`;
          setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "system", text, timestamp: new Date() }]);
          break;
        }
      }
    };

    const cleanupMsg = wsClient.on("message", handleMessage);
    const cleanupClose = wsClient.on("close", () => {
      setStatusText("");
    });

    return () => {
      cleanupMsg();
      cleanupClose();
    };
  }, [addMessage, setMessages]);

  const sendName = useCallback((name: string) => {
    wsClient.send(JSON.stringify({ type: "name", value: name }));
  }, []);

  const sendMessageText = useCallback((text: string, images?: string[]) => {
    const messageParts = [text];
    if (images && images.length > 0) {
      images.forEach((img) => messageParts.push(img));
    }
    const displayMessage = messageParts.filter(Boolean).join("\n");

    addMessage("user", displayMessage || "[Imagem anexada]");
    setStatusText("Pensando...");

    const payload: any = { type: "user_message", text, mode: "text" };
    if (images && images.length > 0) {
      payload.images = images;
    }
    wsClient.send(JSON.stringify(payload));
  }, [addMessage]);

  return {
    messages,
    setMessages,
    statusText,
    needsOnboarding,
    onboardingPrompt,
    imageEditingPrompt,
    sendName,
    sendMessageText,
    historyLoading,
    historyInitialLoading,
    historyHasMore,
    historyLoadMore,
  };
}
