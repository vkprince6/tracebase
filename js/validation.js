/**
 * TRACEBASE — Validation
 * Pure functions for validating form input. Used by every create/edit form.
 * NOTE: these are UX-layer checks only. Authorization and data integrity
 * are enforced server-side by Firestore Security Rules.
 */

export function isRequired(value) {
  return value !== undefined && value !== null && String(value).trim().length > 0;
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export function isValidPassword(value) {
  return typeof value === "string" && value.length >= 8;
}

export function isValidUrl(value) {
  try {
    const u = new URL(String(value));
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidDate(value) {
  if (!value) return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

export function isNonNegativeNumber(value) {
  const n = Number(value);
  return !isNaN(n) && n >= 0;
}

export function isDateOnOrAfter(laterValue, earlierValue) {
  if (!laterValue || !earlierValue) return true;
  return new Date(laterValue).getTime() >= new Date(earlierValue).getTime();
}

/**
 * Validate a set of {field: value} against a set of {field: [validatorFns]}.
 * Each validator is (value, allValues) => true | errorMessage
 * Returns { valid: boolean, errors: { field: message } }
 */
export function validateForm(values, rules) {
  const errors = {};
  for (const [field, validators] of Object.entries(rules)) {
    for (const validator of validators) {
      const result = validator(values[field], values);
      if (result !== true) {
        errors[field] = result;
        break;
      }
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/* Common validator factories */
export const required = (message = "This field is required.") => (v) => isRequired(v) || message;
export const email = (message = "Enter a valid email address.") => (v) => !v || isValidEmail(v) || message;
export const password = (message = "Password must be at least 8 characters.") => (v) => isValidPassword(v) || message;
export const url = (message = "Enter a valid URL starting with http:// or https://") => (v) => !v || isValidUrl(v) || message;
export const nonNegative = (message = "Value cannot be negative.") => (v) => !v || isNonNegativeNumber(v) || message;
