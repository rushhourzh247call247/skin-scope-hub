import { format as fnsFormat } from "date-fns";
import { de, enUS, fr, it, es } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import i18n from "@/i18n";

const localeMap: Record<string, any> = {
  de,
  en: enUS,
  fr,
  it,
  es,
};

export function getUserTimezone(): string {
  try {
    const stored = localStorage.getItem("derm247_timezone");
    if (stored) return stored;
  } catch {
    // SSR or restricted localStorage
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Zurich";
}

function getDateLocale() {
  const lang = i18n.language?.split("-")[0] || "de";
  return localeMap[lang] || de;
}

function ensureUtc(dateStr: string): string {
  if (/[Zz]$/.test(dateStr) || /[+-]\d{2}:\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  return dateStr + "Z";
}

export function formatDate(
  dateInput: string | Date | null | undefined,
  pattern: string,
  fallback = "\u2013"
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
    return fnsFormat(zonedDate, pattern, { locale: getDateLocale() });
  } catch {
    return fallback;
  }
}
