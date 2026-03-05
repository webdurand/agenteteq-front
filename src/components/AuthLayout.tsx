import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-surface transition-colors duration-300">
      {/* Esquerda / Topo (Escuro) */}
      <div className="w-full md:w-1/3 min-h-[30vh] md:min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-8 text-white relative">
        <div className="flex flex-col items-center justify-center z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 border border-white/20">
            <span className="text-3xl font-light tracking-widest text-white">T</span>
          </div>
          <h1 className="text-3xl font-light tracking-[0.4em] uppercase mb-2">TEQ</h1>
          <p className="text-white/50 text-sm font-light tracking-wide text-center">
            Seu assistente<br />pessoal inteligente
          </p>
        </div>
      </div>

      {/* Direita / Base (Claro) */}
      <div className="w-full md:w-2/3 min-h-[70vh] md:min-h-screen bg-bg-up flex flex-col items-center justify-center p-6 md:p-12 relative">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
