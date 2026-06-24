import { Link, useParams } from "react-router-dom";
import { MobileHeader } from "../components/MobileHeader";
import { ArrowLeft } from "lucide-react";

/**
 * Routen-Reserve für Stufe 2 (Vergleich/Verlauf).
 * Heute nur ein „demnächst"-Placeholder, damit Deep-Links nie 404 werfen
 * und das Datenmodell + Routing schon stehen.
 */
export function ComingSoonScreen({ title }: { title: string }) {
  const { id } = useParams<{ id: string }>();
  return (
    <>
      <MobileHeader
        to={id ? `/m/lesions/${id}` : "/m/patients"}
        title={title}
      />
      <main className="flex-1 flex items-center justify-center px-6 text-center">
        <div className="space-y-3">
          <div className="text-lg font-medium">{title}</div>
          <p className="text-sm text-muted-foreground max-w-xs">
            Diese Ansicht ist vorbereitet und kommt in der nächsten Stufe –
            ohne Eingriff in den aktuellen Workflow.
          </p>
          <Link
            to={id ? `/m/lesions/${id}` : "/m/patients"}
            className="inline-flex items-center gap-1 text-sm text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Zurück
          </Link>
        </div>
      </main>
    </>
  );
}
