import jsPDF from "jspdf";
import "jspdf-autotable";
import type { FullPatient, LocationImage } from "@/types/patient";
import { LESION_CLASSIFICATIONS } from "@/types/patient";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { de } from "date-fns/locale";

/** Replace Umlaute for jsPDF compatibility */
function clean(text: string): string {
  return text
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue")
    .replace(/–/g, "-").replace(/≥/g, ">=").replace(/⚠/g, "!");
}

function getRiskLabel(level: string | null | undefined): string {
  if (!level) return "-";
  if (level === "low") return "Niedrig";
  if (level === "medium") return "Mittel";
  return "Hoch";
}

function getAbcdeLabel(img: LocationImage): string[] {
  const lines: string[] = [];
  if (img.abc_asymmetry != null)
    lines.push(`A – ${img.abc_asymmetry ? "Asymmetrisch" : "Symmetrisch"}`);
  if (img.abc_border)
    lines.push(`B – ${img.abc_border === "unregelmaessig" ? "Unregelmaessig" : "Regelmaessig"}`);
  if (img.abc_color)
    lines.push(`C – ${img.abc_color === "mehrfarbig" ? "Mehrfarbig" : "Einfarbig"}`);
  if (img.abc_diameter)
    lines.push(`D – ${img.abc_diameter === "groesser_6mm" ? "> 6mm" : "< 6mm"}`);
  if (img.abc_evolution)
    lines.push(`E – ${img.abc_evolution === "veraendert" ? "Veraendert" : "Stabil"}`);
  return lines;
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generatePatientPDF(patient: FullPatient, mode: "preview" | "download" = "download"): Promise<string | void> {
  const imageCache: Record<number, string | null> = {};
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Header
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Derm247", margin, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(clean(`Patientenbericht - ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: de })}`), margin, 20);
  doc.setTextColor(0, 0, 0);
  y = 36;

  // Patient info
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(patient.name, margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const birthDate = patient.birth_date
    ? format(new Date(patient.birth_date), "dd.MM.yyyy", { locale: de })
    : "–";
  doc.text(clean(`Geburtsdatum: ${birthDate}`), margin, y);
  if (patient.insurance_number) {
    doc.text(`Versicherungsnr.: ${patient.insurance_number}`, margin + 80, y);
  }
  y += 5;
  if (patient.email) {
    doc.text(`E-Mail: ${patient.email}`, margin, y);
    y += 5;
  }
  if (patient.phone) {
    doc.text(`Telefon: ${patient.phone}`, margin, y);
    y += 5;
  }

  // Separator
  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Summary
  const locations = patient.locations ?? [];
  const totalImages = locations.reduce((sum, l) => sum + (l.images?.length ?? 0), 0);
  const highRiskSpots = locations.filter(l =>
    l.images?.some(img => (img.risk_score ?? 0) >= 4)
  ).length;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Zusammenfassung", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Hautstellen: ${locations.length}  |  Bilder: ${totalImages}  |  Kritische Stellen (Score >= 4): ${highRiskSpots}`, margin, y);
  y += 8;

  // Per spot
  for (const loc of locations) {
    // Check page space
    if (y > 240) {
      doc.addPage();
      y = margin;
    }

    const spotName = loc.name || `Spot #${loc.id}`;
    const classification = loc.classification
      ? LESION_CLASSIFICATIONS[loc.classification]?.label ?? loc.classification
      : "Nicht klassifiziert";

    // Spot header
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(margin, y - 4, contentWidth, 8, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(`${spotName}`, margin + 2, y);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Klassifizierung: ${classification}`, margin + 2, y + 5);
    doc.setTextColor(0, 0, 0);
    y += 12;

    const images = [...(loc.images ?? [])].sort(
      (a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
    );

    if (images.length === 0) {
      doc.setFontSize(9);
      doc.text("Keine Bilder vorhanden.", margin + 2, y);
      y += 8;
      continue;
    }

    // Risk progression
    const scores = images
      .map(img => img.risk_score)
      .filter((s): s is number => s != null);

    if (scores.length > 0) {
      const latest = scores[scores.length - 1];
      const first = scores[0];
      const diff = latest - first;
      const everHigh = scores.some(s => s >= 4);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const riskText = `Aktueller Score: ${latest} (${getRiskLabel(images[images.length - 1].risk_level)})`;
      doc.text(riskText, margin + 2, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);

      if (scores.length >= 2) {
        const hasVariation = new Set(scores).size > 1;
        if (hasVariation) {
          const changeLabel = diff > 0
            ? `Verschlechterung +${diff}`
            : diff < 0
              ? `Verbesserung ${diff}`
              : "";
          if (changeLabel) {
            if (diff > 0) doc.setTextColor(220, 38, 38);
            else if (diff < 0) doc.setTextColor(22, 163, 74);
            doc.text(changeLabel, margin + 2, y);
            doc.setTextColor(0, 0, 0);
            y += 4;
          }
        } else {
          doc.text("Verlauf: stabil", margin + 2, y);
          y += 4;
        }
      }

      if (everHigh) {
        doc.setTextColor(220, 38, 38);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("⚠ Früher hoher Risikowert erkannt (Score ≥ 4)", margin + 2, y);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        y += 5;
      }

      // Max score with color coding
      const maxScore = Math.max(...scores);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      if (maxScore >= 4) doc.setTextColor(220, 38, 38);
      else if (maxScore >= 2) doc.setTextColor(202, 138, 4);
      else doc.setTextColor(22, 163, 74);
      doc.text(`Hoechster Score: ${maxScore}`, margin + 2, y);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
      y += 5;
    }

    // Images (max 4)
    const displayImages = images.slice(-4);
    const imgSize = 30;
    const imgGap = 4;
    let imgX = margin + 2;

    for (const img of displayImages) {
      if (y + imgSize + 20 > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
        imgX = margin + 2;
      }

      const imgUrl = api.resolveImageSrc(img);
      if (imageCache[img.id] === undefined) {
        imageCache[img.id] = await loadImageAsBase64(imgUrl);
      }
      const base64 = imageCache[img.id];

      if (base64) {
        try {
          doc.addImage(base64, "JPEG", imgX, y, imgSize, imgSize);
        } catch {
          // Skip broken images
        }
      }

      // Date under image
      doc.setFontSize(7);
      const dateStr = img.created_at
        ? format(new Date(img.created_at), "dd.MM.yy", { locale: de })
        : "–";
      doc.text(dateStr, imgX + imgSize / 2, y + imgSize + 3, { align: "center" });

      // Score badge
      if (img.risk_score != null) {
        const badgeText = `${img.risk_score}`;
        if (img.risk_score >= 4) doc.setTextColor(220, 38, 38);
        else if (img.risk_score >= 2) doc.setTextColor(202, 138, 4);
        else doc.setTextColor(22, 163, 74);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(badgeText, imgX + imgSize - 1, y + 4);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
      }

      imgX += imgSize + imgGap;
    }
    y += imgSize + 8;

    // ABCDE for latest image
    const latestImg = images[images.length - 1];
    const abcdeLines = getAbcdeLabel(latestImg);
    if (abcdeLines.length > 0) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("ABCDE-Bewertung (letzte Aufnahme):", margin + 2, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      for (const line of abcdeLines) {
        doc.text(`  ${line}`, margin + 2, y);
        y += 3.5;
      }
      y += 2;
    }

    // Notes
    if (latestImg.note) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text(`Notiz: ${latestImg.note}`, margin + 2, y);
      doc.setFont("helvetica", "normal");
      y += 5;
    }

    // Separator between spots
    y += 2;
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  }

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Derm247 – Patientenbericht – Seite ${i}/${totalPages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
    doc.text(
      "Dieses Dokument dient ausschliesslich der medizinischen Dokumentation.",
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 5,
      { align: "center" }
    );
  }

  const filename = `Derm247_${patient.name.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
  const blob = doc.output("blob");
  const blobUrl = URL.createObjectURL(blob);

  if (mode === "preview") {
    return blobUrl;
  }

  try {
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      window.open(blobUrl, "_blank");
    }
  } catch {
    doc.save(filename);
  }
}

export function getPatientPdfFilename(patient: { name: string }): string {
  return `Derm247_${patient.name.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
}
