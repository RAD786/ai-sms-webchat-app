const NON_DIGIT_REGEX = /\D/g;

export function normalizePhoneNumber(input?: string | null) {
  if (!input) {
    return null;
  }

  const digits = input.replace(NON_DIGIT_REGEX, "");

  if (!digits) {
    return null;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (input.trim().startsWith("+")) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

export function formatPhoneNumber(input?: string | null) {
  // Format North American numbers for dashboard display and fall back to E.164 otherwise.
  const normalized = normalizePhoneNumber(input);

  if (!normalized) {
    return "";
  }

  if (normalized.length === 12 && normalized.startsWith("+1")) {
    const area = normalized.slice(2, 5);
    const prefix = normalized.slice(5, 8);
    const line = normalized.slice(8, 12);

    return `(${area}) ${prefix}-${line}`;
  }

  return normalized;
}
