const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

const API_BASE_URL = rawBaseUrl ? rawBaseUrl.replace(/\/+$/, "") : "";

function resolvePath(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}

function tryGetIdToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("psyflow_id_token");
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers ?? undefined);
  const token = tryGetIdToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(resolvePath(path), {
    ...init,
    headers,
  });
}
