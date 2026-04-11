import { useEffect, useRef, useState } from "react";

interface OnboardingModalProps {
  prompt: string;
  onSubmit: (name: string) => void;
}

export function OnboardingModal({ prompt, onSubmit }: OnboardingModalProps) {
  const [name, setName] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim());
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-surface-overlay backdrop-blur-sm z-40">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Boas-vindas"
        tabIndex={-1}
        className="w-full max-w-sm mx-4 rounded-2xl p-8 bg-surface-up border border-line shadow-2xl outline-none"
      >
        <p className="text-content text-lg mb-6 text-center">{prompt}</p>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            autoFocus
            className="
              flex-1 px-4 py-3 rounded-xl bg-surface-card border border-line
              text-content placeholder-content-4 focus:outline-none focus:border-line-strong text-sm
            "
          />
          <button
            type="submit"
            className="px-5 py-3 rounded-xl bg-content text-surface text-sm font-medium hover:opacity-90 transition-opacity"
          >
            OK
          </button>
        </form>
      </div>
    </div>
  );
}
