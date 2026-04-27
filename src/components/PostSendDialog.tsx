import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Download, FileText, Mail, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { generateCoverLetterPdf, type CoverLetterType, type CoverLetterRecipient, type CoverLetterContext } from "@/lib/coverLetterPdf";
import { generateInvoicePdf } from "@/lib/invoicePdf";
import jsPDF from "jspdf";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

interface PostSendDialogProps {
  open: boolean;
  onClose: () => void;
  type: CoverLetterType;
  recipient: CoverLetterRecipient;
  context: CoverLetterContext;
  /** PDF des Hauptdokuments (Rechnung/Mahnung/Vertrag). Wird im 2. Tab angezeigt. */
  documentPdf: jsPDF;
  documentFilename: string;
  /** Optional: Für "Als versendet markieren" */
  invoiceId?: number;
  contractId?: number;
}

export function PostSendDialog({
  open,
  onClose,
  type,
  recipient,
  context,
  documentPdf,
  documentFilename,
  invoiceId,
  contractId,
}: PostSendDialogProps) {
  const qc = useQueryClient();
  const [marking, setMarking] = useState(false);

  const coverPdf = useMemo(() => {
    if (!open) return null;
    return generateCoverLetterPdf(type, recipient, context);
  }, [open, type, recipient, context]);

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !coverPdf) return;
    const cUrl = URL.createObjectURL(coverPdf.output("blob"));
    const dUrl = URL.createObjectURL(documentPdf.output("blob"));
    setCoverUrl(cUrl);
    setDocUrl(dUrl);
    return () => {
      URL.revokeObjectURL(cUrl);
      URL.revokeObjectURL(dUrl);
      setCoverUrl(null);
      setDocUrl(null);
    };
  }, [open, coverPdf, documentPdf]);

  const downloadCover = () => {
    if (!coverPdf) return;
    coverPdf.save(`Begleitbrief_${context.documentNumber ?? "DERM247"}.pdf`);
  };
  const downloadDoc = () => {
    documentPdf.save(documentFilename);
  };
  const downloadBoth = () => {
    downloadCover();
    setTimeout(downloadDoc, 200);
  };

  const markSent = async () => {
    try {
      setMarking(true);
      if (invoiceId) {
        await api.markInvoicePostSent(invoiceId);
        qc.invalidateQueries({ queryKey: ["invoices"] });
      } else if (contractId) {
        await api.markCancellationPostSent(contractId);
        qc.invalidateQueries({ queryKey: ["contracts"] });
      }
      toast.success("Als per Post versendet markiert");
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Fehler beim Markieren");
    } finally {
      setMarking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Postversand vorbereiten
          </DialogTitle>
          <DialogDescription>
            Beide PDFs ausdrucken, falten und gemeinsam ins Couvert legen.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="cover" className="flex-1 flex flex-col overflow-hidden px-6">
          <TabsList className="self-start">
            <TabsTrigger value="cover">
              <FileText className="h-4 w-4 mr-2" />
              Begleitbrief
            </TabsTrigger>
            <TabsTrigger value="doc">
              <FileText className="h-4 w-4 mr-2" />
              {type === "cancellation" ? "Kündigung" : type === "invoice" ? "Rechnung" : "Mahnung"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cover" className="flex-1 mt-3 overflow-hidden">
            {coverUrl && (
              <iframe
                src={coverUrl}
                className="w-full h-full border rounded-md bg-muted"
                title="Begleitbrief Vorschau"
              />
            )}
          </TabsContent>
          <TabsContent value="doc" className="flex-1 mt-3 overflow-hidden">
            {docUrl && (
              <iframe
                src={docUrl}
                className="w-full h-full border rounded-md bg-muted"
                title="Dokument Vorschau"
              />
            )}
          </TabsContent>
        </Tabs>

        <div className="flex flex-wrap items-center justify-between gap-2 p-6 border-t bg-muted/30">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={downloadCover}>
              <Download className="h-4 w-4 mr-2" />
              Begleitbrief
            </Button>
            <Button variant="outline" size="sm" onClick={downloadDoc}>
              <Download className="h-4 w-4 mr-2" />
              Dokument
            </Button>
            <Button size="sm" onClick={downloadBoth}>
              <Download className="h-4 w-4 mr-2" />
              Beide herunterladen
            </Button>
          </div>
          {(invoiceId || contractId) && (
            <Button variant="default" size="sm" onClick={markSent} disabled={marking}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Als versendet markieren
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
