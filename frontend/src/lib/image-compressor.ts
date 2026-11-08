/**
 * Utility to compress and normalize images on the client side (phone/browser)
 * before uploading to the server.
 *
 * Solves:
 * 1. High-resolution phone camera photos (12MP - 200MP) that produce 8MB - 25MB files.
 *    Compresses them to ~200KB - 600KB without visible quality loss for shelf identification.
 * 2. Incompatible formats (HEIC/HEIF on iPhones/Samsung Galaxy) by converting them
 *    to standard, universally supported image/jpeg.
 * 3. Slow network uploads and timeouts on 3G/4G mobile connections.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0 (default 0.82)
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.82,
};

/**
 * Compresses an image File using an offscreen canvas.
 * If running in an environment without Canvas (e.g. SSR or Node.js) or if
 * compression fails, safely falls back to the original File.
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  // If file is already tiny (< 250KB) and is already standard JPEG/PNG, no need to compress
  if (
    file.size <= 250 * 1024 &&
    (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp")
  ) {
    return file;
  }

  // If window or document is undefined (SSR or testing without DOM), return original
  if (typeof window === "undefined" || typeof document === "undefined") {
    return file;
  }

  const { maxWidth = 1600, maxHeight = 1600, quality = 0.82 } = options;

  try {
    const bitmap = await loadImageBitmapOrElement(file);
    const { width: originalWidth, height: originalHeight } = bitmap;

    let targetWidth = originalWidth;
    let targetHeight = originalHeight;

    if (targetWidth > maxWidth || targetHeight > maxHeight) {
      const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
      targetWidth = Math.round(targetWidth * ratio);
      targetHeight = Math.round(targetHeight * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }

    // High quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    if ("drawImage" in ctx) {
      if (typeof Image !== "undefined" && bitmap instanceof Image) {
        ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
      } else {
        ctx.drawImage(bitmap as any, 0, 0, targetWidth, targetHeight);
      }
    }

    // Clean up bitmap if supported
    if ("close" in bitmap && typeof (bitmap as any).close === "function") {
      (bitmap as any).close();
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });

    if (!blob) {
      return file;
    }

    // Determine normalized clean filename
    const baseName = (file.name || "photo").replace(/\.[^/.]+$/, "");
    const cleanFileName = `${baseName}.jpg`;

    return new File([blob], cleanFileName, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("Image compression failed, falling back to original file:", err);
    return file;
  }
}

/**
 * Helper to load image as ImageBitmap (fastest, memory efficient) or fallback to HTMLImageElement.
 */
async function loadImageBitmapOrElement(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      // createImageBitmap automatically respects EXIF orientation
      return await createImageBitmap(file);
    } catch {
      // Fallback to HTMLImageElement below if createImageBitmap throws
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
}
