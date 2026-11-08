"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadTokens, getAccessToken } from "@/lib/api";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuthAndRedirect() {
      await loadTokens();
      const token = getAccessToken();
      if (token) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
    checkAuthAndRedirect();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  );
}
