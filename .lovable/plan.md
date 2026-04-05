

# Sicherheitsanalyse — derm247 Frontend

## Gesamtbewertung: Gut, mit einigen Verbesserungspunkten

Dein Frontend ist insgesamt solide aufgebaut. Die kritischsten Sicherheitsmassnahmen sind bereits vorhanden. Es gibt aber einige Punkte, die verbessert werden sollten.

---

## Was bereits gut gelöst ist

| Bereich | Status |
|---|---|
| Token in sessionStorage (nicht localStorage) | Korrekt |
| Automatischer Logout bei 401 | Korrekt |
| Kein Passwort im Frontend gespeichert | Korrekt |
| Rate-Limiting bei Login (429-Handling) | Korrekt |
| 2FA-Flow sauber entkoppelt | Korrekt |
| HTTPS-Erzwingung (Mixed-Content-Check) | Korrekt |
| Keine API-Keys oder Secrets im Frontend-Code | Korrekt |
| Session-Clearing bei Konto-Sperrung (403) | Korrekt |
| Kein localStorage für Auth-Daten | Korrekt |

---

## Verbesserungspunkte (nach Priorität)

### 1. Admin-Rolle nur clientseitig geprüft (MITTEL)

In `App.tsx` wird die Admin-Prüfung rein im Frontend gemacht:
```
if (user?.role !== "admin") return <Navigate to="/" replace />;
```
Das ist **keine echte Sicherheit** — es verhindert nur die UI-Anzeige. Ein technisch versierter Angreifer könnte das `auth_user`-Objekt im sessionStorage manipulieren und sich als Admin ausgeben. **Aber:** Solange dein Laravel-Backend die Rolle serverseitig bei jedem API-Call prüft (was es gemäss deiner Beschreibung tut), ist das Risiko gering. Die Frontend-Prüfung dient nur der UX.

**Empfehlung:** Kein Code-Änderung nötig, solange das Backend jede Admin-Route serverseitig validiert.

### 2. `dangerouslySetInnerHTML` mit i18n-Strings (NIEDRIG)

An 3 Stellen wird `dangerouslySetInnerHTML` verwendet:
- `UserManagement.tsx` — 2FA-Reset-Beschreibung
- `Settings.tsx` — 2FA-Setup-Hinweis

Die Daten kommen aus **i18n-Übersetzungsdateien** (nicht von Benutzereingaben), daher ist das Risiko minimal. Trotzdem wäre es sauberer, React-Komponenten statt HTML-Strings zu verwenden.

**Empfehlung:** Übersetzungen mit `<Trans>`-Komponente von react-i18next umschreiben, um `dangerouslySetInnerHTML` komplett zu eliminieren.

### 3. `console.log` in Produktion (NIEDRIG)

Es gibt ~26 `console.log`-Aufrufe im Code (PatientDetail, Calibrate, OpenCV-Loader, ImageAlign). Diese könnten technische Details wie 3D-Koordinaten oder Debug-Daten in der Browser-Konsole preisgeben.

**Empfehlung:** Alle `console.log`-Aufrufe entfernen oder hinter ein `if (import.meta.env.DEV)` Guard setzen.

### 4. Mock-Daten mit echten E-Mail-Adressen (NIEDRIG)

`mockData.ts` enthält E-Mail-Adressen wie `admin@derm247.ch`, `p.meier@derm247.ch`. Diese Datei wird zwar im Produktionsbetrieb nicht verwendet (da die echte API genutzt wird), aber der Code wird mit ausgeliefert und ist im Browser-DevTools sichtbar.

**Empfehlung:** Mock-Daten komplett entfernen oder durch offensichtlich falsche Daten ersetzen (`test@example.com`).

### 5. Geschützte E-Mail hardcodiert (NIEDRIG)

In `UserManagement.tsx` steht `const PROTECTED_EMAIL = "info@techassist.ch"` im Klartext. Das ist keine direkte Sicherheitslücke, aber verrät interne Informationen.

**Empfehlung:** Vom Backend als Flag liefern (`is_protected: true`) statt im Frontend zu hardcoden.

---

## Was NICHT im Frontend sichtbar ist (positiv)

- Keine API-Keys, Secrets oder Passwörter im Code
- Keine Datenbank-Verbindungsstrings
- Keine Server-IP-Adressen (nur die Domain `api.derm247.ch`)
- Keine Patientendaten im Code (nur Mock-Daten)
- Keine hardcodierten Zugangsdaten

---

## Zusammenfassung der empfohlenen Massnahmen

| Massnahme | Aufwand | Priorität |
|---|---|---|
| `console.log` entfernen/guards | 15 Min | Mittel |
| Mock-Daten bereinigen | 10 Min | Niedrig |
| `dangerouslySetInnerHTML` durch `<Trans>` ersetzen | 30 Min | Niedrig |
| `PROTECTED_EMAIL` vom Backend liefern | 15 Min | Niedrig |

Alle diese Punkte sind kosmetischer Natur — es gibt **keine kritischen Sicherheitslücken** im Frontend. Die echte Sicherheit liegt korrekt auf deinem Laravel-Backend (Token-Validierung, Multi-Tenancy-Checks, Rate-Limiting).

