import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { buildWhatsAppPickupUrl, buildWhatsAppDelayUrl } from "./whatsapp.ts";
import type { Ticket, Store } from "./types.ts";

describe("Multi-Store WhatsApp Message Formatting Tests", () => {
  const store1: Store = {
    id: "s1",
    code: "FM1",
    name: "Famous Mobiles (Main Branch - Manikonda)",
    displayName: "Manikonda Branch",
    mobile: "9063786751",
    ownerName: "Basheer Uddin",
    addressLine1: "Opp Friends Colony Bus Stop",
    addressLine2: "Shaikpet Main Road",
    city: "Hyderabad",
    active: true,
  };

  const store2: Store = {
    id: "s2",
    code: "FM2",
    name: "Famous Mobiles (Shaikpet Branch)",
    displayName: "Shaikpet",
    mobile: "9876543210",
    ownerName: "Basheer Uddin",
    addressLine1: "Shaikpet Main Road",
    city: "Hyderabad",
    active: true,
  };

  test("buildWhatsAppPickupUrl should use Store 2 details when ticket belongs to Store 2", () => {
    const ticket: Ticket = {
      id: "t1",
      trackingNumber: "FM2-2026-000001",
      customer: {
        id: "c1",
        customerCode: "C001",
        fullName: "Rahul Verma",
        mobile: "9988776655",
      },
      store: store2,
      status: "READY_FOR_PICKUP",
      deviceType: "MOBILE",
      brand: "OnePlus",
      model: "11R",
      accessoriesReceived: [],
      deviceCondition: [],
      estimatedCost: 3500,
      advancePaid: 1000,
      balanceAmount: 2500,
      createdAt: new Date().toISOString(),
    };

    const url = buildWhatsAppPickupUrl(ticket);
    const decoded = decodeURIComponent(url);

    assert.ok(decoded.includes("Famous Mobiles (Shaikpet Branch)"), "Must include Store 2 name");
    assert.ok(decoded.includes("Shaikpet Main Road, Hyderabad"), "Must include Store 2 address");
    assert.ok(decoded.includes("9876543210"), "Must include Store 2 mobile");
    assert.ok(decoded.includes("FM2-2026-000001"), "Must include Store 2 tracking number");
  });

  test("buildWhatsAppDelayUrl should use Store 1 details when ticket belongs to Store 1", () => {
    const ticket: Ticket = {
      id: "t2",
      trackingNumber: "FM1-2026-000002",
      customer: {
        id: "c2",
        customerCode: "C002",
        fullName: "Fatima Begum",
        mobile: "9876501234",
      },
      store: store1,
      status: "REPAIR_IN_PROGRESS",
      deviceType: "MOBILE",
      brand: "Samsung",
      model: "S23",
      accessoriesReceived: [],
      deviceCondition: [],
      estimatedCost: 5000,
      advancePaid: 0,
      balanceAmount: 5000,
      createdAt: new Date().toISOString(),
    };

    const url = buildWhatsAppDelayUrl(ticket);
    const decoded = decodeURIComponent(url);

    assert.ok(decoded.includes("Famous Mobiles (Main Branch - Manikonda)"), "Must include Store 1 name");
    assert.ok(decoded.includes("9063786751"), "Must include Store 1 mobile");
  });
});
