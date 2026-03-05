import { useState } from "react";
import { useReminders, type Reminder } from "../hooks/useReminders";

export function RemindersPanel({ token }: { token: string }) {
  const { reminders, loading, addReminder, removeReminder } = useReminders(token);
  const [showForm, setShowForm] = useState(false);
  const [minutes, setMinutes] = useState("");
  const [instructions, setInstructions] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!minutes || !instructions) return;
    
    addReminder({
      trigger_type: "date",
      minutes_from_now: parseInt(minutes),
      task_instructions: instructions,
      title: "Novo Lembrete",
      notification_channel: "web_voice"
    });
    
    setMinutes("");
    setInstructions("");
    setShowForm(false);
  };

  return (
    <div className="flex flex-col h-full p-6 text-content">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-medium tracking-[0.2em] uppercase text-content-2">Avisos</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="w-6 h-6 rounded-full bg-surface-card border border-line flex items-center justify-center hover:text-accent transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {showForm ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M12 5v14M5 12h14" />}
          </svg>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-6 p-4 rounded-xl bg-surface-card border border-line space-y-3">
          <div>
            <label className="text-xs text-content-3 mb-1 block">Daqui a (minutos)</label>
            <input 
              type="number" 
              value={minutes}
              onChange={e => setMinutes(e.target.value)}
              className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-content"
              min="1"
              required
            />
          </div>
          <div>
            <label className="text-xs text-content-3 mb-1 block">O que o Teq deve falar?</label>
            <input 
              type="text" 
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              className="w-full bg-surface border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-content"
              placeholder="Ex: Hora de beber água"
              required
            />
          </div>
          <button type="submit" className="w-full py-2 bg-content text-surface text-xs font-medium rounded-lg uppercase tracking-wider mt-2">
            Programar
          </button>
        </form>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin pr-2 space-y-4">
        {loading && reminders.length === 0 ? (
          <p className="text-xs text-content-3">Carregando...</p>
        ) : reminders.length === 0 ? (
          <p className="text-sm text-content-3 italic">Nenhum aviso programado.</p>
        ) : (
          reminders.map((r) => (
            <div key={r.id} className="p-4 rounded-xl bg-surface-card border border-line group relative">
              <button 
                onClick={() => removeReminder(r.id)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 text-content-3 hover:text-red-500 transition-all bg-surface rounded-md border border-line"
                title="Cancelar aviso"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12"></path>
                </svg>
              </button>
              
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                <span className="text-xs font-medium tracking-wider text-content-2">
                  {r.trigger_type.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-content leading-relaxed">
                {r.task_instructions}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
