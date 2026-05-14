import { createFileRoute } from "@tanstack/react-router";
import { Browser } from "@/components/browser/Browser";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nova Browser — Fast, minimal web browser" },
      { name: "description", content: "Nova is a modern lightweight browser with tabs, bookmarks, history, and secure browsing." },
    ],
  }),
  component: () => <Browser />,
});
