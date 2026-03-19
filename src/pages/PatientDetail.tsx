import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { mockApi } from "@/lib/mockData";
import type { FullPatient } from "@/types/patient";
import { useState } from "react";
import { ArrowLeft, MapPin, Plus, Calendar, ImageIcon, User, Hash, Activity, Mail, Phone, Pencil, Trash2, Save, X, Square, GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import BodyMap3D from "@/components/BodyMap3D";
import ImageGallery from "@/components/ImageGallery";
import ImageCompare from "@/components/ImageCompare";
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
  const [mapClickDialog, setMapClickDialog] = useState<{ x: number; y: number; view: "front" | "back"; markType?: "spot" | "region" } | null>(null);
  const [locationName, setLocationName] = useState("");
  const [activeTab, setActiveTab] = useState<"spots" | "timeline">("spots");
  const [newFindingText, setNewFindingText] = useState("");
  const [regionWidth, setRegionWidth] = useState(40);
  const [regionHeight, setRegionHeight] = useState(30);
  const [spotX, setSpotX] = useState(0);
  const [spotY, setSpotY] = useState(0);
  const [editingFindingId, setEditingFindingId] = useState<number | null>(null);
  const [editingFindingText, setEditingFindingText] = useState("");

  const { data: patient, isLoading, error } = useQuery({
    queryKey: ["full-patient", patientId],
    queryFn: () => mockApi.getFullPatient(patientId),
    enabled: !!patientId,
  });

  const createLocationMutation = useMutation({
    mutationFn: (loc: { name?: string; x: number; y: number; view?: "front" | "back"; type?: "spot" | "region"; width?: number; height?: number }) =>
      mockApi.createLocation(patientId, loc),
    onSuccess: (newLoc) => {
      queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] });
      setMapClickDialog(null);
      setLocationName("");
      setSelectedLocationId(newLoc.id);
    },
  });

  const createFindingMutation = useMutation({
    mutationFn: ({ locationId, description }: { locationId: number; description: string }) =>
      mockApi.createFinding(locationId, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] });
      setNewFindingText("");
    },
  });

  const updateFindingMutation = useMutation({
    mutationFn: ({ findingId, description }: { findingId: number; description: string }) =>
      mockApi.updateFinding(findingId, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] });
      setEditingFindingId(null);
      setEditingFindingText("");
    },
  });

  const deleteFindingMutation = useMutation({
    mutationFn: (findingId: number) => mockApi.deleteFinding(findingId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["full-patient", patientId] }),
  });

  const locations = patient?.locations ?? [];
  const selectedLocation = locations.find((l) => l.id === selectedLocationId);
  const totalImages = locations.reduce((sum, l) => sum + (l.images?.length ?? 0), 0);

  const handleMapClick = (x: number, y: number, view: "front" | "back", markType?: "spot" | "region") => setMapClickDialog({ x, y, view, markType });

  const handleCreateLocation = () => {
    if (!mapClickDialog) return;
    createLocationMutation.mutate({
      name: locationName.trim() || undefined,
      x: mapClickDialog.x,
      y: mapClickDialog.y,
      view: mapClickDialog.view,
      type: mapClickDialog.markType || "spot",
      width: mapClickDialog.markType === "region" ? 40 : undefined,
      height: mapClickDialog.markType === "region" ? 30 : undefined,
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
              markers={locations.map((l) => ({ id: l.id, x: l.x, y: l.y, name: l.name, view: l.view, type: l.type, width: l.width, height: l.height, imageCount: l.images?.length ?? 0, findingCount: l.findings?.length ?? 0 }))}
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
              <span className="text-[10px] text-muted-foreground">{locations.filter(l => l.type !== "region").length} Stellen</span>
            </div>
            {locations.filter(l => l.type !== "region").map((loc, i) => (
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

          {/* Regions List */}
          {locations.filter(l => l.type === "region").length > 0 && (
            <div className="mt-4 space-y-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1">
                  <Square className="h-3 w-3 text-amber-500" /> Regionen
                </h3>
                <span className="text-[10px] text-muted-foreground">{locations.filter(l => l.type === "region").length} Bereiche</span>
              </div>
              {locations.filter(l => l.type === "region").map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => setSelectedLocationId(loc.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-all text-xs",
                    selectedLocationId === loc.id
                      ? "bg-amber-500/10 text-amber-700 border border-amber-500/20"
                      : "hover:bg-muted text-foreground border border-transparent"
                  )}
                >
                  <div className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                    selectedLocationId === loc.id
                      ? "bg-amber-500 text-white"
                      : "bg-muted text-muted-foreground"
                  )}>
                    ▭
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{loc.name || "Region"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {loc.images?.length ?? 0} Fotos · {loc.view === "back" ? "Hinten" : "Vorne"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center + Right: Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {activeTab === "timeline" ? (
              <motion.div
                key="timeline"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-2"
              >
                <h2 className="text-lg font-semibold text-foreground mb-4">Chronologischer Verlauf</h2>
                {(() => {
                  // Collect all events from all locations
                  const events: { date: string; type: "image" | "finding" | "location"; label: string; detail?: string; locationName: string; locationId: number; imagePath?: string }[] = [];
                  locations.forEach((loc) => {
                    const locName = loc.name || `Spot #${loc.id}`;
                    // Location creation
                    events.push({ date: loc.created_at ?? "", type: "location", label: "Spot erstellt", detail: locName, locationName: locName, locationId: loc.id });
                    // Images
                    (loc.images ?? []).forEach((img) => {
                      events.push({ date: img.created_at ?? "", type: "image", label: "Bild hochgeladen", locationName: locName, locationId: loc.id, imagePath: img.image_path });
                    });
                    // Findings
                    (loc.findings ?? []).forEach((f) => {
                      events.push({ date: f.created_at ?? "", type: "finding", label: "Befund", detail: f.description, locationName: locName, locationId: loc.id });
                    });
                  });
                  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                  if (events.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <Activity className="h-10 w-10 mb-3" />
                        <p className="text-sm">Noch keine Einträge vorhanden</p>
                      </div>
                    );
                  }

                  return (
                    <div className="relative border-l-2 border-muted ml-4 space-y-4">
                      {events.map((ev, i) => (
                        <div key={i} className="relative pl-6">
                          <div className={cn(
                            "absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-background",
                            ev.type === "image" ? "bg-blue-500" : ev.type === "finding" ? "bg-amber-500" : "bg-primary"
                          )} />
                          <div className="rounded-lg border bg-card p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs">
                                {ev.type === "image" && <ImageIcon className="h-3.5 w-3.5 text-blue-500" />}
                                {ev.type === "finding" && <Activity className="h-3.5 w-3.5 text-amber-500" />}
                                {ev.type === "location" && <MapPin className="h-3.5 w-3.5 text-primary" />}
                                <span className="font-medium text-foreground">{ev.label}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{ev.locationName}</Badge>
                              </div>
                              <span className="text-[10px] text-muted-foreground tabular-nums flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {ev.date ? format(new Date(ev.date), "dd.MM.yyyy HH:mm", { locale: de }) : "–"}
                              </span>
                            </div>
                            {ev.detail && <p className="text-sm text-muted-foreground">{ev.detail}</p>}
                            {ev.imagePath && (
                              <img
                                src={mockApi.getImageUrl(ev.imagePath)}
                                alt="Aufnahme"
                                className="h-24 w-20 rounded object-cover border mt-1"
                                loading="lazy"
                              />
                            )}
                            <button
                              onClick={() => { setActiveTab("spots"); setSelectedLocationId(ev.locationId); }}
                              className="text-[10px] text-primary hover:underline"
                            >
                              → Zum Spot
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </motion.div>
            ) : selectedLocation ? (
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
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center text-sm font-bold",
                      selectedLocation.type === "region"
                        ? "rounded bg-amber-500 text-white"
                        : "rounded-full bg-primary text-primary-foreground"
                    )}>
                      {selectedLocation.type === "region" ? <Square className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        {selectedLocation.name || (selectedLocation.type === "region" ? "Region" : `Spot #${selectedLocation.id}`)}
                        {selectedLocation.type === "region" && (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Region</Badge>
                        )}
                      </h2>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{selectedLocation.view === "back" ? "Rückseite" : "Vorderseite"}</span>
                        <span>·</span>
                        <span>{selectedLocation.images?.length ?? 0} Aufnahmen</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Region: Side-by-Side Compare */}
                {selectedLocation.type === "region" && (selectedLocation.images?.length ?? 0) >= 2 && (
                  <div className="rounded-lg border bg-card p-4 space-y-4">
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <GitCompareArrows className="h-3.5 w-3.5 text-amber-500" />
                      Verlaufsvergleich
                    </h4>
                    {(() => {
                      const sorted = [...(selectedLocation.images ?? [])].sort(
                        (a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
                      );
                      const oldest = sorted[0];
                      const newest = sorted[sorted.length - 1];
                      return (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="relative overflow-hidden rounded-lg border aspect-[4/3] bg-muted">
                                <img
                                  src={mockApi.getImageUrl(oldest.image_path)}
                                  alt="Ältere Aufnahme"
                                  className="h-full w-full object-cover"
                                />
                                <div className="absolute top-2 left-2 rounded-full bg-muted/90 px-2 py-0.5 text-[10px] font-semibold text-foreground backdrop-blur-sm">
                                  ÄLTER
                                </div>
                              </div>
                              <p className="text-center text-xs text-muted-foreground tabular-nums">
                                {oldest.created_at ? format(new Date(oldest.created_at), "dd. MMM yyyy", { locale: de }) : "–"}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <div className="relative overflow-hidden rounded-lg border aspect-[4/3] bg-muted">
                                <img
                                  src={mockApi.getImageUrl(newest.image_path)}
                                  alt="Neuere Aufnahme"
                                  className="h-full w-full object-cover"
                                />
                                <div className="absolute top-2 left-2 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold text-primary-foreground backdrop-blur-sm">
                                  NEUER
                                </div>
                              </div>
                              <p className="text-center text-xs text-muted-foreground tabular-nums">
                                {newest.created_at ? format(new Date(newest.created_at), "dd. MMM yyyy", { locale: de }) : "–"}
                              </p>
                            </div>
                          </div>
                          {oldest.created_at && newest.created_at && (
                            <div className="text-center">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                Zeitraum: {getDaysDiff(oldest.created_at, newest.created_at)}
                              </span>
                            </div>
                          )}
                          {sorted.length > 2 && (
                            <p className="text-center text-[10px] text-muted-foreground">
                              {sorted.length} Aufnahmen insgesamt · Alle Fotos unten in der Galerie
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Findings */}
                <div className="rounded-lg border bg-card p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Befunde</h4>

                  {/* Existing findings */}
                  {selectedLocation.findings && selectedLocation.findings.map((f) => (
                    <div key={f.id} className="flex items-start gap-2 rounded-md bg-muted/50 p-3">
                      <Activity className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      {editingFindingId === f.id ? (
                        <div className="flex-1 space-y-2">
                          <Textarea
                            value={editingFindingText}
                            onChange={(e) => setEditingFindingText(e.target.value)}
                            rows={2}
                            className="text-sm"
                          />
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="default" onClick={() => updateFindingMutation.mutate({ findingId: f.id, description: editingFindingText })} disabled={updateFindingMutation.isPending}>
                              <Save className="mr-1 h-3 w-3" /> Speichern
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingFindingId(null); setEditingFindingText(""); }}>
                              <X className="mr-1 h-3 w-3" /> Abbrechen
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-start justify-between">
                          <p className="text-sm text-foreground">{f.description || "–"}</p>
                          <div className="flex gap-1 shrink-0 ml-2">
                            <button onClick={() => { setEditingFindingId(f.id); setEditingFindingText(f.description || ""); }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => deleteFindingMutation.mutate(f.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add new finding */}
                  <div className="space-y-2 pt-2 border-t">
                    <Textarea
                      placeholder="Neuen Befund eingeben…"
                      value={newFindingText}
                      onChange={(e) => setNewFindingText(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                    <Button
                      size="sm"
                      disabled={!newFindingText.trim() || createFindingMutation.isPending}
                      onClick={() => createFindingMutation.mutate({ locationId: selectedLocation.id, description: newFindingText.trim() })}
                    >
                      <Plus className="mr-1 h-3 w-3" /> Befund hinzufügen
                    </Button>
                  </div>
                </div>

                {/* Image Gallery */}
                <ImageGallery
                  locationId={selectedLocation.id}
                  patientId={patientId}
                  images={selectedLocation.images ?? []}
                  locationName={selectedLocation.name || (selectedLocation.type === "region" ? "Region" : `Spot #${selectedLocation.id}`)}
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
              {mapClickDialog?.markType === "region" ? (
                <><Square className="h-5 w-5 text-amber-500" /> Neue Region markieren</>
              ) : (
                <><Plus className="h-5 w-5 text-primary" /> Neuen Spot markieren</>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4 rounded-md bg-muted p-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                {mapClickDialog?.markType === "region" ? <Square className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                <span className="font-mono text-xs">x:{mapClickDialog?.x} y:{mapClickDialog?.y}</span>
              </div>
              <Badge variant="outline">{mapClickDialog?.view === "back" ? "Rückseite" : "Vorderseite"}</Badge>
              {mapClickDialog?.markType === "region" && (
                <Badge variant="outline" className="text-amber-600 border-amber-300">Region</Badge>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="locName">Bezeichnung</Label>
              <Input
                id="locName"
                placeholder={mapClickDialog?.markType === "region" ? "z.B. Oberer Rücken, Brust, Bauch..." : "z.B. Linker Unterarm, Rücken oben..."}
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={handleCreateLocation} disabled={createLocationMutation.isPending}>
              {createLocationMutation.isPending ? "Wird erstellt…" : mapClickDialog?.markType === "region" ? "Region anlegen" : "Spot anlegen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function getDaysDiff(dateA: string, dateB: string): string {
  const a = new Date(dateA);
  const b = new Date(dateB);
  const diffMs = Math.abs(b.getTime() - a.getTime());
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "Gleicher Tag";
  if (days < 30) return `${days} Tage`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} Monat${months > 1 ? "e" : ""}`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  return remMonths > 0 ? `${years} Jahr${years > 1 ? "e" : ""}, ${remMonths} Mon.` : `${years} Jahr${years > 1 ? "e" : ""}`;
}

export default PatientDetail;
