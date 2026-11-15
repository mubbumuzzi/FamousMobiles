import test from "node:test";
import assert from "node:assert/strict";
import { canAccessDoorstep } from "./doorstep-permission.ts";

test("canAccessDoorstep permissions", async (t) => {
  await t.test("should grant access to ADMIN role regardless of doorstepEnabled flag", () => {
    assert.equal(canAccessDoorstep({ role: "ADMIN", doorstepEnabled: false }), true);
    assert.equal(canAccessDoorstep({ role: "ADMIN", doorstepEnabled: true }), true);
  });

  await t.test("should grant access to System Admin mobile 6302255467 regardless of role or flag", () => {
    assert.equal(canAccessDoorstep({ mobile: "6302255467", role: "SALESMAN", doorstepEnabled: false }), true);
    assert.equal(canAccessDoorstep({ mobile: "6302255467", role: "TECHNICIAN", doorstepEnabled: false }), true);
  });

  await t.test("should grant access to staff when doorstepEnabled is true", () => {
    assert.equal(canAccessDoorstep({ mobile: "9876543210", role: "TECHNICIAN", doorstepEnabled: true }), true);
    assert.equal(canAccessDoorstep({ mobile: "9876543210", role: "SALESMAN", doorstepEnabled: true }), true);
  });

  await t.test("should deny access to staff when doorstepEnabled is false or undefined", () => {
    assert.equal(canAccessDoorstep({ mobile: "9876543210", role: "TECHNICIAN", doorstepEnabled: false }), false);
    assert.equal(canAccessDoorstep({ mobile: "9876543210", role: "SALESMAN", doorstepEnabled: undefined }), false);
  });

  await t.test("should return false when user is null or undefined", () => {
    assert.equal(canAccessDoorstep(null), false);
    assert.equal(canAccessDoorstep(undefined), false);
  });
});
