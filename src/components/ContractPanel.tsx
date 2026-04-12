import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Upload,
  Download,
  Edit,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Undo2,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

const PACKAGES = [
  { id: "single", label: "Einzellizenz", price: 80, desc: "1 Arzt" },
  { id: "small", label: "1–5 Ärzte", price: 350, desc: "bis 5 Ärzte" },
  { id: "medium", label: "6–10 Ärzte", price: 650, desc: "bis 10 Ärzte" },
  { id: "unlimited", label: "Unbegrenzt", price: 1200, desc: "unbegrenzt" },
];

function generateContractNumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0");
  return `V-${year}-${seq}`;
}

function addMonths(date: string, months: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "–";
  return new Date(dateStr).toLocaleDateString("de-CH");
}

function formatPrice(price: number | string): string {
  const n = typeof price === "string" ? parseFloat(price) : price;
  return `CHF ${n.toLocaleString("de-CH", { minimumFractionDigits: 0 })}.-`;
}

interface ContractPanelProps {
  companyId: number;
  companyName: string;
}

type ContractFormData = {
  contract_number: string;
  package_id: string;
  licenses: number;
  start_date: string;
  customer_name: string;
  customer_address: string;
  notes: string;
};

export default function ContractPanel({ companyId, companyName }: ContractPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [terminatedBy, setTerminatedBy] = useState<"client" | "provider">("client");
  const [editingContract, setEditingContract] = useState<any>(null);
  const [uploadContractId, setUploadContractId] = useState<number | null>(null);

  const [form, setForm] = useState<ContractFormData>({
    contract_number: generateContractNumber(),
    package_id: "",
    licenses: 1,
    start_date: new Date().toISOString().slice(0, 10),
    customer_name: companyName,
    customer_address: "",
    notes: "",
  });

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["contracts", companyId],
    queryFn: () => api.getContracts(companyId),
  });

  const activeContract = contracts.find((c: any) => c.status === "active" || c.status === "terminated");
  const pastContracts = contracts.filter((c: any) => c.status === "expired");

  const createMutation = useMutation({
    mutationFn: (data: any) => api.createContract(companyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts", companyId] });
      toast.success("Vertrag erstellt");
      setCreateOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Fehler beim Erstellen"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.updateContract(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts", companyId] });
      toast.success("Vertrag aktualisiert");
      setEditOpen(false);
      setEditingContract(null);
    },
    onError: (err: any) => toast.error(err.message || "Fehler beim Aktualisieren"),
  });

  const terminateMutation = useMutation({
    mutationFn: ({ id, by }: { id: number; by: "client" | "provider" }) => api.terminateContract(id, by),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts", companyId] });
      toast.success("Kündigung eingetragen");
      setTerminateOpen(false);
    },
  });

  const cancelTerminationMutation = useMutation({
    mutationFn: (id: number) => api.cancelTermination(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts", companyId] });
      toast.success("Kündigung zurückgezogen");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => api.uploadSignedContract(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts", companyId] });
      toast.success("Unterschriebener Vertrag hochgeladen");
      setUploadContractId(null);
    },
    onError: (err: any) => toast.error(err.message || "Upload fehlgeschlagen"),
  });

  const handleCreate = () => {
    const pkg = PACKAGES.find((p) => p.id === form.package_id);
    if (!pkg || !form.customer_name) {
      toast.error("Bitte Kundenname und Paket ausfüllen");
      return;
    }
    createMutation.mutate({
      contract_number: form.contract_number,
      package_name: pkg.label,
      package_id: pkg.id,
      licenses: form.licenses,
      monthly_price: pkg.price,
      start_date: form.start_date,
      end_date: addMonths(form.start_date, 12),
      notice_period_days: 60,
      customer_name: form.customer_name,
      customer_address: form.customer_address || undefined,
      notes: form.notes || undefined,
    });
  };

  const handleEdit = () => {
    if (!editingContract) return;
    const pkg = PACKAGES.find((p) => p.id === form.package_id);
    if (!pkg) return;
    updateMutation.mutate({
      id: editingContract.id,
      data: {
        package_name: pkg.label,
        package_id: pkg.id,
        licenses: form.licenses,
        monthly_price: pkg.price,
        start_date: form.start_date,
        end_date: addMonths(form.start_date, 12),
        customer_name: form.customer_name,
        customer_address: form.customer_address || null,
        notes: form.notes || null,
      },
    });
  };

  const openEdit = (contract: any) => {
    setEditingContract(contract);
    setForm({
      contract_number: contract.contract_number,
      package_id: contract.package_id,
      licenses: contract.licenses,
      start_date: contract.start_date?.slice(0, 10) || "",
      customer_name: contract.customer_name || "",
      customer_address: contract.customer_address || "",
      notes: contract.notes || "",
    });
    setEditOpen(true);
  };

  const handleDownloadSigned = async (contractId: number, contractNumber: string) => {
    try {
      const blob = await api.downloadSignedContract(contractId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Vertrag_${contractNumber}_signed.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download fehlgeschlagen");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadContractId) return;
    if (file.type !== "application/pdf") {
      toast.error("Nur PDF-Dateien erlaubt");
      return;
    }
    uploadMutation.mutate({ id: uploadContractId, file });
    e.target.value = "";
  };

  const statusBadge = (contract: any) => {
    if (contract.status === "expired") {
      return <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> Ausgelaufen</Badge>;
    }
    if (contract.status === "terminated") {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Gekündigt</Badge>;
    }
    return <Badge className="gap-1 bg-emerald-600"><CheckCircle className="h-3 w-3" /> Aktiv</Badge>;
  };

  const renderContractDetails = (contract: any) => {
    const daysLeft = contract.end_date
      ? Math.ceil((new Date(contract.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="font-mono text-sm">{contract.contract_number}</span>
            {statusBadge(contract)}
          </div>
          <div className="flex items-center gap-1">
            {contract.status === "active" && (
              <>
                <Button variant="ghost" size="sm" onClick={() => openEdit(contract)}>
                  <Edit className="h-3.5 w-3.5 mr-1" /> Anpassen
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    setEditingContract(contract);
                    setTerminateOpen(true);
                  }}
                >
                  <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Kündigen
                </Button>
              </>
            )}
            {contract.status === "terminated" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => cancelTerminationMutation.mutate(contract.id)}
              >
                <Undo2 className="h-3.5 w-3.5 mr-1" /> Kündigung zurückziehen
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div>
            <span className="text-muted-foreground">Paket:</span>{" "}
            <span className="font-medium">{contract.package_name}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Lizenzen:</span>{" "}
            <span className="font-medium">{contract.licenses}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Monatlich:</span>{" "}
            <span className="font-medium">{formatPrice(contract.monthly_price)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Vertragsbeginn:</span>{" "}
            <span className="font-medium">{formatDate(contract.start_date)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Vertragsende:</span>{" "}
            <span className="font-medium">{formatDate(contract.end_date)}</span>
            {daysLeft !== null && daysLeft > 0 && daysLeft <= 90 && (
              <Badge variant="outline" className="ml-2 text-amber-600 border-amber-300 text-xs">
                <Clock className="h-3 w-3 mr-0.5" /> {daysLeft} Tage
              </Badge>
            )}
          </div>
          <div>
            <span className="text-muted-foreground">Kunde:</span>{" "}
            <span className="font-medium">{contract.customer_name}</span>
          </div>
          {contract.terminated_at && (
            <div>
              <span className="text-muted-foreground">Gekündigt am:</span>{" "}
              <span className="font-medium text-destructive">{formatDate(contract.terminated_at)}</span>
              <span className="text-xs text-muted-foreground ml-1">
                ({contract.terminated_by === "client" ? "Kunde" : "Anbieter"})
              </span>
            </div>
          )}
        </div>

        {contract.notes && (
          <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-2">{contract.notes}</p>
        )}

        <div className="flex items-center gap-2 pt-1">
          {contract.signed_pdf_path ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadSigned(contract.id, contract.contract_number)}
            >
              <Download className="h-3.5 w-3.5 mr-1" /> Signiertes PDF
            </Button>
          ) : (
            <Badge variant="outline" className="text-muted-foreground text-xs">Kein signiertes PDF</Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setUploadContractId(contract.id);
              fileInputRef.current?.click();
            }}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending && uploadContractId === contract.id ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5 mr-1" />
            )}
            PDF hochladen
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileSelect}
      />

      {activeContract ? (
        <div className="border rounded-lg p-4 bg-card">
          {renderContractDetails(activeContract)}
        </div>
      ) : (
        <div className="border rounded-lg p-6 text-center space-y-3 bg-muted/30">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Kein aktiver Vertrag vorhanden</p>
          <Button
            size="sm"
            onClick={() => {
              setForm({
                contract_number: generateContractNumber(),
                package_id: "",
                licenses: 1,
                start_date: new Date().toISOString().slice(0, 10),
                customer_name: companyName,
                customer_address: "",
                notes: "",
              });
              setCreateOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Vertrag erstellen
          </Button>
        </div>
      )}

      {pastContracts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vergangene Verträge</p>
          {pastContracts.map((c: any) => (
            <div key={c.id} className="border rounded-lg p-3 opacity-60 bg-muted/20">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">{c.contract_number}</span>
                  {statusBadge(c)}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(c.start_date)} – {formatDate(c.end_date)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Neuen Vertrag erstellen</DialogTitle>
          </DialogHeader>
          <ContractForm
            form={form}
            setForm={setForm}
            onSubmit={handleCreate}
            isPending={createMutation.isPending}
            submitLabel="Vertrag erstellen"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Vertrag anpassen</DialogTitle>
          </DialogHeader>
          <ContractForm
            form={form}
            setForm={setForm}
            onSubmit={handleEdit}
            isPending={updateMutation.isPending}
            submitLabel="Änderungen speichern"
            isEdit
          />
        </DialogContent>
      </Dialog>

      {/* Terminate Dialog */}
      <AlertDialog open={terminateOpen} onOpenChange={setTerminateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vertrag kündigen</AlertDialogTitle>
            <AlertDialogDescription>
              Die Kündigung wird eingetragen. Die Firma wird automatisch zum Vertragsende ({editingContract ? formatDate(editingContract.end_date) : "–"}) deaktiviert.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label>Gekündigt durch</Label>
            <Select value={terminatedBy} onValueChange={(v) => setTerminatedBy(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Kunde</SelectItem>
                <SelectItem value="provider">Anbieter (TechAssist)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => editingContract && terminateMutation.mutate({ id: editingContract.id, by: terminatedBy })}
            >
              Kündigung eintragen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Shared Form ────────────────────────────────

function ContractForm({
  form,
  setForm,
  onSubmit,
  isPending,
  submitLabel,
  isEdit = false,
}: {
  form: ContractFormData;
  setForm: (f: ContractFormData) => void;
  onSubmit: () => void;
  isPending: boolean;
  submitLabel: string;
  isEdit?: boolean;
}) {
  const pkg = PACKAGES.find((p) => p.id === form.package_id);

  return (
    <div className="space-y-4">
      {!isEdit && (
        <div className="space-y-2">
          <Label>Vertragsnummer</Label>
          <Input value={form.contract_number} onChange={(e) => setForm({ ...form, contract_number: e.target.value })} />
        </div>
      )}
      <div className="space-y-2">
        <Label>Kunde *</Label>
        <Input
          value={form.customer_name}
          onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
          placeholder="Praxis Dr. Müller"
        />
      </div>
      <div className="space-y-2">
        <Label>Adresse</Label>
        <Textarea
          value={form.customer_address}
          onChange={(e) => setForm({ ...form, customer_address: e.target.value })}
          rows={2}
          placeholder="Musterstrasse 10, 8000 Zürich"
        />
      </div>
      <div className="grid gap-4 grid-cols-2">
        <div className="space-y-2">
          <Label>Vertragsbeginn</Label>
          <Input
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Lizenzen</Label>
          <Input
            type="number"
            min={1}
            value={form.licenses}
            onChange={(e) => setForm({ ...form, licenses: parseInt(e.target.value) || 1 })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Paket *</Label>
        <Select value={form.package_id} onValueChange={(v) => setForm({ ...form, package_id: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Paket wählen…" />
          </SelectTrigger>
          <SelectContent>
            {PACKAGES.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label} — CHF {p.price}.- / Monat
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {pkg && (
          <p className="text-xs text-muted-foreground">
            {pkg.label} — CHF {pkg.price}.- / Monat • Vertragsende: {formatDate(addMonths(form.start_date, 12))}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Notizen</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2}
          placeholder="Optionale Anmerkungen…"
        />
      </div>
      <Button className="w-full" onClick={onSubmit} disabled={isPending}>
        {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {submitLabel}
      </Button>
    </div>
  );
}
