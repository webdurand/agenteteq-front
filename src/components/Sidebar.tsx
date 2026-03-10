import { useState } from "react";
import { TasksPanel } from "./TasksPanel";
import { RemindersPanel } from "./RemindersPanel";
import { ImagesPanel } from "./ImagesPanel";
import { GlassCard } from "./GlassCard";

type Section = "tasks" | "reminders" | "images";

export function Sidebar({ token }: { token: string }) {
  const [expanded, setExpanded] = useState<Section>("tasks");

  const toggle = (section: Section) => setExpanded(section);

  return (
    <div className="flex flex-col gap-3 lg:gap-6 h-full w-full lg:max-w-[320px] min-h-0 overflow-y-auto lg:overflow-hidden scrollbar-thin pb-2 lg:pb-0">
      <GlassCard className={`transition-all duration-300 flex flex-col flex-shrink-0 lg:flex-shrink ${expanded !== "tasks" ? "h-auto" : "min-h-[200px] lg:min-h-0 lg:flex-1"}`}>
        <TasksPanel token={token} isMinimized={expanded !== "tasks"} onToggleMinimize={() => toggle("tasks")} />
      </GlassCard>
      
      <GlassCard className={`transition-all duration-300 flex flex-col flex-shrink-0 lg:flex-shrink ${expanded !== "reminders" ? "h-auto" : "min-h-[240px] lg:min-h-0 lg:flex-1"}`}>
        <RemindersPanel token={token} isMinimized={expanded !== "reminders"} onToggleMinimize={() => toggle("reminders")} />
      </GlassCard>

      <GlassCard className={`transition-all duration-300 flex flex-col flex-shrink-0 lg:flex-shrink ${expanded !== "images" ? "h-auto" : "min-h-[240px] lg:min-h-0 lg:flex-1"}`}>
        <ImagesPanel token={token} isMinimized={expanded !== "images"} onToggleMinimize={() => toggle("images")} />
      </GlassCard>
    </div>
  );
}
