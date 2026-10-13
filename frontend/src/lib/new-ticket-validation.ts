import type { Customer } from "./types";

/**
 * Normalizes input to digits only, up to 10 digits.
 */
export function cleanMobileInput(raw: string): string {
  return (raw || "").replace(/\D/g, "").slice(0, 10);
}

/**
 * Checks if a mobile number is exactly 10 digits.
 */
export function isExact10DigitMobile(mobile: string): boolean {
  const clean = (mobile || "").replace(/\s/g, "");
  return /^\d{10}$/.test(clean);
}

/**
 * Validates customer full name (minimum 4 characters, trimmed).
 */
export function isValidCustomerFullName(name: string): boolean {
  return (name || "").trim().length >= 4;
}

/**
 * Finds an exact 10-digit customer match from the customer directory.
 * Will return undefined if the input is not exactly 10 digits.
 */
export function findExactCustomerMatch(
  customers: Customer[],
  cleanMobile: string
): Customer | undefined {
  if (cleanMobile.length !== 10) return undefined;
  return customers.find(
    (c) => c.mobile === cleanMobile || c.mobiles?.some((m) => m.number === cleanMobile)
  );
}

/**
 * Checks whether the entered digits match the currently selected customer's mobile numbers.
 */
export function isCustomerMobileMatch(
  customer: Customer | null,
  digits: string
): boolean {
  if (!customer) return false;
  return (
    customer.mobile === digits ||
    Boolean(customer.mobiles?.some((m) => m.number === digits))
  );
}

/**
 * Determines whether Step 0 (Customer) of the New Repair wizard can proceed.
 */
export function canProceedCustomerStep(
  customerId: string,
  mobile: string,
  fullName: string
): boolean {
  if (Boolean(customerId)) return true;
  return isExact10DigitMobile(mobile) && isValidCustomerFullName(fullName);
}
