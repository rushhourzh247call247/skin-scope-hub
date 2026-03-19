import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { mockApi } from "@/lib/mockData";
import type { FullPatient } from "@/types/patient";
import { useState } from "react";
import { ArrowLeft, MapPin, Plus, Calendar, ImageIcon, User, Hash, Activity, Mail, Phone, Pencil, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import BodyMap3D from "@/components/BodyMap3D";
import ImageGallery from "@/components/ImageGallery";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const PatientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const patientId = Number(id);

  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [mapClickDialog, setMapClickDialog] = useState<{ x: number; y: number; view: "front" | "back" } | null>(null);
  const [locationName, setLocationName] = useState("");
  const [activeTab, setActiveTab] = useState<"spots" | "timeline">("spots");
  const [newFindingText, setNewFindingText] = useState("");
  const [editingFindingId, setEditingFindingId] = useState<number | null>(null);
  const [editingFindingText, setEditingFindingText] = useState("");

  const { data: patient, isLoading, error } = useQuery({
    queryKey: ["full-patient", patientId],
    queryFn: () => mockApi.getFullPatient(patientId),
    enabled: !!patientId,
  });

  const createLocationMutation = useMutation({
    mutationFn: (loc: { name?: string; x: number; y: number; view?: "front" | "back" }) =>
      mockApi.createLocation(patientId, loc),
    onSuccess: (newLoc) => {
      queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] });
      setMapClickDialog(null);
      setLocationName("");
      setSelectedLocationId(newLoc.id);
    },
  });

  const locations = patient?.locations ?? [];
  const selectedLocation = locations.find((l) => l.id === selectedLocationId);
  const totalImages = locations.reduce((sum, l) => sum + (l.images?.length ?? 0), 0);

  const handleMapClick = (x: number, y: number, view: "front" | "back") => setMapClickDialog({ x, y, view });

  const handleCreateLocation = () => {
    if (!mapClickDialog) return;
    createLocationMutation.mutate({
      name: locationName.trim() || undefined,
      x: mapClickDialog.x,
      y: mapClickDialog.y,
      view: mapClickDialog.view,
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-destructive">Patient konnte nicht geladen werden.</p>
        <Button variant="outline" onClick={() => navigate("/patients")}>Zurück zur Liste</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Patient Header Bar - DermEngine style */}
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/patients")} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Zurück
          </Button>

          <div className="h-6 w-px bg-border" />

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {patient.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-foreground">{patient.name}</h1>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">Aktiv</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Patient</p>
            </div>
          </div>

          <div className="h-6 w-px bg-border" />

          <div className="flex items-center gap-6 text-xs">
            <div>
              <span className="text-muted-foreground">ID</span>
              <p className="font-mono font-medium text-foreground">{patient.id}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Geschlecht</span>
              <p className="font-medium text-foreground">{patient.gender === "female" ? "Weiblich" : "Männlich"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Geburtsdatum</span>
              <p className="font-medium text-foreground tabular-nums">
                {patient.birth_date ? format(new Date(patient.birth_date), "dd.MM.yyyy", { locale: de }) : "–"}
              </p>
            </div>
            {patient.email && (
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <p className="font-medium text-foreground">{patient.email}</p>
              </div>
            )}
            {patient.phone && (
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <p className="font-medium text-foreground">{patient.phone}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Stellen</span>
              <p className="font-medium text-foreground">{locations.length}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Aufnahmen</span>
              <p className="font-medium text-foreground">{totalImages}</p>
            </div>
          </div>

          {/* Mode tabs */}
          <div className="ml-auto flex items-center gap-1 rounded-lg bg-muted p-1">
            <button
              onClick={() => setActiveTab("spots")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                activeTab === "spots"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MapPin className="h-3.5 w-3.5" /> SPOTS
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                activeTab === "timeline"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Activity className="h-3.5 w-3.5" /> TIMELINE
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Body Map */}
        <div className="w-[300px] shrink-0 border-r bg-card p-3 overflow-y-auto flex flex-col">
          <div className="h-[350px]">
            <BodyMap3D
              markers={locations.map((l) => ({ id: l.id, x: l.x, y: l.y, name: l.name, view: l.view }))}
              gender={patient.gender}
              onMapClick={handleMapClick}
              selectedLocationId={selectedLocationId}
              onMarkerClick={(id) => setSelectedLocationId(id)}
            />
          </div>

          {/* Spots List */}
          <div className="mt-4 space-y-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Spots</h3>
              <span className="text-[10px] text-muted-foreground">{locations.length} Stellen</span>
            </div>
            {locations.map((loc, i) => (
              <button
                key={loc.id}
                onClick={() => setSelectedLocationId(loc.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-all text-xs",
                  selectedLocationId === loc.id
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "hover:bg-muted text-foreground border border-transparent"
                )}
              >
                <div className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  selectedLocationId === loc.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}>
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{loc.name || `Spot ${i + 1}`}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {loc.images?.length ?? 0} Bilder · {loc.view === "back" ? "Hinten" : "Vorne"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Center + Right: Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {selectedLocation ? (
              <motion.div
                key={selectedLocation.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* Location Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        {selectedLocation.name || `Spot #${selectedLocation.id}`}
                      </h2>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{selectedLocation.view === "back" ? "Rückseite" : "Vorderseite"}</span>
                        <span>·</span>
                        <span className="font-mono">x:{selectedLocation.x} y:{selectedLocation.y}</span>
                        <span>·</span>
                        <span>{selectedLocation.images?.length ?? 0} Aufnahmen</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Findings */}
                {selectedLocation.findings && selectedLocation.findings.length > 0 && (
                  <div className="rounded-lg border bg-card p-4 space-y-2">
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Befunde</h4>
                    {selectedLocation.findings.map((f) => (
                      <div key={f.id} className="flex items-start gap-2 rounded-md bg-muted/50 p-3">
                        <Activity className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                        <div>
                          <p className="text-sm text-foreground">{f.description}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {f.created_at ? format(new Date(f.created_at), "dd.MM.yyyy", { locale: de }) : "–"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Image Gallery */}
                <ImageGallery
                  locationId={selectedLocation.id}
                  patientId={patientId}
                  images={selectedLocation.images ?? []}
                  locationName={selectedLocation.name || `Spot #${selectedLocation.id}`}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full text-muted-foreground"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <MapPin className="h-8 w-8" />
                </div>
                <p className="text-sm font-medium">Wählen Sie eine Körperstelle aus</p>
                <p className="text-xs mt-1">oder klicken Sie auf die Body Map, um eine neue Stelle zu markieren</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* New Location Dialog */}
      <Dialog open={!!mapClickDialog} onOpenChange={(o) => !o && setMapClickDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Neuen Spot markieren
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4 rounded-md bg-muted p-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="font-mono text-xs">x:{mapClickDialog?.x} y:{mapClickDialog?.y}</span>
              </div>
              <Badge variant="outline">{mapClickDialog?.view === "back" ? "Rückseite" : "Vorderseite"}</Badge>
            </div>
            <div className="space-y-2">
              <Label htmlFor="locName">Bezeichnung</Label>
              <Input id="locName" placeholder="z.B. Linker Unterarm, Rücken oben..." value={locationName} onChange={(e) => setLocationName(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleCreateLocation} disabled={createLocationMutation.isPending}>
              {createLocationMutation.isPending ? "Wird erstellt…" : "Spot anlegen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientDetail;
