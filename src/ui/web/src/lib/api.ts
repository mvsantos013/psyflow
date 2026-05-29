import { getValidIdToken, refreshSession } from "@/lib/auth";

const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

const API_BASE_URL = rawBaseUrl ? rawBaseUrl.replace(/\/+$/, "") : "";

function resolvePath(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

function hasAuthHeader(init?: RequestInit): boolean {
  const headers = new Headers(init?.headers ?? undefined);
  return headers.has("Authorization");
}

async function buildResponse(path: string, init: RequestInit | undefined, token: string | null) {
  const headers = new Headers(init?.headers ?? undefined);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(resolvePath(path), {
    ...init,
    headers,
  });
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const hasCustomAuthHeader = hasAuthHeader(init);
  const token = hasCustomAuthHeader ? null : await getValidIdToken();

  let response = await buildResponse(path, init, token);

  if (!hasCustomAuthHeader && response.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed?.idToken) {
      response = await buildResponse(path, init, refreshed.idToken);
    }
  }

  if (typeof window !== "undefined" && (response.status === 401 || response.status === 403)) {
    window.dispatchEvent(
      new CustomEvent("psyflow:auth:unauthorized", {
        detail: {
          reason: response.status === 401 ? "unauthorized" : "forbidden",
        },
      }),
    );
  }

  return response;
}
