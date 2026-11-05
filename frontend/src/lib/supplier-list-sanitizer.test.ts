import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeItemForSupplier,
  formatSupplierOrderList,
  parseWhatsAppStockText,
} from "./supplier-list-sanitizer.ts";

describe("Supplier List Sanitizer Tests", () => {
  describe("sanitizeItemForSupplier", () => {
    it("should preserve normal accessory item details without touching model numbers", () => {
      assert.equal(
        sanitizeItemForSupplier("15pro max black colour case"),
        "15pro max black colour case"
      );
      assert.equal(
        sanitizeItemForSupplier("S25edge fancy case, lens protectors, matte glass"),
        "S25edge fancy case, lens protectors, matte glass"
      );
      assert.equal(
        sanitizeItemForSupplier("5x Type-C Fast Data Cables (Shop Inventory)"),
        "5x Type-C Fast Data Cables (Shop Inventory)"
      );
      assert.equal(
        sanitizeItemForSupplier("OnePlus 12R tempered glass"),
        "OnePlus 12R tempered glass"
      );
      assert.equal(
        sanitizeItemForSupplier("65W fast charger adapter"),
        "65W fast charger adapter"
      );
    });

    it("should strip embedded 10-digit customer mobile numbers and customer names", () => {
      assert.equal(
        sanitizeItemForSupplier("Ramesh 9063786751 15pro max black colour case", "Ramesh", "9063786751"),
        "15pro max black colour case"
      );
      assert.equal(
        sanitizeItemForSupplier("15pro max black colour case - Ramesh (9063786751)", "Ramesh", "9063786751"),
        "15pro max black colour case"
      );
    });

    it("should strip numbers formatted with +91, spaces, and hyphens", () => {
      assert.equal(
        sanitizeItemForSupplier("+91 98765 43210 iPhone 14 silicon case"),
        "iPhone 14 silicon case"
      );
      assert.equal(
        sanitizeItemForSupplier("+91-9123456789 - S24 Ultra back cover"),
        "S24 Ultra back cover"
      );
      assert.equal(
        sanitizeItemForSupplier("09876543210 Watch charger"),
        "Watch charger"
      );
    });

    it("should strip WhatsApp web and android export timestamps and author headers", () => {
      assert.equal(
        sanitizeItemForSupplier("[7:44 pm, 25/10/2026] +91 98765 43210: 15pro max black colour case"),
        "15pro max black colour case"
      );
      assert.equal(
        sanitizeItemForSupplier("25/10/2026, 7:44 pm - Navaneeth: S25edge fancy case", "Navaneeth"),
        "S25edge fancy case"
      );
      assert.equal(
        sanitizeItemForSupplier("10/25/26, 7:44 PM - +91 98765 43210: Watch charger"),
        "Watch charger"
      );
    });

    it("should strip customer labels like Customer:, Cust:, Ph:, Mob:", () => {
      assert.equal(
        sanitizeItemForSupplier("Customer: Suresh, Ph: 9123456789 - S25edge fancy case", "Suresh", "9123456789"),
        "S25edge fancy case"
      );
      assert.equal(
        sanitizeItemForSupplier("Mob: 9876543210 - Pixel 8 Pro UV glass"),
        "Pixel 8 Pro UV glass"
      );
    });

    it("should not strip 'Shop Stock' generic names", () => {
      assert.equal(
        sanitizeItemForSupplier("Type-C Cable (Shop Stock)", "Shop Stock"),
        "Type-C Cable (Shop Stock)"
      );
    });

    it("should handle empty or null values gracefully", () => {
      assert.equal(sanitizeItemForSupplier(""), "Accessory / Spare Part");
      assert.equal(sanitizeItemForSupplier(null), "Accessory / Spare Part");
    });
  });

  describe("formatSupplierOrderList", () => {
    it("should format clean list for wholesaler clipboard with zero names and phones", () => {
      const orders = [
        {
          itemDetails: "15pro max black colour case - Ramesh (9063786751)",
          quantity: 1,
          customerName: "Ramesh",
          customerMobile: "9063786751",
        },
        {
          itemDetails: "S25edge fancy case, lens protectors, matte glass",
          quantity: 2,
          customerName: "Suresh",
          customerMobile: "9123456789",
        },
        {
          itemDetails: "5x Type-C Fast Data Cables (Shop Inventory)",
          quantity: 5,
          customerName: "Shop Stock",
        },
      ];

      const testDate = new Date(2026, 9, 26); // 26 Oct 2026
      const result = formatSupplierOrderList(orders, testDate);

      // Verify header
      assert.match(result, /📦 \*FAMOUS MOBILES - ACCESSORY STOCK REQUIREMENTS\*/);
      assert.match(result, /📅 26 Oct 2026/);

      // Verify items
      assert.match(result, /1\. \*15pro max black colour case\* \(Qty: 1\)/);
      assert.match(result, /2\. \*S25edge fancy case, lens protectors, matte glass\* \(Qty: 2\)/);
      assert.match(result, /3\. \*5x Type-C Fast Data Cables \(Shop Inventory\)\* \(Qty: 5\)/);

      // Verify customer details are NOT present
      assert.doesNotMatch(result, /Ramesh/);
      assert.doesNotMatch(result, /Suresh/);
      assert.doesNotMatch(result, /9063786751/);
      assert.doesNotMatch(result, /9123456789/);

      // Verify footer
      assert.match(result, /Total: 3 item\(s\) required\. Please confirm availability & dispatch\./);
    });

    it("should return empty string when orders array is empty", () => {
      assert.equal(formatSupplierOrderList([]), "");
    });
  });

  describe("parseWhatsAppStockText", () => {
    it("should parse sender name, phone number, and clean item details from WhatsApp line", () => {
      const parsed = parseWhatsAppStockText(
        "[7:44 pm, 25/10/2026] Navaneeth: 15pro max black colour case"
      );

      assert.equal(parsed.detectedName, "Navaneeth");
      assert.equal(parsed.cleanedItem, "15pro max black colour case");
    });

    it("should detect phone number from WhatsApp line and keep item details clean", () => {
      const parsed = parseWhatsAppStockText(
        "25/10/2026, 7:44 pm - +91 98765 43210: S25edge fancy case"
      );

      assert.equal(parsed.detectedMobile, "9876543210");
      assert.equal(parsed.cleanedItem, "S25edge fancy case");
    });
  });
});
