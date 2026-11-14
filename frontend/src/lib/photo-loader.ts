import { getApiUrl, getAccessToken, refreshAccessToken, loadTokens } from "./api.ts";

// In-memory cache mapping fullUrl -> blobUrl
const photoBlobCache = new Map<string, string>();

/**
 * Resolves a ticket photo's stored relative path or full URL against the active backend API.
 */
export function getPhotoFullUrl(fileUrl?: string): string {
  if (!fileUrl) return "";
  if (fileUrl.startsWith("data:") || fileUrl.startsWith("blob:")) {
    return fileUrl;
  }

  const apiUrl = getApiUrl();
  const apiRoot = apiUrl.endsWith("/api") ? apiUrl.slice(0, -4) : apiUrl;

  // Stale domain / port rewrite: If stored URL has old domain or old 8080 port, rewrite to current API root
  if (fileUrl.includes(":8080") || fileUrl.includes("famousmobiles.com")) {
    const path = fileUrl.replace(/^https?:\/\/[^\/]+/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${apiRoot}${cleanPath}`;
  }

  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    return fileUrl;
  }

  const path = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;
  return `${apiRoot}${path}`;
}

/**
 * Loads a device photo via fetch() (which CapacitorHttp intercepts on Android natively),
 * converts the binary response into a local blob: URL, and caches it in memory.
 * This completely avoids Android WebView mixed-content and cleartext image-loading issues,
 * and handles JWT token authorization and automatic refresh seamlessly.
 */
export async function loadPhotoUrl(fileUrl: string): Promise<string> {
  if (!fileUrl) return "";
  if (fileUrl.startsWith("data:") || fileUrl.startsWith("blob:")) {
    return fileUrl;
  }

  const fullUrl = getPhotoFullUrl(fileUrl);
  if (photoBlobCache.has(fullUrl)) {
    return photoBlobCache.get(fullUrl)!;
  }

  try {
    await loadTokens();
    const headers: Record<string, string> = {};
    let token = getAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let res = await fetch(fullUrl, { headers });

    // If 401 Unauthorized, automatically attempt token refresh and retry
    if (res.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        token = getAccessToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        res = await fetch(fullUrl, { headers });
      }
    }

    if (!res.ok) {
      console.warn(`[photo-loader] Fetch returned HTTP ${res.status} for ${fullUrl}`);
      return fullUrl;
    }

    const blob = await res.blob();
    if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
      const objectUrl = URL.createObjectURL(blob);
      photoBlobCache.set(fullUrl, objectUrl);
      return objectUrl;
    }
    return fullUrl;
  } catch (err) {
    console.warn("[photo-loader] Native blob fetch failed, falling back to direct URL:", err);
    return fullUrl;
  }
}

/**
 * Invalidates the cached blob URL for a photo (or all photos), revoking the object URL.
 */
export function invalidatePhotoCache(fileUrl?: string): void {
  if (fileUrl) {
    const fullUrl = getPhotoFullUrl(fileUrl);
    const existing = photoBlobCache.get(fullUrl);
    if (existing && existing.startsWith("blob:")) {
      try {
        if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
          URL.revokeObjectURL(existing);
        }
      } catch (_) {}
    }
    photoBlobCache.delete(fullUrl);
  } else {
    for (const [, blobUrl] of photoBlobCache.entries()) {
      if (blobUrl && blobUrl.startsWith("blob:")) {
        try {
          if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
            URL.revokeObjectURL(blobUrl);
          }
        } catch (_) {}
      }
    }
    photoBlobCache.clear();
  }
}
