import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cleanMobileInput,
  isExact10DigitMobile,
  isValidCustomerFullName,
  findExactCustomerMatch,
  isCustomerMobileMatch,
  canProceedCustomerStep,
} from "./new-ticket-validation.ts";
import type { Customer } from "./types.ts";

describe("New Ticket Validation & Customer Matching Tests", () => {
  const sampleCustomer: Customer = {
    id: "cust-1",
    customerCode: "CUST-0001",
    fullName: "Rajesh Kumar",
    mobile: "9876543210",
    mobiles: [
      { number: "9876543210", label: "Primary", isPrimary: true },
      { number: "9123456780", label: "Work", isPrimary: false },
    ],
  };

  const sampleDirectory: Customer[] = [sampleCustomer];

  describe("cleanMobileInput", () => {
    it("should strip non-digits, alphabets, and spaces", () => {
      assert.equal(cleanMobileInput("987 654 3210"), "9876543210");
      assert.equal(cleanMobileInput("+91-9876543210"), "9198765432");
      assert.equal(cleanMobileInput("abc98765xyz"), "98765");
    });

    it("should cap at 10 digits max", () => {
      assert.equal(cleanMobileInput("9876543210999"), "9876543210");
    });
  });

  describe("isExact10DigitMobile", () => {
    it("should return true for valid 10-digit mobile numbers", () => {
      assert.equal(isExact10DigitMobile("9876543210"), true);
      assert.equal(isExact10DigitMobile("98765 43210"), true);
    });

    it("should return false for partial matches (< 10 digits) to avoid premature triggering", () => {
      assert.equal(isExact10DigitMobile("9876"), false);
      assert.equal(isExact10DigitMobile("987654"), false);
      assert.equal(isExact10DigitMobile("9876543"), false); // 7 digits
      assert.equal(isExact10DigitMobile("98765432"), false); // 8 digits
      assert.equal(isExact10DigitMobile("987654321"), false); // 9 digits
    });

    it("should return false for invalid formats or empty inputs", () => {
      assert.equal(isExact10DigitMobile(""), false);
      assert.equal(isExact10DigitMobile("abcdefghij"), false);
      assert.equal(isExact10DigitMobile("12345678901"), false); // 11 digits
    });
  });

  describe("isValidCustomerFullName", () => {
    it("should return true for names with 4 or more characters", () => {
      assert.equal(isValidCustomerFullName("Sara"), true); // exactly 4 chars
      assert.equal(isValidCustomerFullName("Mohammed Ali"), true);
      assert.equal(isValidCustomerFullName("John Doe"), true);
    });

    it("should return false for names with fewer than 4 characters", () => {
      assert.equal(isValidCustomerFullName("Bob"), false); // 3 chars
      assert.equal(isValidCustomerFullName("Al"), false); // 2 chars
      assert.equal(isValidCustomerFullName("A"), false); // 1 char
      assert.equal(isValidCustomerFullName(""), false);
    });

    it("should trim surrounding whitespace before evaluating length", () => {
      assert.equal(isValidCustomerFullName("  Ali  "), false); // 3 chars after trim
      assert.equal(isValidCustomerFullName("   "), false);
      assert.equal(isValidCustomerFullName("  Sara  "), true); // 4 chars after trim
    });
  });

  describe("findExactCustomerMatch", () => {
    it("should find exact match when 10-digit number matches primary mobile", () => {
      const match = findExactCustomerMatch(sampleDirectory, "9876543210");
      assert.ok(match);
      assert.equal(match.id, "cust-1");
      assert.equal(match.fullName, "Rajesh Kumar");
    });

    it("should find exact match when 10-digit number matches alternate phone", () => {
      const match = findExactCustomerMatch(sampleDirectory, "9123456780");
      assert.ok(match);
      assert.equal(match.id, "cust-1");
    });

    it("MUST NOT match on partial numbers (7 or 8 digits) - Bug regression test", () => {
      // 7 digits: even though 9876543 is a prefix of Rajesh Kumar's 9876543210
      assert.equal(findExactCustomerMatch(sampleDirectory, "9876543"), undefined);

      // 8 digits
      assert.equal(findExactCustomerMatch(sampleDirectory, "98765432"), undefined);

      // 9 digits
      assert.equal(findExactCustomerMatch(sampleDirectory, "987654321"), undefined);
    });

    it("should return undefined for a unique 10-digit number not in directory", () => {
      assert.equal(findExactCustomerMatch(sampleDirectory, "9999999999"), undefined);
    });
  });

  describe("isCustomerMobileMatch", () => {
    it("should return true when input matches selected customer primary mobile", () => {
      assert.equal(isCustomerMobileMatch(sampleCustomer, "9876543210"), true);
    });

    it("should return true when input matches selected customer alternate mobile", () => {
      assert.equal(isCustomerMobileMatch(sampleCustomer, "9123456780"), true);
    });

    it("should return false when input does not match or customer is null", () => {
      assert.equal(isCustomerMobileMatch(sampleCustomer, "9999999999"), false);
      assert.equal(isCustomerMobileMatch(null, "9876543210"), false);
    });
  });

  describe("canProceedCustomerStep (Step 0 Validation)", () => {
    it("should allow proceeding when existing customer is selected", () => {
      assert.equal(canProceedCustomerStep("cust-1", "9876543210", ""), true);
      assert.equal(canProceedCustomerStep("cust-1", "", ""), true);
    });

    it("should disallow proceeding for new customer if mobile is not 10 digits", () => {
      assert.equal(canProceedCustomerStep("", "9876543", "John Doe"), false);
      assert.equal(canProceedCustomerStep("", "98765432", "John Doe"), false);
      assert.equal(canProceedCustomerStep("", "987654321", "John Doe"), false);
    });

    it("should disallow proceeding for new customer if full name is less than 4 chars", () => {
      assert.equal(canProceedCustomerStep("", "9876543210", "Bob"), false);
      assert.equal(canProceedCustomerStep("", "9876543210", ""), false);
      assert.equal(canProceedCustomerStep("", "9876543210", "   "), false);
    });

    it("should allow proceeding for new customer when 10-digit mobile and 4+ char name are provided", () => {
      assert.equal(canProceedCustomerStep("", "9876543210", "John Doe"), true);
      assert.equal(canProceedCustomerStep("", "9876543210", "Sara"), true);
    });
  });
});
