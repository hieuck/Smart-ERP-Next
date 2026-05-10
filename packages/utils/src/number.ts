/**
 * Number utilities — no React dependency.
 */

/** Compact format: 1,500,000 → 1.5M, 12,500 → 12.5K */
export function formatCompact(value: number, locale = "vi-VN"): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat(locale).format(value);
}

/** Format as percentage: 0.1234 → "12.3%" */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Format a raw percentage number: 12.34 → "12.3%" */
export function formatPercentValue(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Round to N decimal places */
export function round(value: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Calculate percentage change: (new - old) / old * 100 */
export function percentChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return round(((newValue - oldValue) / Math.abs(oldValue)) * 100, 1);
}

/** Sum an array of numbers */
export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

/** Average of an array */
export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}
