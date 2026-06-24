
# DERM247 Mobile-Webapp nach FotoFinder-Prinzip
**Klinisches Foto → Marker → Dermatoskopie → später: Vergleich**

Neuer Workflow, parallel zur bestehenden App, isoliert unter `/m`. Bestehende Mobile- und Desktop-Version unverändert. Capacitor-tauglich für spätere iOS/Android-App.

## Harte Leitplanken (nicht verhandelbar)

1. **Bestehende Version schützen.** Kein Refactoring von Patienten-, Locations-, Image- oder Bodymap-Ansichten. Neue Routen, neue Komponenten, neue Navigation.
2. **Test- und Entwicklungsumgebung:** ausschliesslich **`https://proto.derm247.ch`** (Frontend) gegen **`https://dev.derm247.ch`** (Proto-API). Live (`app.derm247.ch`/`api.derm247.ch`) bleibt unberührt.
3. **Keine FotoFinder-Kopie.** Workflow ja, Designs/Texte/Grafiken/Marken nein. DERM247 behält eigenständige Optik (Clinical Teal, Space Grotesk, dunkles Theme neu interpretiert).
4. **Speed-First.** Minimale Klicks, minimale Dialoge, minimale Eingabefelder, möglichst nie tippen müssen.
5. **Mobile First, Capacitor-tauglich.** Kamera/Storage/Sensoren über dünne Wrapper, später 1:1 gegen `@capacitor/*` austauschbar.
6. **Multi-Tenancy unverändert.** Jede Query trägt `company_id`. RBAC identisch.

## Architektur-Entscheidungen rund um den Marker (kritisch)

### A. Ein Marker behält seine Identität – für immer

Ein Marker = eine reale Hautläsion, kein Punkt auf einem Bild.

- `lesion.id` (UUID) ist dauerhaft. Verlauf, Befunde, ABCDE, KI, Bilder hängen immer an dieser ID.
- **Verschieben ändert nur `x_pct/y_pct`, niemals die ID.**
- **Keine automatische Neunummerierung.** L5 bleibt L5, auch wenn vorher/nachher Marker entstehen oder gelöscht werden.
- `label` wird beim Anlegen einmal vergeben (`max(label) + 1` pro Patient) und danach nie automatisch verändert. Manuelles Umbenennen durch den Arzt ist erlaubt (mit Hinweis), ändert die ID aber nicht.
- Gelöschter Marker = `deleted_at` gesetzt (Soft-Delete). Label-Nummer wird **nicht** wiederverwendet.

### B. Historie von Tag 1 vorbereitet – ohne sofort Aufwand zu treiben

Datenmodell wird so gewählt, dass eine Historie später additiv ergänzt werden kann – ohne Migration der bestehenden Daten.

- Auf `lesions` und `lesion_assets`: `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`, `deleted_by`.
- Reservierte (noch leere) Tabelle `lesion_events` als Hülle vorbereitet:
  ```text
  lesion_events
    id, lesion_id, event_type ('created'|'moved'|'relabeled'|'deleted'|'restored'),
    payload_json (z. B. {from:{x,y}, to:{x,y}}),
    actor_user_id, created_at
  ```
  In Stufe 1 wird in dieser Tabelle nur das `created`-Event geschrieben (1 Insert pro Marker). Damit ist die Pipeline live, ohne dass die UI heute schon eine Verlaufsansicht braucht.

### C. Vergleichsmodus als künftiges Kernfeature mitgedacht

Das eigentliche DERM247-Kernfeature wird der **Vergleich**, nicht die Aufnahme. Deshalb wird schon jetzt die Struktur so gelegt, dass „Aufnahme A ↔ Aufnahme B" und ein Zeitstrahl ohne Umbau eingehängt werden können.

- `lesion_assets` haben `taken_at` + `sort_order` + `kind` → reichen für Erst-/Folgeaufnahme, Zeitstrahl und Pair-Auswahl.
- Routen-Reserve im `/m`-Segment:
  ```text
  /m/lesions/:id                  Detail (Stufe 1)
  /m/lesions/:id/compare          Vergleich (Stufe 2, Route existiert leer)
  /m/lesions/:id/timeline         Zeitstrahl (Stufe 2)
  ```
- `LesionDetailScreen` rendert die Asset-Galerie über eine eigene `<LesionAssetGrid />`-Komponente. Diese Komponente bekommt in Stufe 2 einen Modus „selectable" für die Auswahl von A/B – ohne dass die Navigation oder das Datenmodell verändert werden müssen.
- API-Reserve: spätere Endpoints `GET /api/m/lesions/{id}/timeline` und `GET /api/m/lesions/{id}/compare?a=…&b=…` sind im Controller-Stub erwähnt, aber noch nicht implementiert.

## Datenmodell

```text
clinical_photos
  id, company_id, patient_id, file_path,
  body_region (frei, optional), taken_at,
  created_by, created_at, updated_at, deleted_at

lesions                          -- Herzstück, ID dauerhaft
  id (uuid), company_id, patient_id, clinical_photo_id,
  label (initial L1, L2 …; danach nie auto-renumeriert),
  x_pct, y_pct,                  -- prozentual, responsive
  notes,
  created_at, created_by,
  updated_at, updated_by,
  deleted_at, deleted_by

lesion_assets                    -- ein Eintrag = Bild ODER Befund
  id, lesion_id,
  kind  ('clinical' | 'dermoscopy' | 'finding' | 'abcde' | 'ai'),
  file_path (nullable),
  payload_json (nullable),       -- ABCDE-Score, KI-Resultat, Text …
  taken_at, sort_order,
  created_at, created_by,
  updated_at, updated_by,
  deleted_at, deleted_by

lesion_events                    -- Historie-Hülle (in Stufe 1 nur 'created')
  id, lesion_id, event_type, payload_json, actor_user_id, created_at
```

Indizes: `(company_id, patient_id)`, `(patient_id, label)`, `(lesion_id, sort_order)`, `(lesion_id, created_at)`. Bilder werden weiter über `/api/image/{filename}` inkl. Tenant-Check ausgeliefert.

## API (Laravel, additiv, Sanctum/RBAC wie heute)

```text
GET    /api/m/patients/{id}/clinical-photos
POST   /api/m/patients/{id}/clinical-photos           (multipart)
GET    /api/m/clinical-photos/{id}
DELETE /api/m/clinical-photos/{id}

POST   /api/m/clinical-photos/{id}/lesions            { x_pct, y_pct }
GET    /api/m/lesions/{id}
PATCH  /api/m/lesions/{id}                            { x_pct?, y_pct?, label?, notes? }
DELETE /api/m/lesions/{id}                            (soft-delete, Label bleibt belegt)

POST   /api/m/lesions/{id}/assets                     (multipart, kind=…)
PATCH  /api/m/lesion-assets/{id}
DELETE /api/m/lesion-assets/{id}

# reserviert, noch nicht implementiert:
# GET  /api/m/lesions/{id}/timeline
# GET  /api/m/lesions/{id}/compare?a=…&b=…
```

Prefix `/api/m/` verhindert Kollisionen. Deploy nur auf Proto-Backend.

## Frontend – isolierte Mobile-App unter `/m`

- **Routen-Segment:** `/m/...` innerhalb der bestehenden SPA. Aufruf: `https://proto.derm247.ch/m/patients`.
- **Kein Eingriff** in `AppLayout`, `AppSidebar`, `PatientDetail.tsx`, `BodyMap3D.tsx`, `MobileBottomNav.tsx`.
- **Neue Komponenten** unter `src/mobile/`:
  - `MobileShell` – dunkles App-Theme, Safe-Area, Bottom-Tabs.
  - `PatientListScreen` – Suche, FAB „+ Patient", Cards.
  - `PatientHomeScreen` – Tabs **Alle / Klinische / Läsion**, FAB **„📷 Neu"**.
  - `ClinicalCaptureScreen` – `useCamera()`-Wrapper, Vorschau, Speichern/Erneut.
  - `MarkerEditorScreen` – Foto vollflächig, Tap = neuer Marker, Drag = nur Position ändern (ID bleibt), Long-Press = soft-delete, Label automatisch hochlaufend, manuell überschreibbar.
  - `LesionDetailScreen` – nutzt `<LesionAssetGrid />` (vergleichsfähig vorbereitet), Buttons „📷 Dermatoskopie" und „📷 Folgeaufnahme".
  - `BodyMapMini` – grobe Orientierung, nicht zentral.
- **Hardware-Wrapper** (Capacitor-ready):
  - `src/mobile/native/camera.ts` – `takePhoto()`
  - `src/mobile/native/storage.ts` – Upload-Queue (IndexedDB)
  - `src/mobile/native/haptics.ts` – No-op heute, Capacitor später
- **i18n** über bestehendes System (DE/EN/FR/IT/ES), keine hardcodierten Strings.

## PWA – Home-Screen-Install (kein Service-Worker)

Manifest + Icons + Theme-Color + `apple-touch-icon`, Scope `/m/`. Kein Offline-Caching in dieser Stufe.

## Hosting

- Keine neue Subdomain. Alles auf `proto.derm247.ch`.
- API → `https://dev.derm247.ch/api/...`.
- Live (`app.derm247.ch` / `api.derm247.ch`) bleibt vollständig unberührt.

## Bewusst NICHT in dieser Stufe

- Keine Capacitor-Builds (Stufe 2).
- Keine KI-Analyse, kein Vergleichs-UI, keine Verlaufs-UI – aber Datenmodell + Routen-Reserve dafür vorbereitet.
- Keine Migration alter Spots in das neue Marker-Modell.
- Keine Berührung von Berichten, PDF, Finanzen, Admin, Snapshots, Verträgen.
- Kein Refactoring der bestehenden Mobile-Bottom-Nav, Zonen-Logik oder 3D-Bodymap.

## Lieferung in 4 Schritten

Jeweils auf `proto.derm247.ch/m` gegen `dev.derm247.ch` selbst getestet, **dann** Freigabe abwarten.

1. **Backend (Proto)** – Migrations für `clinical_photos`, `lesions`, `lesion_assets`, `lesion_events` (Hülle); Models + Policies + Controller; `/api/m/*`-Routen; UUID-IDs für `lesions`; Soft-Delete; `created`-Event-Insert.
2. **Mobile-Shell + Patient-Home** – `/m`-Routen, dunkles Theme, Patientenliste, drei Tabs, FAB „Neu".
3. **Capture-Flow (Kernstück)** – Klinisches Foto → Marker setzen/verschieben (ID-stabil) → Lesion-Detail mit `<LesionAssetGrid />` → Dermatoskopie/Folgeaufnahme. Upload-Queue. Hardware-Wrapper.
4. **Feinschliff** – PWA-Manifest + Icons (Scope `/m/`), i18n, leere Zustände, Bildkompression vor Upload, optionale Mini-Bodymap, Routen-Stubs `/compare` und `/timeline` (404-frei, „bald verfügbar").

Nach jedem Schritt: kurzer Selbsttest-Bericht mit Screenshots aus dem Mobile-Viewport, dann auf Freigabe warten. Live-Server in allen Schritten unangetastet.
