import { useMemo, useState } from "react";
import { Search, Trash2, X } from "lucide-react";
import { faviconFor, type HistoryEntry } from "@/lib/browser-store";

export function HistoryPanel({
  history, onClose, onNavigate, onClear,
}: {
  history: HistoryEntry[];
  onClose: () => void;
  onNavigate: (url: string) => void;
  onClear: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return history.filter(h => !s || h.url.toLowerCase().includes(s) || h.title.toLowerCase().includes(s));
  }, [q, history]);

  return (
    <div className="absolute inset-0 z-30 bg-background/95 backdrop-blur-sm flex flex-col">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <h2 className="text-lg font-semibold flex-1">History</h2>
        <button onClick={onClear} className="flex items-center gap-2 text-sm text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-md">
          <Trash2 className="h-4 w-4" /> Clear all
        </button>
        <button onClick={onClose} className="p-2 hover:bg-accent rounded-md"><X className="h-4 w-4" /></button>
      </div>
      <div className="px-6 py-3 border-b border-border">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search history"
            className="w-full h-10 pl-10 pr-4 rounded-md bg-card border border-border outline-none focus:border-primary text-sm" />
        </div>
      </div>
      <div className="flex-1 overflow-auto px-6 py-4">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-12">No history</p>
        ) : (
          <div className="space-y-1 max-w-3xl mx-auto">
            {filtered.map(h => (
              <button key={h.id} onClick={() => onNavigate(h.url)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent text-left">
                <img src={faviconFor(h.url)} alt="" className="h-4 w-4 shrink-0" />
                <span className="text-sm flex-1 truncate">{h.title || h.url}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[280px]">{h.url}</span>
                <span className="text-xs text-muted-foreground">{new Date(h.visitedAt).toLocaleString()}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
