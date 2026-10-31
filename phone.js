
/**
 * Validate and format Kenyan mobile numbers.
 * Successful output: 254XXXXXXXXX
 */
export function formatPhoneNumber(phone) {
  if (typeof phone !== "string" || phone.trim() === "") {
    return {
      success: false,
      error: "Phone number is required."
    };
  }

  const input = phone.trim();

  // Allow digits, spaces, dashes and an optional leading +.
  if (!/^\+?[0-9\s-]+$/.test(input)) {
    return {
      success: false,
      error:
        "Phone number must contain only digits, spaces, dashes, or a leading +."
    };
  }

  // Remove spaces, dashes and the optional +.
  const digits = input.replace(/[\s+-]/g, "");

  if (digits.length < 10) {
    return {
      success: false,
      error:
        "Phone number too short. Must be 10 digits (07XX) or 12 digits (254XX)."
    };
  }

  if (digits.length > 12) {
    return {
      success: false,
      error:
        "Phone number too long. Must be 10 digits (07XX) or 12 digits (254XX)."
    };
  }

  let formatted;

  // Examples: 0712345678, 0112345678
  if (/^0[71]\d{8}$/.test(digits)) {
    formatted = `254${digits.slice(1)}`;
  }

  // Examples: 254712345678, 254112345678
  else if (/^254[71]\d{8}$/.test(digits)) {
    formatted = digits;
  }

  else if (digits.length === 10 || digits.length === 12) {
    return {
      success: false,
      error:
        "Invalid Kenyan phone number. Must start with 07, 01, or 254."
    };
  }

  else {
    return {
      success: false,
      error:
        "Invalid phone number length. Must be 10 digits (07XX) or 12 digits (254XX)."
    };
  }

  return {
    success: true,
    formatted
  };
}

// Returns a simple true/false value.
export function isValidKenyanPhone(phone) {
  return formatPhoneNumber(phone).success;
}

// Validate the payment amount without rounding.
export function validateAmount(amount) {
  if (
    !Number.isInteger(amount) ||
    amount < 1 ||
    amount > 150000
  ) {
    throw new RangeError(
      "Amount must be an integer between 1 and 150,000 KES."
    );
  }

  return amount;
}

// Protect customer phone numbers in transaction logs.
export function maskPhoneNumber(formattedPhone) {
  return /^254[71]\d{8}$/.test(formattedPhone)
    ? `${formattedPhone.slice(0, 4)}****${formattedPhone.slice(-4)}`
    : "INVALID";
}
