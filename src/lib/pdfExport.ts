import jsPDF from "jspdf";
import "jspdf-autotable";
import { ROBOTO_REGULAR } from "@/assets/fonts/roboto-regular";
import { ROBOTO_BOLD } from "@/assets/fonts/roboto-bold";
import type { FullPatient, LocationImage, PdfExportOptions } from "@/types/patient";
import { LESION_CLASSIFICATIONS } from "@/types/patient";
import { format } from "date-fns";
import { de } from "date-fns/locale";

/* ─── Helpers ─────────────────────────────────────────── */

function clean(text: string): string {
  return text.replace(/≥/g, ">=").replace(/⚠/g, "!");
}

function registerFonts(doc: jsPDF) {
  doc.addFileToVFS("Roboto-Regular.ttf", ROBOTO_REGULAR);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.addFileToVFS("Roboto-Bold.ttf", ROBOTO_BOLD);
  doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
}

function getRiskLabel(level: string | null | undefined): string {
  if (!level) return "-";
  if (level === "low") return "Niedrig";
  if (level === "medium") return "Mittel";
  return "Hoch";
}

function resolveDoctorName(doctorName?: string): string | null {
  if (doctorName?.trim()) return doctorName.trim();
  try {
    const rawUser = sessionStorage.getItem("auth_user");
    if (!rawUser) return null;
    const parsed = JSON.parse(rawUser) as { name?: unknown };
    return typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : null;
  } catch {
    return null;
  }
}

function getAbcdeLabel(img: LocationImage): { key: string; label: string; value: string }[] {
  const rows: { key: string; label: string; value: string }[] = [];
  if (img.abc_asymmetry != null)
    rows.push({ key: "A", label: "Asymmetrie", value: img.abc_asymmetry ? "Asymmetrisch" : "Symmetrisch" });
  if (img.abc_border)
    rows.push({ key: "B", label: "Begrenzung", value: img.abc_border === "unregelmaessig" ? "Unregelmässig" : "Regelmässig" });
  if (img.abc_color)
    rows.push({ key: "C", label: "Farbe", value: img.abc_color === "mehrfarbig" ? "Mehrfarbig" : "Einfarbig" });
  if (img.abc_diameter)
    rows.push({ key: "D", label: "Durchmesser", value: img.abc_diameter === "groesser_6mm" ? "> 6 mm" : "< 6 mm" });
  if (img.abc_evolution)
    rows.push({ key: "E", label: "Entwicklung", value: img.abc_evolution === "veraendert" ? "Verändert" : "Stabil" });
  return rows;
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  const loadViaImage = (): Promise<string | null> =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/jpeg", 0.92));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  const loadViaFetch = async (): Promise<string | null> => {
    try {
      const res = await fetch(url, { method: "GET", mode: "cors" });
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };
  const imageResult = await loadViaImage();
  if (imageResult) return imageResult;
  return await loadViaFetch();
}

/* ─── Colors ──────────────────────────────────────────── */

const C = {
  headerBg: [20, 33, 52] as [number, number, number],       // deep navy
  headerAccent: [0, 166, 153] as [number, number, number],   // teal accent
  white: [255, 255, 255] as [number, number, number],
  textPrimary: [30, 41, 59] as [number, number, number],     // slate-800
  textSecondary: [100, 116, 139] as [number, number, number],// slate-500
  textMuted: [148, 163, 184] as [number, number, number],    // slate-400
  border: [226, 232, 240] as [number, number, number],       // slate-200
  cardBg: [248, 250, 252] as [number, number, number],       // slate-50
  summaryBg: [240, 249, 255] as [number, number, number],    // sky-50
  summaryBorder: [186, 230, 253] as [number, number, number],// sky-200
  riskLow: [22, 163, 74] as [number, number, number],
  riskMed: [202, 138, 4] as [number, number, number],
  riskHigh: [220, 38, 38] as [number, number, number],
  abcdeBg: [245, 243, 255] as [number, number, number],      // violet-50
  abcdeKey: [109, 40, 217] as [number, number, number],      // violet-600
};

/* ─── Drawing primitives ─────────────────────────────── */

function drawRoundedRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, style: "F" | "S" | "FD" = "F") {
  doc.roundedRect(x, y, w, h, r, r, style);
}

function checkPage(doc: jsPDF, y: number, needed: number, margin: number): number {
  if (y + needed > doc.internal.pageSize.getHeight() - margin - 12) {
    doc.addPage();
    return margin;
  }
  return y;
}

function riskColor(score: number): [number, number, number] {
  if (score >= 4) return C.riskHigh;
  if (score >= 2) return C.riskMed;
  return C.riskLow;
}

/* ─── Main ────────────────────────────────────────────── */

const DEFAULT_OPTIONS: PdfExportOptions = {
  reportType: "fullHistory",
  showClassification: true,
  showAbcde: true,
  showRiskScore: true,
  showImages: true,
  showNotes: true,
  doctorSummary: "",
};

export async function generatePatientPDF(
  patient: FullPatient,
  mode: "preview" | "download" = "download",
  doctorName?: string,
  opts?: PdfExportOptions
): Promise<string | void> {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  const imageCache: Record<number, string | null> = {};
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  registerFonts(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = 0;

  /* ═══ HEADER ═══════════════════════════════════════ */
  const headerH = 32;
  doc.setFillColor(...C.headerBg);
  doc.rect(0, 0, pageW, headerH, "F");

  // Accent stripe
  doc.setFillColor(...C.headerAccent);
  doc.rect(0, headerH, pageW, 1.2, "F");

  // Logo text
  doc.setFont("Roboto", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...C.white);
  doc.text("DERM", margin, 14);
  doc.setTextColor(...C.headerAccent);
  doc.text("247", margin + doc.getTextWidth("DERM"), 14);

  // Subtitle
  doc.setFont("Roboto", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 200, 220);
  doc.text("Dermatologischer Patientenbericht", margin, 20);

  // Right side: date & doctor
  doc.setTextColor(...C.white);
  doc.setFontSize(8);
  const dateStr = format(new Date(), "dd. MMMM yyyy, HH:mm", { locale: de });
  doc.text(dateStr, pageW - margin, 12, { align: "right" });

  const resolvedDoctor = resolveDoctorName(doctorName);
  if (resolvedDoctor) {
    doc.setFontSize(8);
    doc.setTextColor(180, 200, 220);
    doc.text(`Arzt: ${resolvedDoctor}`, pageW - margin, 18, { align: "right" });
  }

  // Report type badge
  doc.setFontSize(7);
  const typeLabel = options.reportType === "lastVisit" ? "LETZTE KONSULTATION" : "GESAMTVERLAUF";
  const badgeW = doc.getTextWidth(typeLabel) + 6;
  doc.setFillColor(...C.headerAccent);
  drawRoundedRect(doc, pageW - margin - badgeW, 22, badgeW, 5, 1, "F");
  doc.setTextColor(...C.white);
  doc.text(typeLabel, pageW - margin - badgeW + 3, 25.5);

  y = headerH + 6;

  /* ═══ PATIENT INFO CARD ════════════════════════════ */
  doc.setFillColor(...C.cardBg);
  doc.setDrawColor(...C.border);
  drawRoundedRect(doc, margin, y, contentW, 22, 2, "FD");

  doc.setFont("Roboto", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...C.textPrimary);
  doc.text(patient.name, margin + 5, y + 8);

  doc.setFont("Roboto", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.textSecondary);

  const birthDate = patient.birth_date
    ? format(new Date(patient.birth_date), "dd.MM.yyyy", { locale: de })
    : "–";

  const infoLine1: string[] = [`Geb.: ${birthDate}`];
  if (patient.insurance_number) infoLine1.push(`Vers.-Nr.: ${patient.insurance_number}`);
  doc.text(infoLine1.join("   |   "), margin + 5, y + 14);

  const infoLine2: string[] = [];
  if (patient.email) infoLine2.push(patient.email);
  if (patient.phone) infoLine2.push(patient.phone);
  if (infoLine2.length > 0) {
    doc.text(infoLine2.join("   |   "), margin + 5, y + 19);
  }

  y += 28;

  /* ═══ SUMMARY BAR ══════════════════════════════════ */
  const locations = patient.locations ?? [];
  const totalImages = locations.reduce((sum, l) => sum + (l.images?.length ?? 0), 0);
  const highRiskSpots = locations.filter(l => l.images?.some(img => (img.risk_score ?? 0) >= 4)).length;

  doc.setFillColor(...C.summaryBg);
  doc.setDrawColor(...C.summaryBorder);
  drawRoundedRect(doc, margin, y, contentW, 14, 2, "FD");

  const summaryItems = [
    { label: "Hautstellen", value: `${locations.length}` },
    { label: "Aufnahmen", value: `${totalImages}` },
    { label: "Kritisch", value: `${highRiskSpots}` },
  ];

  const colW = contentW / summaryItems.length;
  summaryItems.forEach((item, i) => {
    const cx = margin + colW * i + colW / 2;
    doc.setFont("Roboto", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...C.textPrimary);
    if (item.label === "Kritisch" && highRiskSpots > 0) doc.setTextColor(...C.riskHigh);
    doc.text(item.value, cx, y + 7, { align: "center" });

    doc.setFont("Roboto", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.textMuted);
    doc.text(item.label.toUpperCase(), cx, y + 11.5, { align: "center" });

    // Vertical divider
    if (i < summaryItems.length - 1) {
      doc.setDrawColor(...C.border);
      doc.line(margin + colW * (i + 1), y + 2.5, margin + colW * (i + 1), y + 11.5);
    }
  });

  y += 20;

  /* ═══ DOCTOR SUMMARY ═══════════════════════════════ */
  if (options.doctorSummary.trim()) {
    y = checkPage(doc, y, 25, margin);

    doc.setFillColor(255, 251, 235); // amber-50
    doc.setDrawColor(253, 230, 138); // amber-200
    drawRoundedRect(doc, margin, y, contentW, 6, 2, "FD");

    // Title bar
    doc.setFont("Roboto", "bold");
    doc.setFontSize(8);
    doc.setTextColor(146, 64, 14); // amber-800
    doc.text("ÄRZTLICHE ZUSAMMENFASSUNG", margin + 4, y + 4);

    const summaryLines = doc.splitTextToSize(clean(options.doctorSummary), contentW - 10);
    const textH = summaryLines.length * 4.2 + 4;

    // Text area
    doc.setFillColor(255, 254, 249);
    doc.setDrawColor(253, 230, 138);
    drawRoundedRect(doc, margin, y + 6, contentW, textH, 2, "FD");

    doc.setFont("Roboto", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.textPrimary);
    let ty = y + 10;
    for (const line of summaryLines) {
      doc.text(line, margin + 5, ty);
      ty += 4.2;
    }

    y += 6 + textH + 6;
  }

  /* ═══ SPOT SECTIONS ════════════════════════════════ */
  for (let si = 0; si < locations.length; si++) {
    const loc = locations[si];
    const spotName = loc.name || `Spot #${loc.id}`;
    const classification = loc.classification
      ? LESION_CLASSIFICATIONS[loc.classification]?.label ?? loc.classification
      : null;

    let images = [...(loc.images ?? [])].sort(
      (a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
    );
    if (options.reportType === "lastVisit" && images.length > 0) {
      images = [images[images.length - 1]];
    }

    // Estimate height needed
    const estimatedH = 12 + (options.showImages && images.length > 0 ? 42 : 0) +
      (options.showRiskScore ? 12 : 0) + (options.showAbcde ? 20 : 0) + (options.showNotes ? 8 : 0);
    y = checkPage(doc, y, Math.min(estimatedH, 80), margin);

    /* ─── Spot Header ─── */
    doc.setFillColor(...C.headerBg);
    drawRoundedRect(doc, margin, y, contentW, 9, 2, "F");

    // Spot number circle
    doc.setFillColor(...C.headerAccent);
    doc.circle(margin + 6, y + 4.5, 3.2, "F");
    doc.setFont("Roboto", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.white);
    doc.text(`${si + 1}`, margin + 6, y + 5.5, { align: "center" });

    // Spot name
    doc.setFont("Roboto", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...C.white);
    doc.text(spotName, margin + 12, y + 5.5);

    // Classification badge
    if (options.showClassification && classification) {
      const classColor = loc.classification
        ? LESION_CLASSIFICATIONS[loc.classification]?.color ?? "#64748b"
        : "#64748b";
      const badgeText = classification;
      const bw = doc.getTextWidth(badgeText) + 5;
      const bx = pageW - margin - bw - 3;

      // Parse hex color
      const r = parseInt(classColor.slice(1, 3), 16);
      const g = parseInt(classColor.slice(3, 5), 16);
      const b = parseInt(classColor.slice(5, 7), 16);
      doc.setFillColor(r, g, b);
      drawRoundedRect(doc, bx, y + 1.8, bw, 5.5, 1.2, "F");
      doc.setFont("Roboto", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...C.white);
      doc.text(badgeText, bx + 2.5, y + 5.5);
    }

    y += 12;

    // Card body wrapper
    const cardStartY = y;
    doc.setDrawColor(...C.border);

    /* ─── Images Grid ─── */
    if (options.showImages && images.length > 0) {
      const displayImages = images.slice(-4);
      const imgSize = 34;
      const imgGap = 5;
      const totalImgW = displayImages.length * imgSize + (displayImages.length - 1) * imgGap;
      let imgX = margin + 3;

      y = checkPage(doc, y, imgSize + 12, margin);

      for (const img of displayImages) {
        if (imgX + imgSize > pageW - margin) {
          // Overflow — wrap to next line
          imgX = margin + 3;
          y += imgSize + 10;
          y = checkPage(doc, y, imgSize + 12, margin);
        }

        const cacheBuster = `${Date.now()}_${img.id}`;
        const imgUrl = `https://api.derm247.ch/storage/${img.file_path}?v=${cacheBuster}`;
        if (imageCache[img.id] === undefined) {
          imageCache[img.id] = await loadImageAsBase64(imgUrl);
        }
        const base64 = imageCache[img.id];

        // Image frame with shadow effect
        doc.setFillColor(240, 240, 240);
        drawRoundedRect(doc, imgX + 0.3, y + 0.3, imgSize, imgSize, 1.5, "F"); // shadow

        if (base64) {
          try {
            const imageFormat = base64.startsWith("data:image/png") ? "PNG" : "JPEG";
            // Clip area with rounded rect border
            doc.setDrawColor(...C.border);
            doc.setLineWidth(0.3);
            drawRoundedRect(doc, imgX, y, imgSize, imgSize, 1.5, "S");
            doc.addImage(base64, imageFormat, imgX + 0.5, y + 0.5, imgSize - 1, imgSize - 1);
            const originalUrl = `https://api.derm247.ch/storage/${img.file_path}`;
            doc.link(imgX, y, imgSize, imgSize, { url: originalUrl });
          } catch {
            doc.setFillColor(...C.cardBg);
            drawRoundedRect(doc, imgX, y, imgSize, imgSize, 1.5, "F");
            doc.setFontSize(7);
            doc.setTextColor(...C.textMuted);
            doc.text("Nicht verfügbar", imgX + imgSize / 2, y + imgSize / 2, { align: "center" });
          }
        } else {
          doc.setFillColor(...C.cardBg);
          doc.setDrawColor(...C.border);
          drawRoundedRect(doc, imgX, y, imgSize, imgSize, 1.5, "FD");
          doc.setFontSize(7);
          doc.setTextColor(...C.textMuted);
          doc.text("Nicht verfügbar", imgX + imgSize / 2, y + imgSize / 2, { align: "center" });
        }

        // Date label below image
        doc.setFontSize(6.5);
        doc.setTextColor(...C.textSecondary);
        doc.setFont("Roboto", "normal");
        const imgDate = img.created_at
          ? format(new Date(img.created_at), "dd.MM.yy", { locale: de })
          : "-";
        doc.text(imgDate, imgX + imgSize / 2, y + imgSize + 3.5, { align: "center" });

        // Risk score badge (top-right corner of image)
        if (img.risk_score != null) {
          const sc = img.risk_score;
          const badgeR = 3.5;
          const badgeCx = imgX + imgSize - 2;
          const badgeCy = y + 2;
          doc.setFillColor(...riskColor(sc));
          doc.circle(badgeCx, badgeCy, badgeR, "F");
          doc.setFont("Roboto", "bold");
          doc.setFontSize(7);
          doc.setTextColor(...C.white);
          doc.text(`${sc}`, badgeCx, badgeCy + 1, { align: "center" });
        }

        imgX += imgSize + imgGap;
      }

      y += imgSize + 7;
    }

    /* ─── Risk Score Section ─── */
    const scores = images.map(img => img.risk_score).filter((s): s is number => s != null);
    if (options.showRiskScore && scores.length > 0) {
      y = checkPage(doc, y, 16, margin);

      const latest = scores[scores.length - 1];
      const latestImg = images[images.length - 1];
      const first = scores[0];
      const diff = latest - first;

      // Risk indicator bar
      const barX = margin + 3;
      const barW = Math.min(contentW - 6, 70);
      const barH = 3;

      // Background bar
      doc.setFillColor(230, 230, 230);
      drawRoundedRect(doc, barX, y, barW, barH, 1, "F");

      // Filled portion (score out of 5)
      const fillW = Math.max(barW * (latest / 5), 4);
      doc.setFillColor(...riskColor(latest));
      drawRoundedRect(doc, barX, y, fillW, barH, 1, "F");

      // Score text next to bar
      doc.setFont("Roboto", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...riskColor(latest));
      doc.text(`${latest}/5`, barX + barW + 3, y + 2.5);

      doc.setFont("Roboto", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...C.textSecondary);
      doc.text(`Risiko: ${getRiskLabel(latestImg.risk_level)}`, barX + barW + 12, y + 2.5);

      y += 6;

      // Trend indicator
      if (scores.length >= 2 && diff !== 0) {
        doc.setFontSize(7.5);
        if (diff > 0) {
          doc.setTextColor(...C.riskHigh);
          doc.text(clean(`Verschlechterung (+${diff})`), barX, y);
        } else {
          doc.setTextColor(...C.riskLow);
          doc.text(clean(`Verbesserung (${diff})`), barX, y);
        }
        y += 4;
      } else if (scores.length >= 2) {
        doc.setFontSize(7.5);
        doc.setTextColor(...C.textMuted);
        doc.text("Verlauf stabil", barX, y);
        y += 4;
      }

      doc.setTextColor(0, 0, 0);
      y += 2;
    }

    /* ─── ABCDE Assessment ─── */
    const latestImg = images[images.length - 1];
    const abcdeRows = latestImg ? getAbcdeLabel(latestImg) : [];
    if (options.showAbcde && abcdeRows.length > 0) {
      y = checkPage(doc, y, abcdeRows.length * 5 + 8, margin);

      // Section label
      doc.setFont("Roboto", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...C.textSecondary);
      doc.text("ABCDE-BEWERTUNG", margin + 3, y);
      y += 4;

      // Compact inline pills
      for (const row of abcdeRows) {
        // Key circle
        doc.setFillColor(...C.abcdeKey);
        doc.circle(margin + 5.5, y + 0.5, 2.2, "F");
        doc.setFont("Roboto", "bold");
        doc.setFontSize(7);
        doc.setTextColor(...C.white);
        doc.text(row.key, margin + 5.5, y + 1.3, { align: "center" });

        // Label & value
        doc.setFont("Roboto", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...C.textSecondary);
        doc.text(row.label, margin + 10, y + 1.3);

        doc.setFont("Roboto", "bold");
        doc.setTextColor(...C.textPrimary);
        doc.text(row.value, margin + 32, y + 1.3);

        y += 5;
      }
      y += 2;
    }

    /* ─── Notes ─── */
    if (options.showNotes && latestImg?.note) {
      y = checkPage(doc, y, 10, margin);

      doc.setFont("Roboto", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...C.textSecondary);
      doc.text("NOTIZ", margin + 3, y);
      y += 4;

      doc.setFont("Roboto", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...C.textPrimary);
      const noteLines = doc.splitTextToSize(clean(latestImg.note), contentW - 8);
      for (const nl of noteLines) {
        doc.text(nl, margin + 3, y);
        y += 3.8;
      }
      y += 3;
    }

    /* ─── Spot Separator ─── */
    if (si < locations.length - 1) {
      y += 2;
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.15);
      // Dashed line
      const dashLen = 1.5;
      const gapLen = 1.5;
      let dx = margin;
      while (dx < pageW - margin) {
        doc.line(dx, y, Math.min(dx + dashLen, pageW - margin), y);
        dx += dashLen + gapLen;
      }
      doc.setLineWidth(0.2);
      y += 6;
    }
  }

  /* ═══ FOOTER ON EACH PAGE ══════════════════════════ */
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const fY = pageH - 10;

    // Accent line
    doc.setDrawColor(...C.headerAccent);
    doc.setLineWidth(0.4);
    doc.line(margin, fY - 2, pageW - margin, fY - 2);
    doc.setLineWidth(0.2);

    // Left: branding
    doc.setFont("Roboto", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...C.headerBg);
    doc.text("DERM", margin, fY + 1);
    doc.setTextColor(...C.headerAccent);
    doc.text("247", margin + doc.getTextWidth("DERM"), fY + 1);

    // Center: disclaimer
    doc.setFont("Roboto", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...C.textMuted);
    doc.text("Vertraulich — Ausschliesslich zur medizinischen Dokumentation", pageW / 2, fY + 1, { align: "center" });

    // Right: page
    doc.setFont("Roboto", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.textSecondary);
    doc.text(`${i} / ${totalPages}`, pageW - margin, fY + 1, { align: "right" });
  }

  /* ═══ OUTPUT ════════════════════════════════════════ */
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
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
  } catch {
    doc.save(filename);
  }
}

export function getPatientPdfFilename(patient: { name: string }): string {
  return `Derm247_${patient.name.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`;
}
