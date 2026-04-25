/**
 * Umgebungs-Erkennung.
 *
 * Server-Admin ist ein internes Verwaltungs-Tool und darf NUR auf Test-/Dev-Domains
 * sichtbar sein — niemals auf der Live-Kunden-Domain (derm247.ch / app.derm247.ch).
 */

const LIVE_HOSTS = new Set([
  "derm247.ch",
  "www.derm247.ch",
  "app.derm247.ch",
  "demo.derm247.ch",
]);

/** True wenn aktuell auf einer Live-Kunden-Domain. */
export function isLiveHost(): boolean {
  if (typeof window === "undefined") return false;
  return LIVE_HOSTS.has(window.location.hostname);
}

/** True wenn Server-Admin angezeigt werden darf (überall AUSSER Live). */
export function isServerAdminAvailable(): boolean {
  return !isLiveHost();
}
