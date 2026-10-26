"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Smartphone, Settings2, Wifi, Cloud, Cable, CheckCircle2, AlertCircle, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Label } from "@/components/ui/input";
import { setTokens, loadTokens, getAccessToken, getApiUrl, DEFAULT_API_URL } from "@/lib/api";
import { storeServerUrl } from "@/lib/storage";
import { AuthResponse } from "@/lib/types";
import { saveUser } from "@/hooks/useAuth";
import { ShopTerms } from "@/components/ShopInfo";
import { useAndroidBackButton } from "@/hooks/useAndroidBackButton";

const PRESET_SERVERS = [
  {
    name: "Local Wi-Fi (Mac)",
    url: "http://192.168.1.13:8080/api",
    description: "Phone & Mac on same Wi-Fi network",
    icon: Wifi,
  },
  {
    name: "Production Cloud",
    url: "http://13.140.146.12:8080/api",
    description: "Cloud server (works anywhere, 4G/5G)",
    icon: Cloud,
  },
  {
    name: "USB Debugging",
    url: "http://localhost:8080/api",
    description: "With: adb reverse tcp:8080 tcp:8080",
    icon: Cable,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Server URL settings state
  const [serverUrl, setServerUrl] = useState(DEFAULT_API_URL);
  const [showServerModal, setShowServerModal] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState(DEFAULT_API_URL);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  // Android hardware back button handler: close server modal if open
  useAndroidBackButton(() => setShowServerModal(false), showServerModal, 15);

  useEffect(() => {
    async function checkExistingAuth() {
      await loadTokens();
      const current = getApiUrl();
      setServerUrl(current);
      setCustomUrlInput(current);

      if (getAccessToken()) {
        router.replace("/dashboard");
      }
    }
    checkExistingAuth();
  }, [router]);

  const handleTestConnection = async (targetUrl: string) => {
    setTestStatus("testing");
    setTestMessage("Pinging server...");
    const cleanUrl = targetUrl.trim().replace(/\/+$/, "");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${cleanUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Any HTTP response (even 400, 401, 500) confirms network connection succeeded
      setTestStatus("success");
      setTestMessage(`Server is online & reachable (HTTP ${res.status})!`);
    } catch (err: any) {
      setTestStatus("error");
      if (err.name === "AbortError") {
        setTestMessage("Connection timed out after 4 seconds. Verify IP address.");
      } else {
        setTestMessage("Cannot connect to server. Check IP address, Wi-Fi or backend status.");
      }
    }
  };

  const handleSaveServer = async (newUrl: string) => {
    const clean = newUrl.trim().replace(/\/+$/, "");
    if (!clean) return;
    await storeServerUrl(clean);
    setServerUrl(clean);
    setCustomUrlInput(clean);
    setShowServerModal(false);
    setError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const targetUrl = getApiUrl();

    try {
      const res = await fetch(`${targetUrl}/auth/login`, {
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
      await setTokens(data.accessToken, data.refreshToken);
      await saveUser(data);
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      if (msg.includes("fetch") || msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        setError(
          `Cannot reach server at ${targetUrl}. Tap "Change Server" below to switch to your Mac Wi-Fi IP or Cloud server.`
        );
      } else {
        setError(msg);
      }
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
                inputMode="tel"
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

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 space-y-1.5">
                <p className="font-semibold">{error}</p>
                <button
                  type="button"
                  onClick={() => setShowServerModal(true)}
                  className="font-bold text-red-800 underline hover:no-underline flex items-center gap-1 mt-1 touch-active"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Configure server IP / connection
                </button>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full h-12 text-base touch-active" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Current Target Server Status Bar */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <span className="truncate max-w-[210px] font-mono text-[11px] text-slate-500">
                {serverUrl.replace(/^https?:\/\//, "")}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setCustomUrlInput(serverUrl);
                setTestStatus("idle");
                setTestMessage("");
                setShowServerModal(true);
              }}
              className="font-semibold text-blue-600 hover:text-blue-800 touch-active flex items-center gap-1 shrink-0 px-2 py-1 rounded-lg hover:bg-blue-50"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Change Server
            </button>
          </div>

          <p className="mt-5 text-center text-sm text-slate-500">
            <a href="/track" className="font-medium text-blue-600 hover:underline">Track your device</a>
            <span className="text-slate-400"> · no login required</span>
          </p>
          <p className="mt-3 text-center text-sm text-slate-500">
            <a href="/install" className="font-medium text-blue-600 hover:underline">Add to Home Screen</a>
            <span className="text-slate-400"> · use like an app</span>
          </p>
        </div>
        <ShopTerms className="mt-4" />
      </div>

      {/* Server Settings Bottom Sheet Modal */}
      {showServerModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="fixed inset-0 sheet-backdrop transition-opacity"
            onClick={() => setShowServerModal(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white p-5 pb-safe sm:p-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto animate-slide-up sm:animate-fade-in sheet-container">
            <div className="sm:hidden sheet-handle" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Backend Server Settings</h3>
                  <p className="text-xs text-slate-500">Select where the app connects to</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowServerModal(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Presets */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">Quick Presets</Label>
                <div className="grid grid-cols-1 gap-2">
                  {PRESET_SERVERS.map((preset) => {
                    const isSelected = customUrlInput === preset.url;
                    const Icon = preset.icon;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setCustomUrlInput(preset.url);
                          handleTestConnection(preset.url);
                        }}
                        className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all touch-active ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/50 shadow-2xs"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">{preset.name}</span>
                            {isSelected && (
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded-md">
                                Selected
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500">{preset.description}</p>
                          <p className="mt-0.5 font-mono text-[10.5px] text-slate-400 truncate">{preset.url}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Input */}
              <div>
                <Label htmlFor="custom-url" className="text-xs font-bold text-slate-700">
                  Server API URL
                </Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    id="custom-url"
                    type="url"
                    value={customUrlInput}
                    onChange={(e) => {
                      setCustomUrlInput(e.target.value);
                      setTestStatus("idle");
                    }}
                    placeholder="http://192.168.1.13:8080/api"
                    className="font-mono text-xs flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleTestConnection(customUrlInput)}
                    disabled={testStatus === "testing"}
                    className="shrink-0 text-xs touch-active"
                  >
                    {testStatus === "testing" ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Test"
                    )}
                  </Button>
                </div>
              </div>

              {/* Test Status feedback */}
              {testStatus !== "idle" && (
                <div
                  className={`rounded-xl p-3 text-xs flex items-start gap-2 ${
                    testStatus === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : testStatus === "error"
                      ? "bg-red-50 text-red-800 border border-red-200"
                      : "bg-blue-50 text-blue-800 border border-blue-200"
                  }`}
                >
                  {testStatus === "success" && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />}
                  {testStatus === "error" && <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />}
                  {testStatus === "testing" && <RefreshCw className="h-4 w-4 shrink-0 text-blue-600 animate-spin mt-0.5" />}
                  <span className="font-medium">{testMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowServerModal(false)}
                  className="flex-1 touch-active"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSaveServer(customUrlInput)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold touch-active"
                >
                  Save & Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
