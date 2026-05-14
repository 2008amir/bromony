import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { faviconFor, getHistory, type Bookmark, type HistoryEntry } from "@/lib/browser-store";

const SHORTCUTS = [
  { title: "Google", url: "https://www.google.com" },
  { title: "YouTube", url: "https://www.youtube.com" },
  { title: "GitHub", url: "https://github.com" },
  { title: "Wikipedia", url: "https://wikipedia.org" },
  { title: "Reddit", url: "https://www.reddit.com" },
  { title: "X", url: "https://x.com" },
  { title: "MDN", url: "https://developer.mozilla.org" },
  { title: "Lovable", url: "https://lovable.dev" },
];

export function NewTabPage({ onNavigate, bookmarks }: { onNavigate: (url: string) => void; bookmarks: Bookmark[] }) {
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<HistoryEntry[]>([]);
  useEffect(() => { setRecent(getHistory().slice(0, 6)); }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    onNavigate(q);
  };

  return (
    <div className="min-h-full w-full bg-background flex flex-col items-center pt-24 px-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-blue-400 grid place-items-center text-primary-foreground font-bold text-xl shadow-lg">B</div>
        <h1 className="text-4xl font-semibold tracking-tight">Bromony</h1>
      </div>

      <form onSubmit={submit} className="w-full max-w-2xl relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the web or type a URL"
          className="w-full h-14 pl-14 pr-5 rounded-full bg-card border border-border shadow-sm focus:shadow-md focus:border-primary outline-none text-base transition-all"
        />
      </form>

      <div className="mt-12 grid grid-cols-4 sm:grid-cols-8 gap-4 max-w-3xl w-full">
        {SHORTCUTS.map((s) => (
          <button
            key={s.url}
            onClick={() => onNavigate(s.url)}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="h-14 w-14 rounded-full bg-card border border-border grid place-items-center group-hover:border-primary group-hover:shadow-md transition-all overflow-hidden">
              <img src={faviconFor(s.url)} alt="" className="h-7 w-7" />
            </div>
            <span className="text-xs text-muted-foreground truncate w-full text-center">{s.title}</span>
          </button>
        ))}
      </div>

      {bookmarks.length > 0 && (
        <div className="mt-12 w-full max-w-3xl">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Bookmarks</h2>
          <div className="flex flex-wrap gap-2">
            {bookmarks.map((b) => (
              <button key={b.id} onClick={() => onNavigate(b.url)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border hover:border-primary hover:shadow-sm transition-all text-sm">
                <img src={b.favicon || faviconFor(b.url)} alt="" className="h-4 w-4" />
                <span className="truncate max-w-[160px]">{b.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <div className="mt-10 w-full max-w-3xl pb-10">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Recently visited</h2>
          <div className="space-y-1">
            {recent.map((h) => (
              <button key={h.id} onClick={() => onNavigate(h.url)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors text-left">
                <img src={faviconFor(h.url)} alt="" className="h-4 w-4 shrink-0" />
                <span className="text-sm truncate flex-1">{h.title || h.url}</span>
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">{h.url}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
