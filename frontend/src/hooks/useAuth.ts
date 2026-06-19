"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadTokens, getAccessToken } from "@/lib/api";
import { AuthResponse } from "@/lib/types";

export function useAuthGuard() {
  const router = useRouter();
  const [user, setUser] = useState<Partial<AuthResponse> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTokens();
    const token = getAccessToken();
    const stored = localStorage.getItem("fm_user");
    if (!token) {
      router.replace("/login");
      setLoading(false);
      return;
    }
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, [router]);

  return { user, loading };
}

export function saveUser(user: AuthResponse) {
  localStorage.setItem("fm_user", JSON.stringify({ mobile: user.mobile, fullName: user.fullName, role: user.role }));
}
