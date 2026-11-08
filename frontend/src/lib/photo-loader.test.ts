import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getPhotoFullUrl, loadPhotoUrl, invalidatePhotoCache } from "./photo-loader.ts";

describe("Device Photo Loader & URL Resolution Tests", () => {
  beforeEach(() => {
    invalidatePhotoCache();
  });

  describe("getPhotoFullUrl", () => {
    it("should return empty string for null, undefined, or empty fileUrl", () => {
      assert.equal(getPhotoFullUrl(""), "");
      assert.equal(getPhotoFullUrl(undefined), "");
    });

    it("should return absolute http/https URLs as-is without modification", () => {
      const httpUrl = "http://example.com/photos/device.jpg";
      const httpsUrl = "https://images.famousmobiles.com/photos/123.png";
      assert.equal(getPhotoFullUrl(httpUrl), httpUrl);
      assert.equal(getPhotoFullUrl(httpsUrl), httpsUrl);
    });

    it("should return data: and blob: URLs as-is without modification", () => {
      const dataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
      const blobUrl = "blob:https://localhost/83726-2819-281";
      assert.equal(getPhotoFullUrl(dataUrl), dataUrl);
      assert.equal(getPhotoFullUrl(blobUrl), blobUrl);
    });

    it("should resolve relative backend paths against the active API root", () => {
      const relativePath = "/api/files/tickets/123-abc/photos/456-def";
      const resolved = getPhotoFullUrl(relativePath);
      assert.ok(resolved.startsWith("http"));
      assert.ok(resolved.endsWith(relativePath));
      // Should not contain double /api/api
      assert.equal(resolved.includes("/api/api/"), false);
    });

    it("should normalize paths missing leading slashes correctly", () => {
      const relativePath = "api/files/tickets/123-abc/photos/456-def";
      const resolved = getPhotoFullUrl(relativePath);
      assert.ok(resolved.startsWith("http"));
      assert.ok(resolved.endsWith("/" + relativePath));
    });
  });

  describe("loadPhotoUrl caching & fallback", () => {
    it("should return empty string if input is empty", async () => {
      const res = await loadPhotoUrl("");
      assert.equal(res, "");
    });

    it("should return data: and blob: URLs directly without fetch", async () => {
      const dataUrl = "data:image/png;base64,iVBORw0KGgoAAA";
      const res = await loadPhotoUrl(dataUrl);
      assert.equal(res, dataUrl);
    });

    it("should fall back to fullUrl when fetch is unavailable or fails", async () => {
      const relativePath = "/api/files/tickets/test-ticket/photos/non-existent";
      const res = await loadPhotoUrl(relativePath);
      const expectedUrl = getPhotoFullUrl(relativePath);
      assert.equal(res, expectedUrl);
    });
  });
});
