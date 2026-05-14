import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, RotateCw, Home, Plus, X, Star, StarOff,
  Lock, Globe, AlertTriangle, History as HistoryIcon, MoreVertical, Moon, Sun, Shield, Search
} from "lucide-react";
import { NewTabPage } from "./NewTabPage";
import { HistoryPanel } from "./HistoryPanel";
import {
  faviconFor, resolveInput,
  getBookmarks, saveBookmarks, getHistory, saveHistory, clearHistory,
  type Bookmark, type HistoryEntry,
} from "@/lib/browser-store";

type Tab = {
  id: string;
  title: string;
  history: string[];
  index: number;
  loading: boolean;
  key: number;
};

const NEW_TAB = "newtab";
const uid = () => Math.random().toString(36).slice(2, 10);

const makeTab = (): Tab => ({ id: uid(), title: "New Tab", history: [NEW_TAB], index: 0, loading: false, key: 0 });

export function Browser() {
  const [tabs, setTabs] = useState<Tab[]>([makeTab()]);
  const [activeId, setActiveId] = useState(tabs[0].id);
  const [addressValue, setAddressValue] = useState("");
  const [addressFocused, setAddressFocused] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [dark, setDark] = useState(false);
  const addressRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBookmarks(getBookmarks());
    setHistory(getHistory());
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(prefersDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const active = tabs.find(t => t.id === activeId)!;
  const currentUrl = active.history[active.index];
  const isNewTab = currentUrl === NEW_TAB;

  useEffect(() => {
    if (!addressFocused) setAddressValue(isNewTab ? "" : currentUrl);
  }, [activeId, currentUrl, isNewTab, addressFocused]);

  const updateTab = (id: string, patch: Partial<Tab>) =>
    setTabs(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t));

  const recordHistory = (url: string, title: string) => {
    if (url === NEW_TAB) return;
    setHistory(prev => {
      const next: HistoryEntry[] = [{ id: uid(), url, title, visitedAt: Date.now() }, ...prev].slice(0, 500);
      saveHistory(next);
      return next;
    });
  };

  const navigate = (raw: string, tabId = activeId) => {
    const url = resolveInput(raw);
    if (!url) return;
    setTabs(ts => ts.map(t => {
      if (t.id !== tabId) return t;
      const newHistory = [...t.history.slice(0, t.index + 1), url];
      return { ...t, history: newHistory, index: newHistory.length - 1, loading: true, key: t.key + 1, title: hostnameOf(url) };
    }));
    recordHistory(url, hostnameOf(url));
  };

  const back = () => {
    if (active.index > 0) updateTab(active.id, { index: active.index - 1, key: active.key + 1, loading: active.history[active.index - 1] !== NEW_TAB });
  };
  const forward = () => {
    if (active.index < active.history.length - 1) updateTab(active.id, { index: active.index + 1, key: active.key + 1, loading: active.history[active.index + 1] !== NEW_TAB });
  };
  const refresh = () => updateTab(active.id, { key: active.key + 1, loading: !isNewTab });
  const goHome = () => {
    setTabs(ts => ts.map(t => t.id === activeId
      ? { ...t, history: [...t.history.slice(0, t.index + 1), NEW_TAB], index: t.index + 1, loading: false, title: "New Tab", key: t.key + 1 }
      : t));
  };

  const addTab = () => {
    const t = makeTab();
    setTabs(ts => [...ts, t]);
    setActiveId(t.id);
    setTimeout(() => addressRef.current?.focus(), 0);
  };
  const closeTab = (id: string) => {
    setTabs(ts => {
      const idx = ts.findIndex(t => t.id === id);
      const next = ts.filter(t => t.id !== id);
      if (next.length === 0) {
        const fresh = makeTab();
        setActiveId(fresh.id);
        return [fresh];
      }
      if (id === activeId) setActiveId(next[Math.max(0, idx - 1)].id);
      return next;
    });
  };

  const onAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressValue.trim()) return;
    navigate(addressValue);
    addressRef.current?.blur();
  };

  const isHttps = !isNewTab && /^https:\/\//i.test(currentUrl);
  const isHttp = !isNewTab && /^http:\/\//i.test(currentUrl);

  const currentBookmark = useMemo(
    () => !isNewTab ? bookmarks.find(b => b.url === currentUrl) : undefined,
    [bookmarks, currentUrl, isNewTab]
  );

  const toggleBookmark = () => {
    if (isNewTab) return;
    let next: Bookmark[];
    if (currentBookmark) next = bookmarks.filter(b => b.id !== currentBookmark.id);
    else next = [...bookmarks, { id: uid(), url: currentUrl, title: active.title || hostnameOf(currentUrl), favicon: faviconFor(currentUrl) }];
    setBookmarks(next);
    saveBookmarks(next);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-chrome text-chrome-foreground overflow-hidden">
      <div className="flex items-end gap-1 px-2 pt-2 bg-chrome">
        <div className="flex items-end gap-1 flex-1 overflow-x-auto scrollbar-thin">
          {tabs.map(t => {
            const url = t.history[t.index];
            const isActive = t.id === activeId;
            return (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={`group relative flex items-center gap-2 px-3 h-9 min-w-[140px] max-w-[220px] rounded-t-lg text-sm transition-colors ${
                  isActive ? "bg-tab-active text-foreground" : "bg-tab-inactive text-muted-foreground hover:bg-tab-inactive/70"
                }`}
              >
                {url !== NEW_TAB ? (
                  <img src={faviconFor(url)} alt="" className="h-4 w-4 shrink-0" />
                ) : (
                  <Globe className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate flex-1 text-left">{t.loading ? "Loading…" : (t.title || "New Tab")}</span>
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}
                  className="opacity-0 group-hover:opacity-100 hover:bg-accent rounded p-0.5 transition-opacity"
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              </button>
            );
          })}
          <button onClick={addTab} className="h-9 w-9 grid place-items-center rounded-md hover:bg-accent text-muted-foreground shrink-0" aria-label="New tab">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 bg-chrome border-b border-border">
        <IconBtn onClick={back} disabled={active.index === 0} label="Back"><ArrowLeft className="h-4 w-4" /></IconBtn>
        <IconBtn onClick={forward} disabled={active.index >= active.history.length - 1} label="Forward"><ArrowRight className="h-4 w-4" /></IconBtn>
        <IconBtn onClick={refresh} label="Reload"><RotateCw className={`h-4 w-4 ${active.loading ? "animate-spin" : ""}`} /></IconBtn>
        <IconBtn onClick={goHome} label="Home"><Home className="h-4 w-4" /></IconBtn>

        <form onSubmit={onAddressSubmit} className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            {isHttps ? <Lock className="h-3.5 w-3.5 text-emerald-600" />
              : isHttp ? <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              : <Search className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
          <input
            ref={addressRef}
            value={addressValue}
            onChange={(e) => setAddressValue(e.target.value)}
            onFocus={(e) => { setAddressFocused(true); e.currentTarget.select(); }}
            onBlur={() => { setAddressFocused(false); setAddressValue(isNewTab ? "" : currentUrl); }}
            placeholder="Search Google or type a URL"
            className="w-full h-9 pl-9 pr-10 rounded-full bg-background border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all"
          />
          <button type="button" onClick={toggleBookmark} disabled={isNewTab}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent disabled:opacity-30" aria-label="Bookmark">
            {currentBookmark ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> : <StarOff className="h-4 w-4 text-muted-foreground" />}
          </button>
        </form>

        <IconBtn onClick={() => setShowHistory(true)} label="History"><HistoryIcon className="h-4 w-4" /></IconBtn>
        <IconBtn onClick={() => setDark(d => !d)} label="Toggle theme">{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</IconBtn>
        <div className="relative">
          <IconBtn onClick={() => setShowMenu(s => !s)} label="Menu"><MoreVertical className="h-4 w-4" /></IconBtn>
          {showMenu && (
            <div className="absolute right-0 top-10 z-40 w-56 rounded-lg bg-popover border border-border shadow-lg py-1 text-sm">
              <MenuItem onClick={() => { addTab(); setShowMenu(false); }}>New tab</MenuItem>
              <MenuItem onClick={() => { setShowHistory(true); setShowMenu(false); }}>History</MenuItem>
              <MenuItem onClick={() => { clearHistory(); setHistory([]); setShowMenu(false); }}>Clear history</MenuItem>
              <div className="h-px bg-border my-1" />
              <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2"><Shield className="h-3 w-3" /> Bromony Browser v1.0</div>
            </div>
          )}
        </div>
      </div>

      {bookmarks.length > 0 && (
        <div className="flex items-center gap-1 px-3 py-1.5 bg-chrome border-b border-border overflow-x-auto">
          {bookmarks.map(b => (
            <button key={b.id} onClick={() => navigate(b.url)}
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-accent text-xs shrink-0">
              <img src={b.favicon || faviconFor(b.url)} alt="" className="h-3.5 w-3.5" />
              <span className="truncate max-w-[140px]">{b.title}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 relative bg-background overflow-hidden">
        {active.loading && !isNewTab && (
          <div className="absolute top-0 left-0 right-0 h-0.5 z-20 overflow-hidden">
            <div className="h-full bg-primary animate-[loading_1.2s_ease-in-out_infinite]" style={{ width: "40%" }} />
          </div>
        )}

        {tabs.map(t => {
          const url = t.history[t.index];
          const visible = t.id === activeId;
          if (url === NEW_TAB) {
            return visible ? (
              <div key={t.id} className="absolute inset-0 overflow-auto">
                <NewTabPage onNavigate={(u) => navigate(u, t.id)} bookmarks={bookmarks} />
              </div>
            ) : null;
          }
          return (
            <iframe
              key={`${t.id}-${t.key}`}
              src={url}
              title={t.title}
              onLoad={() => updateTab(t.id, { loading: false })}
              className={`absolute inset-0 w-full h-full bg-white ${visible ? "block" : "hidden"}`}
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
              referrerPolicy="no-referrer-when-downgrade"
            />
          );
        })}

        {!isNewTab && (
          <FrameBlockedHint url={currentUrl} />
        )}

        {showHistory && (
          <HistoryPanel
            history={history}
            onClose={() => setShowHistory(false)}
            onNavigate={(u) => { setShowHistory(false); navigate(u); }}
            onClear={() => { clearHistory(); setHistory([]); }}
          />
        )}
      </div>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}

function FrameBlockedHint({ url }: { url: string }) {
  return (
    <div className="absolute inset-0 -z-0 flex items-center justify-center p-8 pointer-events-none">
      <div className="max-w-md text-center pointer-events-auto opacity-0 [iframe:not([src])+&]:opacity-100">
        <p className="text-sm text-muted-foreground">
          If this site doesn't load, it may block embedding.{" "}
          <a href={url} target="_blank" rel="noreferrer" className="text-primary underline">Open in new window</a>
        </p>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, disabled, label }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; label: string }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label}
      className="h-9 w-9 grid place-items-center rounded-full hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent text-foreground transition-colors">
      {children}
    </button>
  );
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="w-full text-left px-3 py-2 hover:bg-accent">{children}</button>;
}

function hostnameOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

function getGoogleQuery(url: string): string | null {
  try {
    const u = new URL(url);
    if (!/(^|\.)google\./i.test(u.hostname)) return null;
    if (!u.pathname.startsWith("/search")) return null;
    return u.searchParams.get("q");
  } catch { return null; }
}

type DDGResult = { Text: string; FirstURL: string };

function SearchResults({
  query, googleUrl, onReady, onNavigate,
}: { query: string; googleUrl: string; onReady: () => void; onNavigate: (u: string) => void }) {
  const [results, setResults] = useState<DDGResult[]>([]);
  const [abstract, setAbstract] = useState<{ text: string; url: string; heading: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const flat: DDGResult[] = [];
        const walk = (arr: any[]) => {
          for (const it of arr || []) {
            if (it.Topics) walk(it.Topics);
            else if (it.FirstURL && it.Text) flat.push({ Text: it.Text, FirstURL: it.FirstURL });
          }
        };
        walk(data.RelatedTopics || []);
        walk(data.Results || []);
        setResults(flat.slice(0, 12));
        if (data.AbstractText) setAbstract({ text: data.AbstractText, url: data.AbstractURL, heading: data.Heading });
        setLoading(false);
        onReady();
      })
      .catch(() => { if (!cancelled) { setLoading(false); onReady(); } });
    return () => { cancelled = true; };
  }, [query]);

  return (
    <div className="min-h-full w-full bg-background px-6 py-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Results for "{query}"</h1>
          <p className="text-xs text-muted-foreground mt-1">Powered by DuckDuckGo · Google blocks in-app embedding</p>
        </div>
        <a href={googleUrl} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          Open Google results
        </a>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Searching…</p>}

      {abstract && (
        <div className="mb-6 p-4 rounded-lg border border-border bg-card">
          <h2 className="font-semibold mb-1">{abstract.heading}</h2>
          <p className="text-sm text-muted-foreground mb-2">{abstract.text}</p>
          <button onClick={() => onNavigate(abstract.url)} className="text-xs text-primary hover:underline">{abstract.url}</button>
        </div>
      )}

      <ul className="space-y-4">
        {results.map((r, i) => (
          <li key={i}>
            <button onClick={() => onNavigate(r.FirstURL)} className="text-left group">
              <div className="text-xs text-muted-foreground truncate">{r.FirstURL}</div>
              <div className="text-primary group-hover:underline font-medium">{r.Text.split(" - ")[0]}</div>
              <div className="text-sm text-muted-foreground">{r.Text}</div>
            </button>
          </li>
        ))}
      </ul>

      {!loading && results.length === 0 && !abstract && (
        <p className="text-sm text-muted-foreground">No instant results. Use "Open Google results" above.</p>
      )}
    </div>
  );
}

