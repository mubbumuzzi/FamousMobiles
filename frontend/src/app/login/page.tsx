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
    name: "Production Cloud (Live 24/7)",
    url: "http://13.140.146.12:8080/api",
    description: "Connects anywhere (Wi-Fi or 4G/5G mobile data)",
    icon: Cloud,
  },
  {
    name: "Local Wi-Fi (Mac)",
    url: "http://192.168.1.13:8080/api",
    description: "Mac & phone on same Wi-Fi with ./scripts/start-backend.sh",
    icon: Wifi,
  },
  {
    name: "USB Debugging (adb reverse)",
    url: "http://localhost:8080/api",
    description: "USB cable with: adb reverse tcp:8080 tcp:8080",
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
    <div className="flex min-h-[100dvh] flex-col justify-center bg-[#F7F7F8] px-4 py-8 text-[#121212]">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#121212] text-white shadow-2xs">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#121212]">Famous Mobiles</h1>
            <p className="text-xs text-[#767676]">Staff Portal</p>
          </div>
        </div>

        <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
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
                className="h-11 text-sm rounded-[10px]"
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
                className="h-11 text-sm rounded-[10px]"
                required
              />
            </Field>

            {error && (
              <div className="rounded-[10px] border border-[#FDE8E8] bg-[#FDE8E8]/60 p-3 text-xs text-[#C5221F] space-y-1.5">
                <p className="font-semibold">{error}</p>
                <button
                  type="button"
                  onClick={() => setShowServerModal(true)}
                  className="font-bold underline hover:no-underline flex items-center gap-1 mt-1 cursor-pointer"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Configure server IP / connection
                </button>
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full h-11 text-sm font-semibold cursor-pointer" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Current Target Server Status Bar */}
          <div className="mt-4 pt-3 border-t border-[#EBEBEB] flex items-center justify-between text-xs text-[#767676]">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="inline-block h-2 w-2 rounded-full bg-[#0E8345] shrink-0 animate-pulse" />
              <span className="truncate max-w-[210px] font-mono text-[11px] text-[#767676]">
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
              className="font-semibold text-[#121212] hover:text-black touch-active flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-[8px] bg-[#F0F0F2] hover:bg-[#EBEBEB] text-xs transition-colors"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Change Server
            </button>
          </div>

          <p className="mt-5 text-center text-sm text-[#767676]">
            <a href="/track" className="font-semibold text-[#121212] hover:underline">Track your device</a>
            <span className="text-[#A3A3A3]"> · no login required</span>
          </p>
          <p className="mt-3 text-center text-sm text-[#767676]">
            <a href="/install" className="font-semibold text-[#121212] hover:underline">Add to Home Screen</a>
            <span className="text-[#A3A3A3]"> · use like an app</span>
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

          <div className="relative w-full max-w-lg rounded-t-[16px] sm:rounded-[12px] bg-white p-5 pb-safe sm:p-6 shadow-2xl transition-all max-h-[90vh] overflow-y-auto animate-slide-up sm:animate-fade-in sheet-container border border-[#EBEBEB]">
            <div className="sm:hidden sheet-handle" />

            <div className="flex items-center justify-between pb-3 border-b border-[#EBEBEB]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#F0F0F2] text-[#121212]">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#121212]">Backend Server Settings</h3>
                  <p className="text-[11px] text-[#767676]">Select where the app connects to</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowServerModal(false)}
                className="rounded-full p-2 text-[#767676] hover:bg-[#F0F0F2] hover:text-[#121212] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Presets */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[#121212]">Quick Presets</Label>
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
                        className={`flex items-start gap-3 rounded-[10px] border p-3 text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-[#121212] bg-[#F7F7F8] shadow-2xs ring-1 ring-[#121212]"
                            : "border-[#EBEBEB] bg-white hover:border-[#DFDFDF]"
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] ${
                            isSelected ? "bg-[#121212] text-white" : "bg-[#F0F0F2] text-[#121212]"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#121212]">{preset.name}</span>
                            {isSelected && (
                              <span className="text-[10px] font-bold text-[#121212] bg-[#EBEBEB] px-1.5 py-0.2 rounded-[4px]">
                                Selected
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#767676]">{preset.description}</p>
                          <p className="mt-0.5 font-mono text-[10.5px] text-[#A3A3A3] truncate">{preset.url}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Input */}
              <div>
                <Label htmlFor="custom-url" className="text-xs font-bold text-[#121212]">
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
                    className="shrink-0 text-xs cursor-pointer"
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
                  className={`rounded-[10px] p-3 text-xs flex items-start gap-2 ${
                    testStatus === "success"
                      ? "bg-[#E6F4EA] text-[#0E8345] border border-[#0E8345]/20"
                      : testStatus === "error"
                      ? "bg-[#FDE8E8] text-[#C5221F] border border-[#C5221F]/20"
                      : "bg-[#F7F7F8] text-[#121212] border border-[#EBEBEB]"
                  }`}
                >
                  {testStatus === "success" && <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0E8345] mt-0.5" />}
                  {testStatus === "error" && <AlertCircle className="h-4 w-4 shrink-0 text-[#C5221F] mt-0.5" />}
                  {testStatus === "testing" && <RefreshCw className="h-4 w-4 shrink-0 text-[#121212] animate-spin mt-0.5" />}
                  <span className="font-medium">{testMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowServerModal(false)}
                  className="flex-1 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSaveServer(customUrlInput)}
                  className="flex-1 bg-[#121212] hover:bg-[#262626] text-white font-semibold cursor-pointer"
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
