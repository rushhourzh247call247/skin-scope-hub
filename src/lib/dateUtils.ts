import { format as fnsFormat } from "date-fns";
import { de } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";

/**
 * Returns the user's timezone, auto-detected from the browser.
 * Can be overridden via localStorage key `derm247_timezone`.
 */
export function getUserTimezone(): string {
  try {
    const stored = localStorage.getItem("derm247_timezone");
    if (stored) return stored;
  } catch {
    // SSR or restricted localStorage
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Zurich";
}

/**
 * Ensures a date string from the backend is treated as UTC.
 * If the string has no timezone indicator (Z, +, -), appends 'Z'.
 */
function ensureUtc(dateStr: string): string {
  // Already has timezone info
  if (/[Zz]$/.test(dateStr) || /[+-]\d{2}:\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  return dateStr + "Z";
}

/**
 * Central date formatting function.
 * Converts a UTC timestamp from the backend to the user's local timezone.
 *
 * @param dateInput - ISO date string or Date object
 * @param pattern - date-fns format pattern (e.g. "dd.MM.yyyy HH:mm")
 * @param fallback - returned when dateInput is falsy (default "–")
 */
export function formatDate(
  dateInput: string | Date | null | undefined,
  pattern: string,
  fallback = "–"
): string {
  if (!dateInput) return fallback;

  try {
    const utcDate =
      typeof dateInput === "string"
        ? new Date(ensureUtc(dateInput))
        : dateInput;

    if (isNaN(utcDate.getTime())) return fallback;

    const tz = getUserTimezone();
    const zonedDate = toZonedTime(utcDate, tz);
    return fnsFormat(zonedDate, pattern, { locale: de });
  } catch {
    return fallback;
  }
}
