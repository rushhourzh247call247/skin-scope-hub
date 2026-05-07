/**
 * Formats a created_by_label stored in the DB.
 * Backend stores raw token name like "pma:Rached", "doctor:Anna" or just "Anna".
 * UI should show e.g. "Rached (PMA)" / "Anna (Arzt)" / "Anna".
 */
export function formatCreatedByLabel(raw?: string | null): string {
  if (!raw) return "";
  const s = String(raw).trim();
  const m = s.match(/^([a-zA-Z]+)\s*[:\-]\s*(.+)$/);
  if (!m) return s;
  const role = m[1].toLowerCase();
  const name = m[2].trim();
  const roleMap: Record<string, string> = {
    pma: "PMA",
    doctor: "Arzt",
    arzt: "Arzt",
    admin: "Admin",
    accountant: "Buchhaltung",
    user: "Benutzer",
  };
  const roleLabel = roleMap[role] ?? m[1];
  return `${name} (${roleLabel})`;
}
