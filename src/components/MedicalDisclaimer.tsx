import { AlertTriangle } from "lucide-react";

/**
 * Visible legal/medical disclaimer.
 * Placed on Dashboard and other clinical entry points.
 *
 * Per Briefing April 2026: DERM247 must clearly communicate
 * that it is NOT a medical device and provides no diagnosis.
 */
const MedicalDisclaimer = () => {
  return (
    <div
      role="note"
      className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-3 flex items-start gap-3"
    >
      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" aria-hidden />
      <div className="text-xs leading-relaxed">
        <p className="font-semibold text-amber-700">
          Nur unterstützendes System – keine medizinische Diagnose
        </p>
        <p className="text-muted-foreground mt-0.5">
          DERM247 ist <strong>kein Medizinprodukt</strong> und stellt keine Diagnose.
          Sämtliche klinische Beurteilungen, ABCDE-Scores und Verlaufsanalysen sind
          rein dokumentierende Hilfsmittel. Die ärztliche Verantwortung verbleibt
          vollständig beim Anwender.
        </p>
      </div>
    </div>
  );
};

export default MedicalDisclaimer;
