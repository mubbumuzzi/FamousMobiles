"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadTokens, getAccessToken } from "@/lib/api";
import { getCachedUser, storeUser } from "@/lib/storage";
import { AuthResponse } from "@/lib/types";

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
          setUser(JSON.parse(stored));
        } catch {
          setUser(null);
        }
      }
      if (active) {
        setLoading(false);
      }
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, [router]);

  return { user, loading };
}

export async function saveUser(user: AuthResponse): Promise<void> {
  const payload = JSON.stringify({
    mobile: user.mobile,
    fullName: user.fullName,
    role: user.role,
  });
  await storeUser(payload);
}
