import {
  initStorage,
  getCachedAccessToken,
  getCachedRefreshToken,
  getCachedServerUrl,
  storeTokens,
  removeAuthData,
} from "./storage";
import {
  getCachedApi,
  setCachedApi,
  invalidateApiCache,
  clearApiCache,
} from "./api-cache";

export { getCachedApi, setCachedApi, invalidateApiCache, clearApiCache };

export const DEFAULT_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://13.140.146.12:8080/api";

export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    const custom = getCachedServerUrl();
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, "");
    }
    // Local web browser dev fallback: connect to local Spring Boot API
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const isNativeCapacitor = Boolean(
      (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
    );
    if (isLocalhost && !isNativeCapacitor) {
      return "http://localhost:8080/api";
    }
  }
  return DEFAULT_API_URL.replace(/\/+$/, "");
}

// Fallback constant for legacy imports
const API_URL = DEFAULT_API_URL;

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

      const res = await fetch(`${getApiUrl()}/auth/refresh`, {
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
      await fetch(`${getApiUrl()}/auth/logout`, {
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
  const url = getApiUrl();
  const method = (options.method || "GET").toUpperCase();
  const isGet = method === "GET";

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
  const timeoutMs = options.body instanceof FormData ? 45000 : 15000;
  const signal = options.signal || (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal ? AbortSignal.timeout(timeoutMs) : undefined);

  try {
    res = await fetch(`${url}${path}`, { ...options, headers, signal });
  } catch {
    // If network fails during a GET request and we have cached data, return it seamlessly
    if (isGet) {
      const cached = getCachedApi<T>(path);
      if (cached !== undefined) {
        return cached;
      }
    }
    throw new Error(
      `Cannot reach the server at ${url}. Check your network connection or tap "Change Server" on the login screen.`
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
        res = await fetch(`${url}${path}`, { ...options, headers });
      } catch {
        if (isGet) {
          const cached = getCachedApi<T>(path);
          if (cached !== undefined) return cached;
        }
        throw new Error(
          `Cannot reach the server at ${url}. Check your network connection or tap "Change Server" on the login screen.`
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

  // Auto-invalidate matching caches on successful data mutations (POST, PUT, PATCH, DELETE)
  if (!isGet) {
    if (path.includes("/tickets")) {
      invalidateApiCache("/tickets");
      invalidateApiCache("/dashboard");
      invalidateApiCache("/reports");
    } else if (path.includes("/stock-orders")) {
      invalidateApiCache("/stock-orders");
      invalidateApiCache("/dashboard");
    } else if (path.includes("/customers")) {
      invalidateApiCache("/customers");
      invalidateApiCache("/tickets");
    } else if (path.includes("/payments")) {
      invalidateApiCache("/dashboard");
      invalidateApiCache("/tickets");
      invalidateApiCache("/reports");
    } else {
      invalidateApiCache();
    }
  }

  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    const json = await res.json();
    if (isGet) {
      setCachedApi(path, json);
    }
    return json as T;
  }
  return res.blob() as T;
}

export async function apiPublic<T>(path: string): Promise<T> {
  const url = getApiUrl();
  const signal = typeof AbortSignal !== "undefined" && "timeout" in AbortSignal ? AbortSignal.timeout(15000) : undefined;
  let res: Response;
  try {
    res = await fetch(`${url}${path}`, { signal });
  } catch {
    throw new Error(
      `Cannot reach the server at ${url}. Check your network connection or tap "Change Server" on the login screen.`
    );
  }
  if (!res.ok) {
    const message = await readErrorMessage(res);
    throw new Error(message);
  }
  return res.json();
}

export { API_URL };
