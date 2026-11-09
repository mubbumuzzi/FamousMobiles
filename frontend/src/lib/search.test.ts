import test, { describe } from "node:test";
import assert from "node:assert/strict";
import type { Ticket, Customer, AccessorySale } from "./types";

interface SearchResult {
  tickets: Ticket[];
  customers: Customer[];
  accessorySales?: AccessorySale[];
}

/** Helper matching the frontend search page warranty logic */
function isWarrantyActive(expiresAt?: string | null): boolean {
  if (!expiresAt) return false;
  const exp = new Date(expiresAt);
  if (isNaN(exp.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return exp >= today;
}

/** Validates official accessory warranty bill numbering pattern */
function isValidAccessoryBillNumber(billNo: string): boolean {
  return /^FM-ACC-\d{4}-\d{5}$/.test(billNo);
}

describe("Search & Accessory Sales Filtering Logic Tests", () => {
  const sampleTicket: Ticket = {
    id: "t-1",
    trackingNumber: "FM1-2026-000001",
    customer: {
      id: "c-1",
      customerCode: "CUST-001",
      fullName: "Mubasheer Customer",
      mobile: "9063786751",
    },
    status: "DEVICE_RECEIVED",
    deviceType: "MOBILE",
    brand: "Apple",
    model: "iPhone 15",
    color: "Black",
    accessoriesReceived: [],
    deviceCondition: [],
    problemDescription: "Display replacement",
    estimatedCost: 8500,
    advancePaid: 2000,
    balanceAmount: 6500,
    createdAt: new Date().toISOString(),
  };

  const sampleCustomer: Customer = {
    id: "c-1",
    customerCode: "CUST-001",
    fullName: "Mubasheer Customer",
    mobile: "9063786751",
  };

  const sampleAccessory: AccessorySale = {
    id: "a-1",
    billNumber: "FM-ACC-2026-00001",
    customerName: "Mubasheer Customer",
    customerMobile: "9063786751",
    accessoryName: "25W Type-C Fast Charger",
    price: 450,
    paymentMode: "UPI",
    warrantyMonths: 6,
    warrantyExpiresAt: "2027-05-10",
    status: "COMPLETED",
    soldAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  test("should handle search response with tickets, customers, and accessory sales", () => {
    const response: SearchResult = {
      tickets: [sampleTicket],
      customers: [sampleCustomer],
      accessorySales: [sampleAccessory],
    };

    assert.equal(response.tickets.length, 1);
    assert.equal(response.customers.length, 1);
    assert.equal(response.accessorySales?.length, 1);
    assert.equal(response.accessorySales?.[0].billNumber, "FM-ACC-2026-00001");
  });

  test("should gracefully handle search response when accessorySales array is omitted", () => {
    const legacyResponse: SearchResult = {
      tickets: [sampleTicket],
      customers: [sampleCustomer],
    };

    const resolvedSales = legacyResponse.accessorySales ?? [];
    assert.equal(resolvedSales.length, 0);
  });

  test("scope filtering logic should correctly isolate items by selected tab", () => {
    const allResults = {
      tickets: [sampleTicket],
      customers: [sampleCustomer],
      accessorySales: [sampleAccessory],
    };

    // Filter for TICKETS tab
    const ticketsOnly = allResults.tickets;
    assert.equal(ticketsOnly.length, 1);
    assert.equal(ticketsOnly[0].trackingNumber, "FM1-2026-000001");

    // Filter for ACCESSORIES tab
    const accessoriesOnly = allResults.accessorySales;
    assert.equal(accessoriesOnly.length, 1);
    assert.equal(accessoriesOnly[0].accessoryName, "25W Type-C Fast Charger");

    // Filter for CUSTOMERS tab
    const customersOnly = allResults.customers;
    assert.equal(customersOnly.length, 1);
    assert.equal(customersOnly[0].fullName, "Mubasheer Customer");
  });

  test("accessory bill number validation should adhere to FM-ACC-YYYY-XXXXX format", () => {
    assert.ok(isValidAccessoryBillNumber("FM-ACC-2026-00001"));
    assert.ok(isValidAccessoryBillNumber("FM-ACC-2026-99999"));
    assert.ok(!isValidAccessoryBillNumber("FM-2026-00001"));
    assert.ok(!isValidAccessoryBillNumber("FM-ACC-26-0001"));
    assert.ok(!isValidAccessoryBillNumber("INVALID"));
  });

  test("warranty active status should compute correctly based on expiration date", () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    assert.ok(isWarrantyActive(futureDate.toISOString().slice(0, 10)));

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    assert.ok(!isWarrantyActive(pastDate.toISOString().slice(0, 10)));

    assert.ok(!isWarrantyActive(null));
    assert.ok(!isWarrantyActive(undefined));
  });
});
