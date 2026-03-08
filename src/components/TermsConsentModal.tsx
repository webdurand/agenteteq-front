import { useState } from "react";
import * as api from "../lib/api";
import { Spinner } from "./ui/Spinner";

interface TermsConsentModalProps {
  token: string;
  onAccepted: () => void;
}

const TERMS_URL = "/terms";
const PRIVACY_URL = "/privacy";

export function TermsConsentModal({ token, onAccepted }: TermsConsentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAccept = async () => {
    setLoading(true);
    setError("");
    try {
      await api.acceptTerms(token);
      onAccepted();
    } catch (err: any) {
      setError(err.message || "Erro ao aceitar os termos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <h2 className="text-xl font-light text-content">Termos atualizados</h2>
            <p className="text-sm text-content-3 leading-relaxed">
              Atualizamos nossos Termos de Serviço e Política de Privacidade. Para continuar usando o Teq, leia e aceite os documentos abaixo.
            </p>
          </div>

          <div className="space-y-3">
            <a
              href={TERMS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-xl bg-surface-card border border-line hover:bg-line transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-content/5 flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-content-2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <span className="text-sm text-content font-medium">Termos de Serviço</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-content-3 group-hover:text-content transition-colors">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>

            <a
              href={PRIVACY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-xl bg-surface-card border border-line hover:bg-line transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-content/5 flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-content-2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <span className="text-sm text-content font-medium">Política de Privacidade</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-content-3 group-hover:text-content transition-colors">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleAccept}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-content text-surface font-medium tracking-wider uppercase text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Spinner size="sm" colorClass="border-surface/30 border-t-surface" />}
            {loading ? "Aguarde..." : "Li e aceito os termos"}
          </button>
        </div>
      </div>
    </div>
  );
}
