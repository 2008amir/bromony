export type Bookmark = { id: string; title: string; url: string; favicon?: string };
export type HistoryEntry = { id: string; title: string; url: string; visitedAt: number };

const BM_KEY = "nova:bookmarks";
const HIST_KEY = "nova:history";

export const getBookmarks = (): Bookmark[] => {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(BM_KEY) || "[]"); } catch { return []; }
};
export const saveBookmarks = (b: Bookmark[]) => localStorage.setItem(BM_KEY, JSON.stringify(b));

export const getHistory = (): HistoryEntry[] => {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(HIST_KEY) || "[]"); } catch { return []; }
};
export const saveHistory = (h: HistoryEntry[]) => localStorage.setItem(HIST_KEY, JSON.stringify(h));
export const clearHistory = () => localStorage.removeItem(HIST_KEY);

export const faviconFor = (url: string) => {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch { return ""; }
};

export const resolveInput = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) return "";
  // URL detection
  const urlLike = /^(https?:\/\/)/i.test(trimmed) ||
    /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(trimmed) ||
    /^localhost(:\d+)?/i.test(trimmed);
  if (urlLike) {
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }
  const q = encodeURIComponent(trimmed);
  return `https://www.google.com/search?q=${q}`;
};
