// In-memory cache mapping fullUrl -> blobUrl
const photoBlobCache = new Map<string, string>();

function resolveApiUrl(): string {
  if (typeof window !== "undefined") {
    try {
      const custom = localStorage.getItem("fm_server_url");
      if (custom && custom.trim()) {
        return custom.trim().replace(/\/+$/, "");
      }
    } catch (_) {}
  }
  return (process.env.NEXT_PUBLIC_API_URL || "http://13.140.146.12:8080/api").replace(/\/+$/, "");
}

function resolveAccessToken(): string | null {
  if (typeof window !== "undefined") {
    try {
      return localStorage.getItem("fm_access");
    } catch (_) {}
  }
  return null;
}

/**
 * Resolves a ticket photo's stored relative path or full URL against the active backend API.
 */
export function getPhotoFullUrl(fileUrl?: string): string {
  if (!fileUrl) return "";
  if (
    fileUrl.startsWith("http://") ||
    fileUrl.startsWith("https://") ||
    fileUrl.startsWith("data:") ||
    fileUrl.startsWith("blob:")
  ) {
    return fileUrl;
  }
  const apiUrl = resolveApiUrl();
  const apiRoot = apiUrl.endsWith("/api") ? apiUrl.slice(0, -4) : apiUrl;
  const path = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;
  return `${apiRoot}${path}`;
}

/**
 * Loads a device photo via fetch() (which CapacitorHttp intercepts on Android natively),
 * converts the binary response into a local blob: URL, and caches it in memory.
 * This completely avoids Android WebView mixed-content and cleartext image-loading issues.
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
    const headers: Record<string, string> = {};
    const token = resolveAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(fullUrl, { headers });
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
