import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("Authentication Concurrency & Token Mutex Tests", () => {
  it("should collapse multiple concurrent refresh calls into a single execution", async () => {
    let networkCallCount = 0;
    let refreshPromise: Promise<{ accessToken: string; refreshToken: string }> | null = null;

    // Simulated single-flight mutex
    async function singleFlightRefresh() {
      if (refreshPromise) {
        return refreshPromise;
      }

      refreshPromise = (async () => {
        try {
          networkCallCount++;
          // Simulate network latency
          await new Promise((resolve) => setTimeout(resolve, 50));
          return {
            accessToken: "new-access-token-xyz",
            refreshToken: "new-refresh-token-xyz",
          };
        } finally {
          refreshPromise = null;
        }
      })();

      return refreshPromise;
    }

    // Fire 6 concurrent requests simulating 6 initial API calls hitting 401 simultaneously
    const results = await Promise.all([
      singleFlightRefresh(),
      singleFlightRefresh(),
      singleFlightRefresh(),
      singleFlightRefresh(),
      singleFlightRefresh(),
      singleFlightRefresh(),
    ]);

    // Verify all 6 received the exact same token
    assert.strictEqual(results.length, 6);
    for (const res of results) {
      assert.strictEqual(res.accessToken, "new-access-token-xyz");
      assert.strictEqual(res.refreshToken, "new-refresh-token-xyz");
    }

    // Verify only ONE single network call was executed
    assert.strictEqual(networkCallCount, 1, "Only 1 refresh network call should occur during concurrent 401s");
  });

  it("should permit a subsequent refresh call after the in-flight mutex settles", async () => {
    let networkCallCount = 0;
    let refreshPromise: Promise<string> | null = null;

    async function singleFlightRefresh(token: string) {
      if (refreshPromise) return refreshPromise;
      refreshPromise = (async () => {
        try {
          networkCallCount++;
          await new Promise((r) => setTimeout(r, 20));
          return `refreshed-${token}`;
        } finally {
          refreshPromise = null;
        }
      })();
      return refreshPromise;
    }

    // First batch
    const batch1 = await Promise.all([singleFlightRefresh("call-1"), singleFlightRefresh("call-1")]);
    assert.strictEqual(batch1[0], "refreshed-call-1");
    assert.strictEqual(networkCallCount, 1);

    // Second batch (after mutex cleared)
    const batch2 = await singleFlightRefresh("call-2");
    assert.strictEqual(batch2, "refreshed-call-2");
    assert.strictEqual(networkCallCount, 2, "A new call after completion should execute independently");
  });
});
