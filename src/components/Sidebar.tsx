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
    <div className="flex flex-col gap-4 lg:gap-6 h-full w-full lg:max-w-[320px] min-h-0">
      <GlassCard className={`transition-all duration-300 flex flex-col ${tasksMinimized ? "h-auto" : "flex-1 min-h-0"}`}>
        <TasksPanel token={token} isMinimized={tasksMinimized} onToggleMinimize={() => setTasksMinimized(!tasksMinimized)} />
      </GlassCard>
      
      <GlassCard className={`transition-all duration-300 flex flex-col ${remindersMinimized ? "h-auto" : "flex-1 min-h-0"}`}>
        <RemindersPanel token={token} isMinimized={remindersMinimized} onToggleMinimize={() => setRemindersMinimized(!remindersMinimized)} />
      </GlassCard>

      <GlassCard className={`transition-all duration-300 flex flex-col ${imagesMinimized ? "h-auto" : "flex-1 min-h-0"}`}>
        <ImagesPanel token={token} isMinimized={imagesMinimized} onToggleMinimize={() => setImagesMinimized(!imagesMinimized)} />
      </GlassCard>
    </div>
  );
}
