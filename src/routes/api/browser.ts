import { createFileRoute } from "@tanstack/react-router";

const BLOCKED_PROTOCOLS = /^(data|javascript|mailto|tel|blob):/i;

export const Route = createFileRoute("/api/browser")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestUrl = new URL(request.url);
        const target = requestUrl.searchParams.get("url");

        if (!target) return new Response("Missing url", { status: 400 });

        let targetUrl: URL;
        try {
          targetUrl = new URL(target);
        } catch {
          return new Response("Invalid url", { status: 400 });
        }

        if (!/^https?:$/.test(targetUrl.protocol)) {
          return new Response("Unsupported protocol", { status: 400 });
        }

        const upstream = await fetch(targetUrl, {
          headers: {
            "accept": request.headers.get("accept") || "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "accept-language": request.headers.get("accept-language") || "en-US,en;q=0.9",
            "user-agent": "Mozilla/5.0 (Linux; Android 14; Bromony) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Mobile Safari/537.36",
          },
          redirect: "follow",
        });

        const contentType = upstream.headers.get("content-type") || "application/octet-stream";
        const finalUrl = upstream.url || targetUrl.href;
        const headers = new Headers({
          "content-type": contentType,
          "cache-control": contentType.includes("text/html") ? "no-store" : "public, max-age=3600",
        });

        if (contentType.includes("text/html")) {
          const html = rewriteHtml(await upstream.text(), finalUrl);
          return new Response(html, { status: upstream.status, headers });
        }

        if (contentType.includes("text/css")) {
          const css = rewriteCss(await upstream.text(), finalUrl);
          return new Response(css, { status: upstream.status, headers });
        }

        return new Response(upstream.body, { status: upstream.status, headers });
      },
    },
  },
});

function proxiedUrl(raw: string, base: string) {
  const value = raw.trim();
  if (!value || value.startsWith("#") || BLOCKED_PROTOCOLS.test(value)) return raw;

  try {
    const absolute = new URL(value, base).href;
    return `/api/browser?url=${encodeURIComponent(absolute)}`;
  } catch {
    return raw;
  }
}

function rewriteHtml(html: string, base: string) {
  const withoutSecurityMeta = html.replace(/<meta[^>]+http-equiv=["']?(content-security-policy|x-frame-options)["']?[^>]*>/gi, "");
  return withoutSecurityMeta
    .replace(/\s(href|src|action|poster)=(["'])(.*?)\2/gi, (_match, attr, quote, value) => ` ${attr}=${quote}${proxiedUrl(value, base)}${quote}`)
    .replace(/\s(srcset)=(["'])(.*?)\2/gi, (_match, attr, quote, value) => ` ${attr}=${quote}${rewriteSrcset(value, base)}${quote}`)
    .replace(/<head([^>]*)>/i, `<head$1><base href="${base}">`);
}

function rewriteSrcset(value: string, base: string) {
  return value.split(",").map((part) => {
    const pieces = part.trim().split(/\s+/);
    if (!pieces[0]) return part;
    pieces[0] = proxiedUrl(pieces[0], base);
    return pieces.join(" ");
  }).join(", ");
}

function rewriteCss(css: string, base: string) {
  return css.replace(/url\((['"]?)(.*?)\1\)/gi, (_match, quote, value) => `url(${quote}${proxiedUrl(value, base)}${quote})`);
}