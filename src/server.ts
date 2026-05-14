import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // Simple proxy endpoint to bypass sites that block embedding via
      // X-Frame-Options / Content-Security-Policy. Use with caution.
      // Example: /proxy?url=https://html.duckduckgo.com/html/
      const url = new URL(request.url);
      if (url.pathname === "/proxy") {
        const target = url.searchParams.get("url") ?? "";
        if (!target) return new Response("Missing url parameter", { status: 400 });

        // Forward the incoming request method/headers/body where appropriate
        const init: RequestInit = {
          method: request.method,
          headers: Object.fromEntries(request.headers),
          redirect: "follow",
        };
        if (request.method !== "GET" && request.method !== "HEAD") {
          init.body = await request.arrayBuffer();
        }

        const upstream = await fetch(target, init);

        // Clone headers and remove frame-blocking/security headers that
        // prevent embedding. Keep other headers intact.
        const headers = new Headers(upstream.headers);
        headers.delete("x-frame-options");
        headers.delete("content-security-policy");
        headers.delete("frame-ancestors");
        headers.delete("x-content-type-options");

        // It's useful for the browser to treat this as same-origin; allow
        // CORS from same origin if a browser requests resources via fetch.
        headers.set("access-control-allow-origin", "*");

        return new Response(upstream.body, {
          status: upstream.status,
          statusText: upstream.statusText,
          headers,
        });
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
