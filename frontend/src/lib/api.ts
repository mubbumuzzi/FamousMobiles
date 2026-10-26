import {
  initStorage,
  getCachedAccessToken,
  getCachedRefreshToken,
  storeTokens,
  removeAuthData,
} from "./storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export async function setTokens(access: string, refresh: string): Promise<void> {
  await storeTokens(access, refresh);
}

export async function loadTokens(): Promise<void> {
  await initStorage();
}

export async function clearTokens(): Promise<void> {
  await removeAuthData();
}

export function getAccessToken(): string | null {
  return getCachedAccessToken();
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

// Mutex to serialize concurrent refresh requests and avoid token rotation race conditions
let refreshPromise: Promise<boolean> | null = null;

export async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      await loadTokens();
      const currentRefresh = getCachedRefreshToken();
      if (!currentRefresh) return false;

      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: currentRefresh }),
      });

      if (!res.ok) {
        await clearTokens();
        return false;
      }

      const data = await res.json();
      await setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function logoutUser(): Promise<void> {
  const currentRefresh = getCachedRefreshToken();
  if (currentRefresh) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: currentRefresh }),
      });
    } catch {
      // Ignore network errors during logout
    }
  }
  await clearTokens();
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  await loadTokens();
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();
  const hadToken = Boolean(token);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error(
      `Cannot reach the server at ${API_URL}. Start the backend with: ./scripts/start-backend.sh`
    );
  }

  // If token expired (401), trigger serialized refresh and retry once
  if (hadToken && res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newToken = getAccessToken();
      if (newToken) {
        headers.set("Authorization", `Bearer ${newToken}`);
      }
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
