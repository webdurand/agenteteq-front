import { useState } from "react";
import { TasksPanel } from "./TasksPanel";
import { RemindersPanel } from "./RemindersPanel";
import { ImagesPanel } from "./ImagesPanel";
import { GlassCard } from "./GlassCard";

export function Sidebar({ token }: { token: string }) {
  const [tasksMinimized, setTasksMinimized] = useState(false);
  const [remindersMinimized, setRemindersMinimized] = useState(false);
  const [imagesMinimized, setImagesMinimized] = useState(false);

  return (
    <div className="flex flex-col gap-3 lg:gap-6 h-full w-full lg:max-w-[320px] min-h-0 overflow-y-auto lg:overflow-hidden scrollbar-thin pb-2 lg:pb-0">
      <GlassCard className={`transition-all duration-300 flex flex-col flex-shrink-0 lg:flex-shrink ${tasksMinimized ? "h-auto" : "min-h-[200px] lg:min-h-0 lg:flex-1"}`}>
        <TasksPanel token={token} isMinimized={tasksMinimized} onToggleMinimize={() => setTasksMinimized(!tasksMinimized)} />
      </GlassCard>
      
      <GlassCard className={`transition-all duration-300 flex flex-col flex-shrink-0 lg:flex-shrink ${remindersMinimized ? "h-auto" : "min-h-[240px] lg:min-h-0 lg:flex-1"}`}>
        <RemindersPanel token={token} isMinimized={remindersMinimized} onToggleMinimize={() => setRemindersMinimized(!remindersMinimized)} />
      </GlassCard>

      <GlassCard className={`transition-all duration-300 flex flex-col flex-shrink-0 lg:flex-shrink ${imagesMinimized ? "h-auto" : "min-h-[240px] lg:min-h-0 lg:flex-1"}`}>
        <ImagesPanel token={token} isMinimized={imagesMinimized} onToggleMinimize={() => setImagesMinimized(!imagesMinimized)} />
      </GlassCard>
    </div>
  );
}
