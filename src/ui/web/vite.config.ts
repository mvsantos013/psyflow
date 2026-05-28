// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { ViteDevServer } from "vite";

// Redirect TanStack Start's bundled server entry to server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.

const rawApiBaseUrl = process.env.VITE_API_BASE_URL?.trim();
const hasApiBaseUrl = Boolean(rawApiBaseUrl);
const useMockApi = process.env.VITE_USE_MOCK_API === "true" && !hasApiBaseUrl;

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      ...(useMockApi
        ? [
            {
              name: "mock-api",
              configureServer(server: ViteDevServer) {
                server.middlewares.use(
                  async (
                    req: IncomingMessage,
                    res: ServerResponse,
                    next: (err?: unknown) => void,
                  ) => {
                  if (!req.url?.startsWith("/api/")) return next();
                  const url = `http://localhost${req.url}`;

                  // Collect body for methods that carry a payload (POST, PUT, PATCH)
                  const body = await new Promise<Buffer>((resolve) => {
                    const chunks: Buffer[] = [];
                    req.on("data", (chunk: Buffer) => chunks.push(chunk));
                    req.on("end", () => resolve(Buffer.concat(chunks)));
                  });

                  const request = new Request(url, {
                    method: req.method,
                    headers: req.headers as Record<string, string>,
                    body: body.length > 0 ? new Uint8Array(body) : undefined,
                  });

                  const { apiRouter } = await import("./src/mock-api/router");
                  const response = await apiRouter.fetch(request);
                  res.writeHead(response.status, Object.fromEntries(response.headers));
                  res.end(await response.text());
                  },
                );
              },
            },
          ]
        : []),
    ],
  },
});
