const SAFE_INTEGER_MAX = Number.MAX_SAFE_INTEGER;

export function parsePositiveRateLimit(
  raw: string | undefined,
  defaultValue: number,
): number {
  if (raw === undefined || raw === '') {
    return defaultValue;
  }

  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    return defaultValue;
  }

  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0 || value > SAFE_INTEGER_MAX) {
    return defaultValue;
  }

  return value;
}
