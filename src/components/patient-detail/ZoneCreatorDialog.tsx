import { useMemo, useState } from "react";
import { Camera, X, Check, ChevronsUpDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ANATOMICAL_ZONES } from "@/lib/anatomyLookup";
import { translateAnatomyName } from "@/lib/anatomyTranslation";
import { getZoneAnchorFromName } from "@/lib/zoneAnchorLookup";
import { cn } from "@/lib/utils";
import type { Gender } from "@/types/patient";

interface ZoneCreatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gender: Gender;
  /** Called when the user has picked a body part. The parent should then
   *  activate placement mode on the 3D body so the user can click the exact spot. */
  onPick: (zoneName: string) => void;
  isCreating?: boolean;
}


/** Anatomical groups — clinical mental model (top → bottom). */
const ZONE_GROUPS: { label: string; zones: string[] }[] = [
  {
    label: "Kopf & Gesicht",
    zones: [
      "Stirn", "Linke Augenbraue", "Rechte Augenbraue",
      "Linke Augenregion", "Rechte Augenregion", "Nasenwurzel",
      "Nase", "Linke Wange", "Rechte Wange",
      "Mund", "Kinn", "Linkes Ohr", "Rechtes Ohr",
      "Hinterkopf", "Hinterkopf (unterer)",
    ],
  },
  { label: "Hals & Nacken", zones: ["Hals", "Nacken"] },
  {
    label: "Schultern",
    zones: [
      "Linke Schulter", "Rechte Schulter",
      "Linke Schulter (dorsal)", "Rechte Schulter (dorsal)",
    ],
  },
  {
    label: "Brust & Rücken",
    zones: [
      "Obere Brust", "Brust", "Bauch", "Unterbauch",
      "Oberer Rücken", "Mittlerer Rücken", "Unterer Rücken",
    ],
  },
  {
    label: "Becken & Gesäß",
    zones: [
      "Linke Hüfte", "Rechte Hüfte",
      "Gesäß", "Linke Gesäßhälfte", "Rechte Gesäßhälfte",
    ],
  },
  {
    label: "Arme & Hände",
    zones: [
      "Linker Oberarm", "Rechter Oberarm",
      "Linker Unterarm", "Rechter Unterarm",
      "Linke Hand", "Rechte Hand",
    ],
  },
  {
    label: "Beine & Füße",
    zones: [
      "Linker Oberschenkel", "Rechter Oberschenkel",
      "Linker Oberschenkel (distal)", "Rechter Oberschenkel (distal)",
      "Linker Oberschenkel (dorsal)", "Rechter Oberschenkel (dorsal)",
      "Linkes Knie", "Rechtes Knie",
      "Linke Kniekehle", "Rechte Kniekehle",
      "Linker Unterschenkel", "Rechter Unterschenkel",
      "Linke Wade", "Rechte Wade",
      "Linker Fuß", "Rechter Fuß",
      "Linke Ferse", "Rechte Ferse",
    ],
  },
];

const ZoneCreatorDialog = ({ open, onOpenChange, gender, onPick, isCreating }: ZoneCreatorDialogProps) => {
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [popoverOpen, setPopoverOpen] = useState(false);

  const groups = useMemo(() => {
    return ZONE_GROUPS.map(g => ({
      label: g.label,
      items: g.zones
        .filter(z => ANATOMICAL_ZONES.includes(z as typeof ANATOMICAL_ZONES[number]))
        .map(z => ({
          value: z,
          label: translateAnatomyName(z),
          anchor: getZoneAnchorFromName(z, gender),
        })),
    })).filter(g => g.items.length > 0);
  }, [gender]);

  const anchor = selectedZone ? getZoneAnchorFromName(selectedZone, gender) : null;
  const selectedLabel = selectedZone ? translateAnatomyName(selectedZone) : "";

  const handleConfirm = () => {
    if (!selectedZone) return;
    onPick(selectedZone);
    setSelectedZone("");
  };

  const handleCancel = () => {
    setSelectedZone("");
    onOpenChange(false);
  };


  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setSelectedZone(""); onOpenChange(o); }}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4 text-blue-500" />
            Neue Zone anlegen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Welcher Körperteil?</Label>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen} modal={true}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={popoverOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedLabel || "– Körperteil suchen oder wählen –"}
                  <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
              >
                <Command>
                  <CommandInput placeholder="Körperteil suchen…" autoFocus />
                  <CommandList
                    className="max-h-[min(60vh,320px)] overflow-y-auto overscroll-contain"
                    style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
                  >
                    <CommandEmpty>Nichts gefunden.</CommandEmpty>
                    {groups.map(group => (
                      <CommandGroup key={group.label} heading={group.label}>
                        {group.items.map(item => (
                          <CommandItem
                            key={item.value}
                            value={`${item.label} ${item.value}`}
                            onSelect={() => {
                              setSelectedZone(item.value);
                              setPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedZone === item.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {item.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
