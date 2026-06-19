const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  if (typeof window !== "undefined") {
    localStorage.setItem("fm_access", access);
    localStorage.setItem("fm_refresh", refresh);
  }
}

export function loadTokens() {
  if (typeof window !== "undefined") {
    accessToken = localStorage.getItem("fm_access");
    refreshToken = localStorage.getItem("fm_refresh");
  }
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("fm_access");
    localStorage.removeItem("fm_refresh");
    localStorage.removeItem("fm_user");
  }
}

export function getAccessToken() {
  if (!accessToken && typeof window !== "undefined") {
    accessToken = localStorage.getItem("fm_access");
  }
  return accessToken;
}

async function readErrorMessage(res: Response): Promise<string> {
  const text = await res.text();
  if (!text) {
    return res.status ? `Request failed (${res.status})` : "Request failed";
  }
  try {
    const body = JSON.parse(text) as { message?: string; error?: string };
    return body.message || body.error || `Request failed (${res.status})`;
  } catch {
    return text.length > 120 ? `${text.slice(0, 120)}…` : text;
  }
}

function redirectToLogin() {
  clearTokens();
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
}

async function refreshAccessToken(): Promise<boolean> {
  loadTokens();
  if (!refreshToken) return false;
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    clearTokens();
    return false;
  }
  const data = await res.json();
  setTokens(data.accessToken, data.refreshToken);
  return true;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  loadTokens();
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const hadToken = Boolean(accessToken);
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error(
      `Cannot reach the server at ${API_URL}. Start the backend with: ./scripts/start-backend.sh`
    );
  }

  if (refreshToken && hadToken && res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers.set("Authorization", `Bearer ${getAccessToken()}`);
      try {
        res = await fetch(`${API_URL}${path}`, { ...options, headers });
      } catch {
        throw new Error(
          `Cannot reach the server at ${API_URL}. Start the backend with: ./scripts/start-backend.sh`
        );
      }
    }
  }

  if (!res.ok) {
    const message = await readErrorMessage(res);
    if (res.status === 401) {
      redirectToLogin();
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return res.json();
  }
  return res.blob() as T;
}

export async function apiPublic<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`);
  } catch {
    throw new Error(
      `Cannot reach the server at ${API_URL}. Start the backend with: ./scripts/start-backend.sh`
    );
  }
  if (!res.ok) {
    const message = await readErrorMessage(res);
    throw new Error(message);
  }
  return res.json();
}

export { API_URL };
