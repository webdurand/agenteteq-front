import { useState } from "react";

interface OnboardingModalProps {
  prompt: string;
  onSubmit: (name: string) => void;
}

export function OnboardingModal({ prompt, onSubmit }: OnboardingModalProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onSubmit(name.trim());
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-navy-900/80 backdrop-blur-sm z-40">
      <div
        className="w-full max-w-sm mx-4 rounded-2xl p-8 bg-navy-800/70 border border-navy-600/30"
        style={{ boxShadow: "0 0 60px 10px rgba(30, 58, 138, 0.15)" }}
      >
        <p className="text-white text-lg mb-6 text-center">{prompt}</p>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            autoFocus
            className="
              flex-1 px-4 py-3 rounded-xl bg-navy-900/60 border border-navy-600/40
              text-white placeholder-navy-500 focus:outline-none focus:border-navy-400/60 text-sm
            "
          />
          <button
            type="submit"
            className="px-5 py-3 rounded-xl bg-navy-600 hover:bg-navy-500 text-white text-sm font-medium transition-colors"
          >
            OK
          </button>
        </form>
      </div>
    </div>
  );
}
