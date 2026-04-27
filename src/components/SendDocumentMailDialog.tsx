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
import { api } from "@/lib/api";
import type jsPDF from "jspdf";

interface SendDocumentMailDialogProps {
  open: boolean;
  onClose: () => void;
  documentType: "invoice" | "dunning" | "cancellation" | "contract";
  documentId?: number | null;
  companyId: number;
  defaultRecipient: string;
  defaultSubject: string;
  pdfFilename: string;
  /** Function that returns the PDF (jsPDF instance) — called only on submit */
  buildPdf: () => jsPDF;
}

export function SendDocumentMailDialog({
  open,
  onClose,
  documentType,
  documentId,
  companyId,
  defaultRecipient,
  defaultSubject,
  pdfFilename,
  buildPdf,
}: SendDocumentMailDialogProps) {
  const qc = useQueryClient();
  const [recipient, setRecipient] = useState(defaultRecipient);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (open) {
      setRecipient(defaultRecipient);
      setSubject(defaultSubject);
      setMessage("");
    }
  }, [open, defaultRecipient, defaultSubject]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      // PDF im Browser generieren → Base64 (ohne Data-URL-Prefix)
      const doc = buildPdf();
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
        pdf_filename: pdfFilename,
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
            Das PDF wird automatisch als Anhang mitgesendet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
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
              onChange={(e) => setSubject(e.target.value)}
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
            <strong>Anhang:</strong> {pdfFilename}
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
