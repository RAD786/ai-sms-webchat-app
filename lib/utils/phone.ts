const NON_DIGIT_REGEX = /\D/g;
const E164_REGEX = /^\+[1-9]\d{7,14}$/;

export function normalizePhoneNumber(input?: string | null) {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();
  const digits = trimmed.replace(NON_DIGIT_REGEX, "");

  if (!digits) {
    return null;
  }

  if (trimmed.startsWith("+")) {
    const normalized = `+${digits}`;
    return E164_REGEX.test(normalized) ? normalized : null;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    const normalized = `+${digits}`;
    return E164_REGEX.test(normalized) ? normalized : null;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  return null;
}

export function isValidE164PhoneNumber(input?: string | null) {
  const normalized = normalizePhoneNumber(input);
  return normalized ? E164_REGEX.test(normalized) : false;
}

export function normalizePhoneNumberOrThrow(input?: string | null) {
  const normalized = normalizePhoneNumber(input);

  if (!normalized) {
    throw new Error(
      "Phone number must be a valid mobile or landline number in E.164 format, such as +15555555555."
    );
  }

  return normalized;
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
