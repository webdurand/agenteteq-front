import { useState } from "react";
import { TasksPanel } from "./TasksPanel";
import { RemindersPanel } from "./RemindersPanel";
import { GlassCard } from "./GlassCard";

export function Sidebar({ token }: { token: string }) {
  const [tasksMinimized, setTasksMinimized] = useState(false);
  const [remindersMinimized, setRemindersMinimized] = useState(false);

  return (
    <div className="flex flex-col gap-4 lg:gap-6 h-auto lg:h-full w-full lg:max-w-[320px] flex-shrink-0">
      <GlassCard className={`transition-all duration-300 flex flex-col ${tasksMinimized ? "h-auto" : "h-[400px] lg:h-auto lg:flex-1 min-h-0"}`}>
        <TasksPanel token={token} isMinimized={tasksMinimized} onToggleMinimize={() => setTasksMinimized(!tasksMinimized)} />
      </GlassCard>
      
      <GlassCard className={`transition-all duration-300 flex flex-col ${remindersMinimized ? "h-auto" : "h-[400px] lg:h-auto lg:flex-1 min-h-0"}`}>
        <RemindersPanel token={token} isMinimized={remindersMinimized} onToggleMinimize={() => setRemindersMinimized(!remindersMinimized)} />
      </GlassCard>
    </div>
  );
}
