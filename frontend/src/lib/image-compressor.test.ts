import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compressImage } from "./image-compressor.ts";

describe("Client-side Image Compressor Tests", () => {
  it("should return the original file if already small (<250KB) and standard JPEG", async () => {
    const smallContent = new Uint8Array(1024 * 50); // 50KB
    const smallFile = new File([smallContent], "small_device_photo.jpg", {
      type: "image/jpeg",
    });

    const result = await compressImage(smallFile);
    assert.equal(result, smallFile);
    assert.equal(result.name, "small_device_photo.jpg");
    assert.equal(result.size, 1024 * 50);
  });

  it("should fall back gracefully to the original file in non-browser environments without crashing", async () => {
    // In Node.js environment where document/canvas is not present
    const largeContent = new Uint8Array(1024 * 1024 * 6); // 6MB simulated photo
    const largeFile = new File([largeContent], "samsung_galaxy_highres.jpg", {
      type: "image/jpeg",
    });

    const result = await compressImage(largeFile);
    assert.ok(result);
    assert.equal(result.name, "samsung_galaxy_highres.jpg");
  });

  it("should handle mock canvas compression if DOM globals are provided", async () => {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;

    try {
      // Mock basic DOM canvas environment
      (globalThis as any).window = {};
      (globalThis as any).document = {
        createElement: (tag: string) => {
          if (tag === "canvas") {
            return {
              width: 0,
              height: 0,
              getContext: () => ({
                imageSmoothingEnabled: false,
                imageSmoothingQuality: "low",
                drawImage: () => {},
              }),
              toBlob: (cb: (blob: Blob) => void) => {
                cb(new Blob(["compressed-content"], { type: "image/jpeg" }));
              },
            };
          }
          return {};
        },
      };

      (globalThis as any).createImageBitmap = async () => ({
        width: 3200,
        height: 2400,
        close: () => {},
      });

      const bigContent = new Uint8Array(1024 * 1024 * 8); // 8MB
      const bigFile = new File([bigContent], "iphone_heic_photo.heic", {
        type: "image/heic",
      });

      const compressed = await compressImage(bigFile, { maxWidth: 1600, maxHeight: 1600 });
      assert.ok(compressed);
      assert.equal(compressed.type, "image/jpeg");
      assert.equal(compressed.name, "iphone_heic_photo.jpg");
    } finally {
      (globalThis as any).window = originalWindow;
      (globalThis as any).document = originalDocument;
      delete (globalThis as any).createImageBitmap;
    }
  });
});
