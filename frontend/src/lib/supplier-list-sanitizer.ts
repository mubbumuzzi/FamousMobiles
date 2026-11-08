/**
 * Utility functions for sanitizing stock demands and generating supplier / wholesale orders.
 * Wholesale parts suppliers should ONLY receive item details and quantities,
 * NEVER customer names, customer mobile numbers, or counter contact info.
 */

/**
 * Strips customer names, phone numbers, WhatsApp headers, and contact prefixes
 * from an item description so wholesale suppliers receive only product specifications.
 */
export function sanitizeItemForSupplier(
  itemDetails?: string | null,
  customerName?: string | null,
  customerMobile?: string | null
): string {
  if (!itemDetails || !itemDetails.trim()) {
    return "Accessory / Spare Part";
  }

  let clean = itemDetails.trim();

  // 1. Strip WhatsApp export timestamps & bracketed headers:
  // e.g. "[7:44 pm, 25/10/2026] ...", "[10:15, 05/11/2026] ..."
  clean = clean.replace(/\[\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?(?:,\s*[^\]]+)?\]\s*/gi, "");

  // Android WhatsApp export format: "25/10/2026, 7:44 pm - ..." or "10/25/26, 7:44 PM - ..."
  clean = clean.replace(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?\s*[-–]\s*/gi, "");

  // 2. Strip author/sender prefix before a colon if it looks like a sender/contact header:
  // e.g. "Navaneeth:", "+91 98765 43210:", "Customer Name:"
  clean = clean.replace(/^[^:\n]{1,40}:\s*/, "");

  // 3. Strip specific customer mobile if provided
  if (customerMobile) {
    const rawMobile = customerMobile.replace(/\D/g, "");
    if (rawMobile.length >= 10) {
      const tenDigit = rawMobile.slice(-10);
      const phoneRegex = new RegExp("(?:\\+?91[\\s-]?)?" + tenDigit.split("").join("[\\s-]?"), "g");
      clean = clean.replace(phoneRegex, "");
    }
  }

  // 4. Strip Indian mobile numbers (with or without +91 / 0 / spaces / hyphens)
  // Ensures phone numbers like 9876543210, +91 98765 43210, 09876543210 are removed
  // while preserving device model numbers like iPhone 15, S25, OnePlus 12R, 65W
  clean = clean.replace(/\b0[6-9]\d{9}\b/g, "");
  clean = clean.replace(/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/g, "");
  clean = clean.replace(/(?:\+?91[\s-]?)?[6-9]\d{9}\b/g, "");

  // 5. Strip specific customer name if provided (ignoring shop/system defaults)
  if (
    customerName &&
    customerName.trim().toLowerCase() !== "shop stock" &&
    !customerName.trim().toLowerCase().startsWith("customer")
  ) {
    const trimmedName = customerName.trim();
    const escapedFullName = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    clean = clean.replace(new RegExp("\\b" + escapedFullName + "\\b", "gi"), "");

    // Also strip individual name words of length >= 3 (e.g. "Ramesh" in "Ramesh Kumar")
    const words = trimmedName.split(/\s+/).filter((w) => w.length >= 3);
    for (const word of words) {
      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      clean = clean.replace(new RegExp("\\b" + escapedWord + "\\b", "gi"), "");
    }
  }

  // 6. Strip contact labels & customer prefixes
  clean = clean.replace(/\b(?:ph(?:one)?|mob(?:ile)?|contact|cell|tel|whatsapp|wa)[\s.:#-]+/gi, "");
  clean = clean.replace(/\b(?:customer(?:\s*name)?|cust|client|name)[\s.:#-]+/gi, "");

  // 7. Clean up empty brackets, dangling punctuation, multiple spaces
  clean = clean.replace(/\(\s*\)/g, "");
  clean = clean.replace(/\[\s*\]/g, "");
  clean = clean.replace(/\{\s*\}/g, "");
  clean = clean.replace(/\s*,\s*,+/g, ",");
  clean = clean.replace(/\s*[-–—]{2,}\s*/g, " - ");
  clean = clean.replace(/^[,\-:\s/]+/, "");
  clean = clean.replace(/[,\-:\s/]+$/, "");
  clean = clean.replace(/\s{2,}/g, " ").trim();

  return clean || "Accessory / Spare Part";
}

export interface SupplierOrderEntry {
  itemDetails: string;
  quantity?: number;
  customerName?: string;
  customerMobile?: string;
}

/**
 * Builds a clean, professional clipboard message for wholesale suppliers.
 * Strictly guarantees that customer names and contact numbers are excluded.
 */
export function formatSupplierOrderList(
  orders: SupplierOrderEntry[],
  date: Date = new Date()
): string {
  if (!orders || orders.length === 0) {
    return "";
  }

  const todayStr = date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  let msg = `📦 *FAMOUS MOBILES - ACCESSORY STOCK REQUIREMENTS*\n📅 ${todayStr}\n\n`;

  orders.forEach((o, idx) => {
    const cleanedItem = sanitizeItemForSupplier(o.itemDetails, o.customerName, o.customerMobile);
    const qty = o.quantity && o.quantity > 0 ? o.quantity : 1;
    msg += `${idx + 1}. *${cleanedItem}* (Qty: ${qty})\n`;
  });

  msg += `\nTotal: ${orders.length} item(s) required. Please confirm availability & dispatch.`;
  return msg;
}

/**
 * Parses pasted text (e.g. from WhatsApp) into separated fields:
 * - detects customer mobile (if present)
 * - detects customer name (if present)
 * - sanitizes item details to ensure clean accessory text
 */
export function parseWhatsAppStockText(
  text: string,
  currentMobile?: string,
  currentName?: string
): {
  cleanedItem: string;
  detectedMobile?: string;
  detectedName?: string;
} {
  if (!text || !text.trim()) {
    return { cleanedItem: "" };
  }

  const input = text.trim();
  let detectedMobile: string | undefined;
  let detectedName: string | undefined;

  // 1. Detect 10-digit mobile number if currentMobile is empty
  const phoneMatch =
    input.match(/(?:\+?91[\s-]?)?([6-9]\d{4}[\s-]?\d{5})\b/) ||
    input.match(/(?:\+?91[\s-]?)?([6-9]\d{9})\b/);
  if (phoneMatch) {
    const digits = phoneMatch[1].replace(/\D/g, "");
    if (digits.length === 10 && !currentMobile) {
      detectedMobile = digits;
    }
  }

  // 2. Detect sender / author name from WhatsApp header if currentName is empty
  const headerMatch =
    input.match(/^\[.*?\]\s*([^:+]+):/i) ||
    input.match(/^[0-9/,-]+\s+[0-9:apmAPM\s]+[-–]\s*([^:+]+):/i) ||
    input.match(/^([^:\n]{2,30}):/);

  if (headerMatch && headerMatch[1]) {
    const candidate = headerMatch[1].trim();
    // Verify it is not a phone number or time string
    if (!currentName && candidate && !/\d{5,}/.test(candidate) && candidate.length >= 2) {
      detectedName = candidate;
    }
  }

  // 3. Sanitize item details
  const effectiveName = currentName || detectedName;
  const effectiveMobile = currentMobile || detectedMobile;
  let cleanedItem = sanitizeItemForSupplier(input, effectiveName, effectiveMobile);

  // Normalize newlines in item text to commas
  cleanedItem = cleanedItem.replace(/\r?\n+/g, ", ").replace(/\s{2,}/g, " ").trim();

  return {
    cleanedItem,
    detectedMobile,
    detectedName,
  };
}
