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
            // Match by client-side ID first, then by text content (DB-loaded)
            let genIdx = prev.findIndex((m) => m.id === `carousel_gen_${carouselId}`);
            if (genIdx < 0) {
              genIdx = prev.findIndex((m) =>
                m.text.startsWith("__CAROUSEL_GENERATING__") && m.text.includes(carouselId)
              );
            }
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
          const carouselId = msg.carousel_id ?? "";
          const slides = msg.slides ?? [];
          const readyText = `__CAROUSEL_READY__${JSON.stringify({
            carousel_id: carouselId,
            slides: slides.map((s: any, i: number) => ({
              slide_number: s.slide_number ?? (i + 1),
              style: s.style ?? "",
              image_url: s.image_url ?? "",
            })),
          })}`;
          setMessages((prev) => {
            // Match by client-side ID first, then by text content (DB-loaded)
            let genIdx = prev.findIndex((m) => m.id === `carousel_gen_${carouselId}`);
            if (genIdx < 0 && carouselId) {
              genIdx = prev.findIndex((m) =>
                m.text.startsWith("__CAROUSEL_GENERATING__") && m.text.includes(carouselId)
              );
            }
            if (genIdx >= 0) {
              const updated = [...prev];
              updated[genIdx] = { ...updated[genIdx], text: readyText };
              return updated;
            }
            return [...prev, { id: crypto.randomUUID(), role: "agent", text: readyText, timestamp: new Date() }];
          });
          break;
        }

        case "carousel_failed": {
          const failedCarouselId = msg.carousel_id ?? "";
          const failedText = `__CAROUSEL_FAILED__${failedCarouselId}`;
          setMessages((prev) => {
            let genIdx = prev.findIndex((m) => m.id === `carousel_gen_${failedCarouselId}`);
            if (genIdx < 0 && failedCarouselId) {
              genIdx = prev.findIndex((m) =>
                m.text.startsWith("__CAROUSEL_GENERATING__") && m.text.includes(failedCarouselId)
              );
            }
            if (genIdx >= 0) {
              const updated = [...prev];
              updated[genIdx] = { ...updated[genIdx], text: failedText };
              return updated;
            }
            return [...prev, { id: crypto.randomUUID(), role: "agent", text: failedText, timestamp: new Date() }];
          });
          break;
        }

        case "image_editing": {
          const editPrompt = msg.prompt ?? "";
          setImageEditingPrompt(editPrompt);
          const editingText = `__IMAGE_EDITING__${JSON.stringify({ prompt: editPrompt })}`;
          setMessages((prev) => {
            // Avoid duplicate if already loaded from DB history
            if (prev.some((m) => m.text.startsWith("__IMAGE_EDITING__"))) return prev;
            return [...prev, { id: `image_edit_${Date.now()}`, role: "agent", text: editingText, timestamp: new Date() }];
          });
          break;
        }

        case "image_edit_ready": {
          setImageEditingPrompt(null);
          if (msg.image_url) {
            const resultText = `Pronto! Aqui está a imagem editada:\n${msg.image_url}`;
            setMessages((prev) => {
              // Find and replace __IMAGE_EDITING__ placeholder
              const editIdx = prev.findIndex((m) => m.text.startsWith("__IMAGE_EDITING__"));
              if (editIdx >= 0) {
                const updated = [...prev];
                updated[editIdx] = { ...updated[editIdx], text: resultText };
                return updated;
              }
              return [...prev, { id: crypto.randomUUID(), role: "agent", text: resultText, timestamp: new Date() }];
            });
          } else {
            // Error case: show error message
            const errorText = "\u274c Erro ao editar a imagem. Tente novamente.";
            setMessages((prev) => {
              const editIdx = prev.findIndex((m) => m.text.startsWith("__IMAGE_EDITING__"));
              if (editIdx >= 0) {
                const updated = [...prev];
                updated[editIdx] = { ...updated[editIdx], text: errorText };
                return updated;
              }
              return [...prev, { id: crypto.randomUUID(), role: "agent", text: errorText, timestamp: new Date() }];
            });
          }
          break;
        }

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
