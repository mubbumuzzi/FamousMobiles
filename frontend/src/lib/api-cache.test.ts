import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getCachedApi,
  setCachedApi,
  invalidateApiCache,
  clearApiCache,
  DEFAULT_CACHE_TTL,
} from "./api-cache.ts";

describe("API Memory Cache & Stale-While-Revalidate Tests", () => {
  beforeEach(() => {
    clearApiCache();
  });

  test("should return undefined for non-existent cache key", () => {
    const result = getCachedApi("/tickets");
    assert.equal(result, undefined);
  });

  test("should store and retrieve cached data synchronously", () => {
    const mockTickets = [{ id: "t1", trackingNumber: "FM1-0001" }];
    setCachedApi("/tickets?storeId=store-1", mockTickets);

    const retrieved = getCachedApi<typeof mockTickets>("/tickets?storeId=store-1");
    assert.deepEqual(retrieved, mockTickets);
  });

  test("should respect TTL and expire stale entries", async () => {
    const mockData = { count: 42 };
    // Set 20ms TTL
    setCachedApi("/dashboard/metrics", mockData, 20);

    const immediate = getCachedApi("/dashboard/metrics");
    assert.deepEqual(immediate, mockData);

    // Wait 35ms to exceed TTL
    await new Promise((r) => setTimeout(r, 35));

    const expired = getCachedApi("/dashboard/metrics");
    assert.equal(expired, undefined);
  });

  test("should invalidate matching keys by pattern string", () => {
    setCachedApi("/tickets", [{ id: 1 }]);
    setCachedApi("/tickets?storeId=1", [{ id: 1 }]);
    setCachedApi("/customers", [{ id: 2 }]);
    setCachedApi("/dashboard/metrics", { revenue: 100 });

    invalidateApiCache("/tickets");

    assert.equal(getCachedApi("/tickets"), undefined);
    assert.equal(getCachedApi("/tickets?storeId=1"), undefined);
    assert.notEqual(getCachedApi("/customers"), undefined);
    assert.notEqual(getCachedApi("/dashboard/metrics"), undefined);
  });

  test("should clear entire cache when invalidate is called without arguments", () => {
    setCachedApi("/tickets", [{ id: 1 }]);
    setCachedApi("/customers", [{ id: 2 }]);

    invalidateApiCache();

    assert.equal(getCachedApi("/tickets"), undefined);
    assert.equal(getCachedApi("/customers"), undefined);
  });
});
