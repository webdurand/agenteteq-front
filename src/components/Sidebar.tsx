import { TasksPanel } from "./TasksPanel";
import { RemindersPanel } from "./RemindersPanel";
import { GlassCard } from "./GlassCard";

export function Sidebar({ token }: { token: string }) {
  return (
    <div className="flex flex-col gap-4 lg:gap-6 h-auto lg:h-full w-full lg:max-w-[320px] flex-shrink-0">
      <GlassCard className="h-[400px] lg:h-auto lg:flex-1 min-h-0">
        <TasksPanel token={token} />
      </GlassCard>
      
      <GlassCard className="h-[400px] lg:h-auto lg:flex-1 min-h-0">
        <RemindersPanel token={token} />
      </GlassCard>
    </div>
  );
}
