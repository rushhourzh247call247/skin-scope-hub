import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorker;

interface RenderedPage {
  pageNumber: number;
  src: string;
}

interface PdfPreviewPagesProps {
  pdfUrl: string;
}

export default function PdfPreviewPages({ pdfUrl }: PdfPreviewPagesProps) {
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadingTask = getDocument(pdfUrl);

    const renderPages = async () => {
      setLoading(true);
      setError(null);
      setPages([]);

      try {
        const pdf = await loadingTask.promise;
        const renderedPages: RenderedPage[] = [];

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          if (cancelled) return;

          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          if (!context) continue;

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({
            canvasContext: context,
            viewport,
          }).promise;

          renderedPages.push({
            pageNumber,
            src: canvas.toDataURL("image/png"),
          });
        }

        if (!cancelled) {
          setPages(renderedPages);
        }
      } catch {
        if (!cancelled) {
          setError("PDF-Vorschau konnte nicht gerendert werden");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void renderPages();

    return () => {
      cancelled = true;
      void loadingTask.destroy();
    };
  }, [pdfUrl]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border bg-muted/20">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Vorschau wird gerendert...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border bg-muted/20 p-6">
        <div className="flex max-w-sm flex-col items-center gap-2 text-center text-sm text-muted-foreground">
          <AlertTriangle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto rounded-lg border bg-muted/20 p-3">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {pages.map((page) => (
          <figure key={page.pageNumber} className="overflow-hidden rounded-md border bg-background shadow-sm">
            <img
              src={page.src}
              alt={`PDF-Seite ${page.pageNumber}`}
              loading="lazy"
              className="block h-auto w-full"
            />
          </figure>
        ))}
      </div>
    </div>
  );
}
