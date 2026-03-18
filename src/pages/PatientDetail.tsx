import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import type { FullPatient, Location } from "@/types/patient";
import { useState } from "react";
import { ArrowLeft, MapPin, Calendar, Hash, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import BodyMapSvg from "@/components/BodyMapSvg";
import ImageGallery from "@/components/ImageGallery";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnimatePresence, motion } from "framer-motion";

const PatientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const patientId = Number(id);

  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [mapClickDialog, setMapClickDialog] = useState<{ x: number; y: number } | null>(null);
  const [locationName, setLocationName] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["full-patient", patientId],
    queryFn: () => api.getFullPatient(patientId),
    enabled: !!patientId,
  });

  const createLocationMutation = useMutation({
    mutationFn: (loc: { name?: string; x: number; y: number }) =>
      api.createLocation(patientId, loc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] });
      setMapClickDialog(null);
      setLocationName("");
    },
  });

  const patient: FullPatient | undefined = data?.data ?? data;
  const locations = patient?.locations ?? [];
  const selectedLocation = locations.find((l) => l.id === selectedLocationId);

  const handleMapClick = (x: number, y: number) => {
    setMapClickDialog({ x, y });
  };

  const handleCreateLocation = () => {
    if (!mapClickDialog) return;
    createLocationMutation.mutate({
      name: locationName.trim() || undefined,
      x: mapClickDialog.x,
      y: mapClickDialog.y,
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-sm text-destructive">Patient konnte nicht geladen werden.</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          Zurück zur Liste
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-sm font-medium text-secondary-foreground">
              {patient.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">
                {patient.name}
              </h1>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">ID: #{patient.id}</span>
                <span>•</span>
                <span className="tabular-nums">
                  Geb. {patient.birth_date
                    ? format(new Date(patient.birth_date), "dd. MMM yyyy", { locale: de })
                    : "–"}
                </span>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px_1fr]">
          {/* Locations list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground">
                Körperstellen ({locations.length})
              </h3>
            </div>

            <div className="space-y-1.5">
              {locations.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Klicken Sie auf die Body Map, um eine Stelle zu markieren.
                </p>
              ) : (
                locations.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => setSelectedLocationId(loc.id)}
                    className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors duration-150 ${
                      selectedLocationId === loc.id
                        ? "border-primary/30 bg-primary/5 ring-1 ring-primary/20"
                        : "border-border bg-card hover:bg-clinical-hover"
                    }`}
                  >
                    <MapPin className={`h-4 w-4 shrink-0 ${
                      selectedLocationId === loc.id ? "text-primary" : "text-muted-foreground"
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {loc.name || `Stelle #${loc.id}`}
                      </p>
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">
                          x:{loc.x} y:{loc.y}
                        </span>
                        <span>•</span>
                        <span>{loc.images?.length ?? 0} Bilder</span>
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Body Map */}
          <div className="space-y-3">
            <h3 className="text-center text-sm font-medium text-foreground">
              Body Map
            </h3>
            <div className="rounded-md border bg-card p-4">
              <BodyMapSvg
                markers={locations.map((l) => ({
                  id: l.id,
                  x: l.x,
                  y: l.y,
                  name: l.name,
                }))}
                onMapClick={handleMapClick}
                selectedLocationId={selectedLocationId}
              />
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Klicken Sie auf den Körper, um eine neue Stelle zu markieren
            </p>
          </div>

          {/* Image Gallery */}
          <div>
            <AnimatePresence mode="wait">
              {selectedLocation ? (
                <motion.div
                  key={selectedLocation.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="mb-4 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-medium text-foreground">
                      {selectedLocation.name || `Stelle #${selectedLocation.id}`}
                    </h3>
                  </div>
                  <ImageGallery
                    locationId={selectedLocation.id}
                    patientId={patientId}
                    images={selectedLocation.images ?? []}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20 text-muted-foreground"
                >
                  <MapPin className="mb-2 h-8 w-8" />
                  <p className="text-sm">Wählen Sie eine Körperstelle aus</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* New Location Dialog */}
      <Dialog open={!!mapClickDialog} onOpenChange={(o) => !o && setMapClickDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Körperstelle markieren</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              Position: <span className="font-mono">x:{mapClickDialog?.x} y:{mapClickDialog?.y}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="locName">Bezeichnung (optional)</Label>
              <Input
                id="locName"
                placeholder="z.B. Linker Unterarm"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleCreateLocation}
              disabled={createLocationMutation.isPending}
            >
              {createLocationMutation.isPending ? "Wird erstellt…" : "Stelle anlegen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientDetail;
