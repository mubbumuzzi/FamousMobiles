import { Preferences } from "@capacitor/preferences";

// In-memory cache for synchronous reads during render/fetch
let memAccess: string | null = null;
let memRefresh: string | null = null;
let memUser: string | null = null;
let initialized = false;

export async function initStorage(): Promise<void> {
  if (initialized) return;
  try {
    const [acc, ref, usr] = await Promise.all([
      Preferences.get({ key: "fm_access" }),
      Preferences.get({ key: "fm_refresh" }),
      Preferences.get({ key: "fm_user" }),
    ]);

    memAccess = acc.value ?? (typeof window !== "undefined" ? localStorage.getItem("fm_access") : null);
    memRefresh = ref.value ?? (typeof window !== "undefined" ? localStorage.getItem("fm_refresh") : null);
    memUser = usr.value ?? (typeof window !== "undefined" ? localStorage.getItem("fm_user") : null);
  } catch {
    if (typeof window !== "undefined") {
      memAccess = localStorage.getItem("fm_access");
      memRefresh = localStorage.getItem("fm_refresh");
      memUser = localStorage.getItem("fm_user");
    }
  }
  initialized = true;
}

export function getCachedAccessToken(): string | null {
  if (!memAccess && typeof window !== "undefined") {
    memAccess = localStorage.getItem("fm_access");
  }
  return memAccess;
}

export function getCachedRefreshToken(): string | null {
  if (!memRefresh && typeof window !== "undefined") {
    memRefresh = localStorage.getItem("fm_refresh");
  }
  return memRefresh;
}

export function getCachedUser(): string | null {
  if (!memUser && typeof window !== "undefined") {
    memUser = localStorage.getItem("fm_user");
  }
  return memUser;
}

export async function storeTokens(access: string, refresh: string): Promise<void> {
  memAccess = access;
  memRefresh = refresh;
  if (typeof window !== "undefined") {
    localStorage.setItem("fm_access", access);
    localStorage.setItem("fm_refresh", refresh);
  }
  try {
    await Promise.all([
      Preferences.set({ key: "fm_access", value: access }),
      Preferences.set({ key: "fm_refresh", value: refresh }),
    ]);
  } catch (err) {
    console.warn("Preferences.set error:", err);
  }
}

export async function storeUser(userJson: string): Promise<void> {
  memUser = userJson;
  if (typeof window !== "undefined") {
    localStorage.setItem("fm_user", userJson);
  }
  try {
    await Preferences.set({ key: "fm_user", value: userJson });
  } catch (err) {
    console.warn("Preferences.set user error:", err);
  }
}

export async function removeAuthData(): Promise<void> {
  memAccess = null;
  memRefresh = null;
  memUser = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("fm_access");
    localStorage.removeItem("fm_refresh");
    localStorage.removeItem("fm_user");
  }
  try {
    await Promise.all([
      Preferences.remove({ key: "fm_access" }),
      Preferences.remove({ key: "fm_refresh" }),
      Preferences.remove({ key: "fm_user" }),
    ]);
  } catch (err) {
    console.warn("Preferences.remove error:", err);
  }
}
