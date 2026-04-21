function hasProtocol(input: string) {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(input);
}

export function normalizeUrl(input?: string | null) {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  const candidate = hasProtocol(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}
