

# Foto-Löschfunktion mit Bestätigungsdialog

## Übersicht
Jedes Bild in der ImageGallery bekommt einen Lösch-Button (Trash-Icon). Beim Klick öffnet sich ein AlertDialog zur Bestätigung, erst dann wird das Bild gelöscht.

## Änderungen

### `src/components/ImageGallery.tsx`
- State `deleteTarget` (number | null) für die zu löschende Bild-ID
- `deleteMutation` mit `api.deleteImage()` — bei Erfolg Query invalidieren + Toast
- Trash-Icon-Button bei jedem Bild (oben rechts positioniert)
- AlertDialog mit "Bild wirklich löschen?" Bestätigung (Abbrechen / Löschen)
- Imports: `Trash2` von lucide, `AlertDialog`-Komponenten

Keine weiteren Dateien betroffen — `api.deleteImage` existiert bereits.

