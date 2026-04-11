import { useEffect, useRef } from "react";

type WSEventCallback = (data: any) => void;

class WSClient {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private url: string;
  private listeners: Map<string, Set<WSEventCallback>> = new Map();
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20;

  constructor() {
    this.url = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000";
  }

  setToken(token: string | null) {
    if (this.token === token) return;
    this.token = token;
    if (token) {
      this.connect();
    } else {
      this.disconnect();
    }
  }

  connect() {
    if (!this.token || this.isConnecting || this.ws?.readyState === WebSocket.OPEN) return;
    
    this.isConnecting = true;
    this.ws = new WebSocket(`${this.url}/ws/voice?token=${this.token}`);

    this.ws.onopen = () => {
      console.log("[WS] Conectado (Shared)");
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      if (this.listeners.has("open")) {
        this.listeners.get("open")?.forEach((cb) => cb({}));
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const type = msg.type;
        if (type && this.listeners.has(type)) {
          this.listeners.get(type)?.forEach((cb) => cb(msg));
        }
        // Always trigger 'message' event for catch-all
        if (this.listeners.has("message")) {
          this.listeners.get("message")?.forEach((cb) => cb(msg));
        }
      } catch (e) {
        console.error("Erro ao fazer parse da mensagem WS", e);
      }
    };

    this.ws.onclose = (e) => {
      console.log(`[WS] Fechado | code=${e.code} | reconectando em 1.5s`);
      this.isConnecting = false;
      this.ws = null;
      if (this.listeners.has("close")) {
        this.listeners.get("close")?.forEach((cb) => cb({ code: e.code }));
      }
      if (this.token && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = Math.min(1500 * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
        setTimeout(() => this.connect(), delay);
      }
    };

    this.ws.onerror = (e) => {
      console.error("[WS] Erro:", e);
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(data: string | ArrayBuffer | Blob | ArrayBufferView) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      console.warn("WebSocket não está aberto para envio");
    }
  }

  on(event: string, callback: WSEventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: WSEventCallback) {
    this.listeners.get(event)?.delete(callback);
  }
}

export const wsClient = new WSClient();

export function useWSEvent(event: string, callback: WSEventCallback) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    const handler = (data: any) => cbRef.current(data);
    return wsClient.on(event, handler);
  }, [event]);
}
