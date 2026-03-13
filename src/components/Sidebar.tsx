import { useState } from "react";
import { TasksPanel } from "./TasksPanel";
import { RemindersPanel } from "./RemindersPanel";
import { ImagesPanel } from "./ImagesPanel";
import { SocialPanel } from "./SocialPanel";
import { GlassCard } from "./GlassCard";

type Section = "tasks" | "reminders" | "images" | "social";

const TABS: { key: Section; label: string; icon: React.ReactNode }[] = [
  {
    key: "tasks",
    label: "Tarefas",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
  },
  {
    key: "reminders",
    label: "Lembretes",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    key: "images",
    label: "Imagens",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
  {
    key: "social",
    label: "Referencias",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
];

export function Sidebar({ token }: { token: string }) {
  const [active, setActive] = useState<Section>("tasks");

  return (
    <div className="flex flex-col h-full w-full lg:max-w-[320px] min-h-0">
      {/* Tab bar */}
      <div className="flex border-b border-line mb-3 lg:mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-1 text-xs transition-all cursor-pointer
              ${
                active === tab.key
                  ? "text-accent border-b-2 border-accent -mb-px"
                  : "text-content-3 hover:text-content-2"
              }`}
            title={tab.label}
          >
            {tab.icon}
            <span className="hidden sm:inline truncate">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Active panel */}
      <GlassCard className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {active === "tasks" && (
          <TasksPanel token={token} isMinimized={false} onToggleMinimize={() => {}} />
        )}
        {active === "reminders" && (
          <RemindersPanel token={token} isMinimized={false} onToggleMinimize={() => {}} />
        )}
        {active === "images" && (
          <ImagesPanel token={token} isMinimized={false} onToggleMinimize={() => {}} />
        )}
        {active === "social" && (
          <SocialPanel token={token} isMinimized={false} onToggleMinimize={() => {}} />
        )}
      </GlassCard>
    </div>
  );
}
