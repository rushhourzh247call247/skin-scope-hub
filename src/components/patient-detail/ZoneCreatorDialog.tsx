import { useMemo, useState } from "react";
import { Camera, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ANATOMICAL_ZONES } from "@/lib/anatomyLookup";
import { translateAnatomyName } from "@/lib/anatomyTranslation";
import { getZoneAnchorFromName } from "@/lib/zoneAnchorLookup";
import type { Gender } from "@/types/patient";

interface ZoneCreatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gender: Gender;
  onCreate: (data: {
    name: string;
    x: number;
    y: number;
    view: "front" | "back";
    x3d: number;
    y3d: number;
    z3d: number;
  }) => void;
  isCreating?: boolean;
}

/**
 * Two-step creator for a new zone (overview photo region):
 *   1. Pick body part from dropdown
 *   2. Confirm — backend coords resolved automatically from calibration data
 *
 * Replaces the older "click on the 3D body" workflow for zones.
 */
const ZoneCreatorDialog = ({ open, onOpenChange, gender, onCreate, isCreating }: ZoneCreatorDialogProps) => {
  const [selectedZone, setSelectedZone] = useState<string>("");

  const zones = useMemo(() => {
    return ANATOMICAL_ZONES.map(z => ({
      value: z,
      label: translateAnatomyName(z),
      anchor: getZoneAnchorFromName(z, gender),
    })).filter(z => z.anchor !== null);
  }, [gender]);

  const anchor = selectedZone ? getZoneAnchorFromName(selectedZone, gender) : null;

  const handleConfirm = () => {
    if (!selectedZone || !anchor) return;
    onCreate({
      name: selectedZone,
      x: anchor.x,
      y: anchor.y,
      view: anchor.view,
      x3d: anchor.x3d,
      y3d: anchor.y3d,
      z3d: anchor.z3d,
    });
    setSelectedZone("");
  };

  const handleCancel = () => {
    setSelectedZone("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setSelectedZone(""); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4 text-blue-500" />
            Neue Zone anlegen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              Welcher Körperteil?
            </Label>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              autoFocus
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">– Körperteil auswählen –</option>
              {zones.map(z => (
                <option key={z.value} value={z.value}>{z.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">
              Die Zone wird automatisch an der passenden Stelle auf dem Body markiert.
              Anschliessend können Sie ein Foto hochladen und Pins setzen — diese erscheinen automatisch auf dem 3D-Body.
            </p>
          </div>

          {anchor && (
            <div className="rounded-md border border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20 p-2 text-[11px] text-blue-900 dark:text-blue-200">
              Position: <strong>{anchor.view === "front" ? "Vorderseite" : "Rückseite"}</strong>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={handleCancel} disabled={isCreating}>
              <X className="h-3.5 w-3.5 mr-1" /> Abbrechen
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              disabled={!selectedZone || !anchor || isCreating}
            >
              <Camera className="h-3.5 w-3.5 mr-1" /> Zone anlegen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ZoneCreatorDialog;
