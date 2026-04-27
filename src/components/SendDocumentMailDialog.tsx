import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { INVOICE_LANGUAGES, type InvoiceLanguage } from "@/lib/invoiceTranslations";
import type jsPDF from "jspdf";

type DocType = "invoice" | "dunning" | "cancellation" | "contract";

// Language-aware defaults for subject + filename per document type
const DOC_LABELS: Record<DocType, Record<InvoiceLanguage, { subject: (n: string, lvl?: number) => string; filename: (n: string, lvl?: number) => string }>> = {
  invoice: {
    de: { subject: (n) => `Rechnung ${n} (DERM247)`, filename: (n) => `Rechnung_${n}.pdf` },
    en: { subject: (n) => `Invoice ${n} (DERM247)`, filename: (n) => `Invoice_${n}.pdf` },
    fr: { subject: (n) => `Facture ${n} (DERM247)`, filename: (n) => `Facture_${n}.pdf` },
    it: { subject: (n) => `Fattura ${n} (DERM247)`, filename: (n) => `Fattura_${n}.pdf` },
    es: { subject: (n) => `Factura ${n} (DERM247)`, filename: (n) => `Factura_${n}.pdf` },
  },
  dunning: {
    de: { subject: (n, l) => `${l}. Mahnung – Rechnung ${n} (DERM247)`, filename: (n, l) => `Mahnung_${l}_Stufe_${n}.pdf` },
    en: { subject: (n, l) => `${l}${l === 1 ? "st" : l === 2 ? "nd" : "rd"} Reminder – Invoice ${n} (DERM247)`, filename: (n, l) => `Reminder_${l}_${n}.pdf` },
    fr: { subject: (n, l) => `${l}${l === 1 ? "er" : "e"} rappel – Facture ${n} (DERM247)`, filename: (n, l) => `Rappel_${l}_${n}.pdf` },
    it: { subject: (n, l) => `${l}° sollecito – Fattura ${n} (DERM247)`, filename: (n, l) => `Sollecito_${l}_${n}.pdf` },
    es: { subject: (n, l) => `${l}.ª reclamación – Factura ${n} (DERM247)`, filename: (n, l) => `Reclamacion_${l}_${n}.pdf` },
  },
  cancellation: {
    de: { subject: (n) => `Kündigungsbestätigung ${n} (DERM247)`, filename: (n) => `Kuendigung_${n}.pdf` },
    en: { subject: (n) => `Cancellation confirmation ${n} (DERM247)`, filename: (n) => `Cancellation_${n}.pdf` },
    fr: { subject: (n) => `Confirmation de résiliation ${n} (DERM247)`, filename: (n) => `Resiliation_${n}.pdf` },
    it: { subject: (n) => `Conferma di disdetta ${n} (DERM247)`, filename: (n) => `Disdetta_${n}.pdf` },
    es: { subject: (n) => `Confirmación de baja ${n} (DERM247)`, filename: (n) => `Baja_${n}.pdf` },
  },
  contract: {
    de: { subject: (n) => `Vertrag ${n} (DERM247)`, filename: (n) => `Vertrag_${n}.pdf` },
    en: { subject: (n) => `Contract ${n} (DERM247)`, filename: (n) => `Contract_${n}.pdf` },
    fr: { subject: (n) => `Contrat ${n} (DERM247)`, filename: (n) => `Contrat_${n}.pdf` },
    it: { subject: (n) => `Contratto ${n} (DERM247)`, filename: (n) => `Contratto_${n}.pdf` },
    es: { subject: (n) => `Contrato ${n} (DERM247)`, filename: (n) => `Contrato_${n}.pdf` },
  },
};

interface SendDocumentMailDialogProps {
  open: boolean;
  onClose: () => void;
  documentType: DocType;
  documentId?: number | null;
  companyId: number;
  defaultRecipient: string;
  /** Reference number used in subject/filename (invoice number, contract number, etc.) */
  referenceNumber: string;
  /** For dunning: current dunning level (1, 2 or 3) */
  dunningLevel?: number;
  /** Build the PDF in the chosen language */
  buildPdf: (language: InvoiceLanguage) => jsPDF;
}

export function SendDocumentMailDialog({
  open,
  onClose,
  documentType,
  documentId,
  companyId,
  defaultRecipient,
  referenceNumber,
  dunningLevel,
  buildPdf,
}: SendDocumentMailDialogProps) {
  const qc = useQueryClient();
  const [language, setLanguage] = useState<InvoiceLanguage>("de");
  const [recipient, setRecipient] = useState(defaultRecipient);
  const [message, setMessage] = useState("");
  const [subjectOverride, setSubjectOverride] = useState<string | null>(null);

  const labels = DOC_LABELS[documentType][language];
  const computedSubject = labels.subject(referenceNumber, dunningLevel);
  const computedFilename = labels.filename(referenceNumber, dunningLevel);
  const subject = subjectOverride ?? computedSubject;

  useEffect(() => {
    if (open) {
      setLanguage("de");
      setRecipient(defaultRecipient);
      setMessage("");
      setSubjectOverride(null);
    }
  }, [open, defaultRecipient]);

  // Reset manual subject override when language changes (auto-resync to localized subject)
  useEffect(() => {
    setSubjectOverride(null);
  }, [language]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const doc = buildPdf(language);
      const dataUri = doc.output("datauristring");
      const pdfBase64 = dataUri.split(",")[1] || "";
      return api.sendDocumentMail({
        document_type: documentType,
        document_id: documentId ?? null,
        company_id: companyId,
        recipient_email: recipient.trim(),
        subject: subject.trim(),
        message: message.trim() || undefined,
        pdf_base64: pdfBase64,
        pdf_filename: computedFilename,
        language,
      });
    },
    onSuccess: () => {
      toast.success("E-Mail erfolgreich versendet");
      qc.invalidateQueries({ queryKey: ["mail-history"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.message || "Versand fehlgeschlagen"),
  });

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.trim());

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> Dokument per E-Mail versenden
          </DialogTitle>
          <DialogDescription>
            PDF und Mail-Text werden in der gewählten Sprache erstellt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="language">Sprache des Dokuments</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as InvoiceLanguage)}>
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVOICE_LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Standard: Deutsch. Steuert PDF-Inhalt, Betreff, Dateiname und Mail-Text.
            </p>
          </div>

          <div>
            <Label htmlFor="recipient">Empfänger-E-Mail</Label>
            <Input
              id="recipient"
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="kunde@example.com"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Vorausgefüllt aus den Firmendaten – kann überschrieben werden.
            </p>
          </div>

          <div>
            <Label htmlFor="subject">Betreff</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubjectOverride(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="message">Persönliche Nachricht (optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Wird zusätzlich zum Standard-Anschreiben in die Mail aufgenommen."
            />
          </div>

          <div className="text-xs text-muted-foreground border rounded-md p-2 bg-muted/30">
            <strong>Anhang:</strong> {computedFilename}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sendMutation.isPending}>
            Abbrechen
          </Button>
          <Button
            onClick={() => sendMutation.mutate()}
            disabled={!validEmail || !subject.trim() || sendMutation.isPending}
          >
            {sendMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Wird gesendet...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" /> Senden
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
