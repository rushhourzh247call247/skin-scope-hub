import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import { MobileShell } from "./MobileShell";
import { PatientListScreen } from "./screens/PatientListScreen";
import { PatientHomeScreen } from "./screens/PatientHomeScreen";
import { ClinicalCaptureScreen } from "./screens/ClinicalCaptureScreen";
import { MarkerEditorScreen } from "./screens/MarkerEditorScreen";
import { LesionDetailScreen } from "./screens/LesionDetailScreen";
import { ComingSoonScreen } from "./screens/ComingSoonScreen";

/**
 * Komplett isolierte Mobile-App unter /m.
 * Kein AppLayout, kein AppSidebar, keine Berührung der Alt-Routen.
 */
export function MobileApp() {
  return (
    <ProtectedRoute>
      <MobileShell>
        <Routes>
          <Route index element={<Navigate to="patients" replace />} />
          <Route path="patients" element={<PatientListScreen />} />
          <Route
            path="patients/:id"
            element={<PatientHomeScreen />}
          />
          <Route
            path="patients/:id/clinical/new"
            element={<ClinicalCaptureScreen />}
          />
          <Route
            path="patients/:patientId/clinical/:photoId"
            element={<MarkerEditorScreen />}
          />
          <Route path="lesions/:id" element={<LesionDetailScreen />} />
          <Route
            path="lesions/:id/compare"
            element={<ComingSoonScreen title="Vergleich (in Vorbereitung)" />}
          />
          <Route
            path="lesions/:id/timeline"
            element={<ComingSoonScreen title="Verlauf (in Vorbereitung)" />}
          />
          <Route path="*" element={<Navigate to="patients" replace />} />
        </Routes>
      </MobileShell>
    </ProtectedRoute>
  );
}
