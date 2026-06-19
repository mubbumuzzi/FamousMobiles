"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Label } from "@/components/ui/input";
import { setTokens, API_URL } from "@/lib/api";
import { AuthResponse } from "@/lib/types";
import { saveUser } from "@/hooks/useAuth";
import { ShopTerms } from "@/components/ShopInfo";

export default function LoginPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: mobile.trim(), password }),
      });
      if (!res.ok) {
        let message = "Login failed";
        try {
          const err = await res.json();
          message = err.message || err.error || message;
        } catch {
          message = res.status === 401 ? "Invalid mobile number or password" : `Login failed (${res.status})`;
        }
        throw new Error(message);
      }
      const data: AuthResponse = await res.json();
      setTokens(data.accessToken, data.refreshToken);
      saveUser(data);
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg.includes("fetch") || msg === "Failed to fetch"
        ? "Cannot reach server. Start backend: ./scripts/start-backend.sh"
        : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      <div className="gradient-hero px-6 py-12 text-white">
        <div className="mx-auto flex max-w-md items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
            <Smartphone className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Famous Mobiles</h1>
            <p className="text-sm opacity-90">Staff Portal</p>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-8 w-full max-w-md flex-1 px-4 pb-8">
        <div className="premium-card p-6 shadow-lg animate-slide-up">
          <form onSubmit={handleLogin} className="space-y-4">
            <Field>
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input
                id="mobile"
                type="tel"
                placeholder="Enter your mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="h-12 text-base"
                required
              />
            </Field>
            <Field>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 text-base"
                required
              />
            </Field>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <Button type="submit" size="lg" className="w-full h-12 text-base" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-500">
            <a href="/track" className="font-medium text-blue-600 hover:underline">Track your device</a>
            <span className="text-slate-400"> · no login required</span>
          </p>
        </div>
        <ShopTerms className="mt-4" />
      </div>
    </div>
  );
}
