import React from "react";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassCard({ children, className = "" }: GlassCardProps) {
  return (
    <div className={`bg-glass backdrop-blur-xl border border-glass-border rounded-3xl shadow-lg overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
