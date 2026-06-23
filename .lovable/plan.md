## Rückmeldung des Kunden

1. Zone-Foto: Kamera-Option fehlt — aktuell nur Datei-Upload.
2. Zone anlegen: Dropdown-Suche soll **komplett weg**. Stattdessen wie früher: direkt auf der 3D-Puppe die Stelle anklicken, Pin lässt sich vor dem Speichern noch verschieben.

Keine Backend-/DB-Änderungen.

---

## Änderung 1 — Kamera-Button für Zone-Foto

Heute (Sidebar pro Zone): ein Upload-Icon → versteckter File-Input ohne `capture` → Mobile zeigt nur Datei-Picker.

Geplant:
- Zwei Icons nebeneinander (gleiches Muster wie `ImageGallery` für Spots):
  - Kamera-Icon → `accept="image/*" capture="environment"` (Direktaufnahme).
  - Upload-Icon → wie bisher (Galerie/Desktop).
- Beide nutzen denselben Handler `handleZoneSidebarUpload` und denselben `zoneUploadTargetId`-State.

Betroffene Datei: `src/pages/PatientDetail.tsx` (Button Zeile 1346, Input Zeile 1601 → zweiter Ref/Input ergänzen).

## Änderung 2 — Zone anlegen via 3D-Puppe (kein Dropdown mehr)

Neuer Flow beim Klick auf „Neue Zone":
1. Dialog `ZoneCreatorDialog` entfällt. Stattdessen wird direkt der Zonen-Markier-Modus auf `BodyMap3D` aktiviert (`setRequestedMarkType({ type: "zone", nonce: Date.now() })`). Kurzer Hinweis-Toast: „Stelle auf dem Körper anklicken".
2. Klick auf den Body → Raycaster liefert Position + erkannten Anatomienamen → es entsteht ein **provisorischer, noch nicht gespeicherter Zonen-Pin** an der Klickstelle.
3. Über dem Pin erscheint eine kleine Bestätigungs-Leiste (analog zu bestehendem `mapClickDialog`-Pattern), mit:
   - automatisch übernommenem Anatomienamen als Vorschlag (editierbares Textfeld, klein),
   - Hinweis „Pin per Drag verschieben, dann Speichern",
   - Buttons **Speichern** / **Abbrechen**.
4. Solange nicht gespeichert: Pin ist per Drag auf der 3D-Puppe verschiebbar. Bei jedem Drag-Ende wird Position aktualisiert und — falls die neue Stelle einer anderen Anatomie zugeordnet ist — der Namensvorschlag angepasst (nur solange der Nutzer den Namen nicht manuell überschrieben hat).
5. Erst **Speichern** legt die Zone via bestehender `api.createLocation`-Logik an; **Abbrechen** verwirft den provisorischen Pin ohne API-Call.
6. Klick neben den Körper → kein Pin, kurzer Hinweis „Bitte direkt auf den Körper klicken".

Wiederverwendung vorhandener Bausteine:
- `requestedMarkType` + `mapClickDialog`-Flow + `pendingZoneName` existieren bereits → werden für den neuen Direkt-Flow genutzt.
- Drag-Verschieben des provisorischen Pins: bestehende Pin-Drag-Logik aus `BodyMap3D` für noch-nicht-gespeicherte Marker erweitern (gleicher Raycast-Resolver wie beim Erstklick).
- `ZoneCreatorDialog.tsx` wird ersatzlos entfernt (Datei + Import in `PatientDetail.tsx`).

## Was sich NICHT ändert

- Keine Backend-/DB-Migrationen, keine API-Änderungen.
- Spots-Workflow bleibt unangetastet.
- i18n: nur 2–3 neue Strings (Toast + Speichern/Abbrechen-Labels) in DE/EN/FR/IT/ES.

## Test (Proto)

- Mobile: Zone-Foto → Kamera-Icon öffnet Kamera; Upload-Icon öffnet Galerie.
- Neue Zone → Klick auf z. B. linken Oberarm → provisorischer Pin sitzt am Klickpunkt, Name „Linker Oberarm" vorausgefüllt.
- Pin auf rechten Unterarm ziehen → Name aktualisiert sich auf „Rechter Unterarm" (sofern nicht manuell geändert).
- Speichern → Zone erscheint in Sidebar mit Pin an exakter Position.
- Abbrechen → kein Eintrag, kein Pin.
