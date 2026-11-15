"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadTokens, getAccessToken, api } from "@/lib/api";
import { getCachedUser, storeUser } from "@/lib/storage";
import { AuthResponse, UserResponse } from "@/lib/types";
import { canAccessDoorstep } from "@/lib/doorstep-permission";

export { canAccessDoorstep };

export function useAuthGuard() {
  const router = useRouter();
  const [user, setUser] = useState<Partial<AuthResponse> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      await loadTokens();
      const token = getAccessToken();
      const stored = getCachedUser();

      if (!token) {
        if (active) {
          router.replace("/login");
          setLoading(false);
        }
        return;
      }

      if (stored && active) {
        try {
          const parsed = JSON.parse(stored);
          const isSysAdmin = parsed.role === "ADMIN" || parsed.mobile === "6302255467";
          if (isSysAdmin) {
            parsed.doorstepEnabled = true;
          }
          setUser(parsed);
        } catch {
          setUser(null);
        }
      }
      if (active) {
        setLoading(false);
      }

      // Background sync with /api/auth/me to refresh doorstepEnabled & roles dynamically
      api<UserResponse>("/auth/me")
        .then((me) => {
          if (!active || !me) return;
          const isSysAdmin = me.role === "ADMIN" || me.mobile === "6302255467";
          const updatedUser: Partial<AuthResponse> = {
            mobile: me.mobile,
            fullName: me.fullName,
            role: me.role,
            doorstepEnabled: isSysAdmin ? true : me.doorstepEnabled,
          };
          setUser(updatedUser);
          storeUser(JSON.stringify(updatedUser)).catch(() => {});
        })
        .catch(() => {});
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, [router]);

  return { user, loading, canAccessDoorstep: canAccessDoorstep(user) };
}

export async function saveUser(user: AuthResponse): Promise<void> {
  const isSysAdmin = user.role === "ADMIN" || user.mobile === "6302255467";
  const payload = JSON.stringify({
    mobile: user.mobile,
    fullName: user.fullName,
    role: user.role,
    doorstepEnabled: isSysAdmin ? true : Boolean(user.doorstepEnabled),
  });
  await storeUser(payload);
}
