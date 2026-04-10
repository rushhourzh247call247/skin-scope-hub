import jsPDF from "jspdf";
import i18n from "@/i18n";
import "jspdf-autotable";
import { ROBOTO_REGULAR } from "@/assets/fonts/roboto-regular";
import { ROBOTO_BOLD } from "@/assets/fonts/roboto-bold";
import type { FullPatient, LocationImage, PdfExportOptions, OverviewPin } from "@/types/patient";
import { LESION_CLASSIFICATIONS } from "@/types/patient";
import { formatDate } from "@/lib/dateUtils";
import { api } from "@/lib/api";
import { getAnatomicalName } from "@/lib/anatomyLookup";
import { translateAnatomyName } from "@/lib/anatomyTranslation";
import { renderBodyMap3DThumbnail } from "@/lib/bodyMapRenderer";
import { getClassificationLabel } from "@/lib/classificationTranslation";

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
  const t = i18n.t.bind(i18n);
  if (!level) return "-";
  if (level === "low") return t('pdf.riskLow');
  if (level === "medium") return t('pdf.riskMedium');
  return t('pdf.riskHigh');
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
  const t = i18n.t.bind(i18n);
  const rows: { key: string; label: string; value: string }[] = [];
  if (img.abc_asymmetry != null)
    rows.push({ key: "A", label: t('pdf.asymmetry'), value: img.abc_asymmetry ? t('pdf.asymmetric') : t('pdf.symmetric') });
  if (img.abc_border)
    rows.push({ key: "B", label: t('pdf.borderLabel'), value: img.abc_border === "unregelmaessig" ? t('pdf.borderIrregular') : t('pdf.borderRegular') });
  if (img.abc_color)
    rows.push({ key: "C", label: t('pdf.colorLabel'), value: img.abc_color === "mehrfarbig" ? t('pdf.colorMulti') : t('pdf.colorSingle') });
  if (img.abc_diameter)
    rows.push({ key: "D", label: t('pdf.diameterLabel'), value: img.abc_diameter === "groesser_6mm" ? "> 6 mm" : "< 6 mm" });
  if (img.abc_evolution)
    rows.push({ key: "E", label: t('pdf.evolutionLabel'), value: img.abc_evolution === "veraendert" ? t('pdf.evolutionChanged') : t('pdf.evolutionStable') });
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

/** Loads an image as HTMLImageElement for canvas compositing */
function loadHTMLImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** Composites pins directly onto an overview image using canvas */
async function compositeOverviewWithPins(
  imageUrl: string,
  pins: OverviewPin[],
  spotLocations: FullPatient["locations"],
): Promise<string | null> {
  const img = await loadHTMLImage(imageUrl);
  if (!img) return null;

  const canvas = document.createElement("canvas");
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Draw base image
  ctx.drawImage(img, 0, 0, w, h);

  // Draw each pin
  for (let i = 0; i < pins.length; i++) {
    const pin = pins[i];
    const px = (pin.x_pct / 100) * w;
    const py = (pin.y_pct / 100) * h;
    const spot = spotLocations.find(s => s.id === pin.linked_location_id);
    const cls = spot?.classification;
    const colorHex = cls && cls !== "unclassified"
      ? LESION_CLASSIFICATIONS[cls]?.color ?? "#00a699"
      : "#00a699";

    // Parse hex to rgb
    const r = parseInt(colorHex.slice(1, 3), 16);
    const g = parseInt(colorHex.slice(3, 5), 16);
    const b = parseInt(colorHex.slice(5, 7), 16);

    // Crosshair at exact position
    const crossSize = Math.max(w * 0.012, 6);
    ctx.strokeStyle = `rgb(${r},${g},${b})`;
    ctx.lineWidth = Math.max(w * 0.002, 1.5);
    // Vertical
    ctx.beginPath();
    ctx.moveTo(px, py - crossSize);
    ctx.lineTo(px, py - crossSize * 0.35);
    ctx.moveTo(px, py + crossSize * 0.35);
    ctx.lineTo(px, py + crossSize);
    // Horizontal
    ctx.moveTo(px - crossSize, py);
    ctx.lineTo(px - crossSize * 0.35, py);
    ctx.moveTo(px + crossSize * 0.35, py);
    ctx.lineTo(px + crossSize, py);
    ctx.stroke();

    // Leader line offset
    const labelOffsetX = pin.x_pct > 50 ? -w * 0.04 : w * 0.04;
    const labelOffsetY = pin.y_pct > 30 ? -h * 0.04 : h * 0.04;
    const lx = px + labelOffsetX;
    const ly = py + labelOffsetY;

    // Dashed leader line
    ctx.setLineDash([Math.max(w * 0.004, 3), Math.max(w * 0.003, 2)]);
    ctx.strokeStyle = `rgba(${r},${g},${b},0.6)`;
    ctx.lineWidth = Math.max(w * 0.0015, 1);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    ctx.setLineDash([]);

    // Numbered circle at offset
    const circR = Math.max(w * 0.015, 10);
    ctx.beginPath();
    ctx.arc(lx, ly, circR, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = Math.max(w * 0.002, 1.5);
    ctx.stroke();

    // Number text
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${Math.max(circR * 1.1, 9)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${i + 1}`, lx, ly + 1);

    // Spot name label next to circle
    const label = translateAnatomyName(spot?.name) || spot?.name || pin.label || `Spot ${i + 1}`;
    const labelFontSize = Math.max(w * 0.012, 9);
    ctx.font = `bold ${labelFontSize}px sans-serif`;
    const labelW = ctx.measureText(label).width;
    const labelPadX = labelFontSize * 0.4;
    const labelPadY = labelFontSize * 0.3;
    const labelBoxX = pin.x_pct > 50 ? lx - circR - labelW - labelPadX * 2 - 2 : lx + circR + 2;
    const labelBoxY = ly - labelFontSize / 2 - labelPadY;
    const labelBoxW = labelW + labelPadX * 2;
    const labelBoxH = labelFontSize + labelPadY * 2;

    // Label background
    ctx.fillStyle = "rgba(20,33,52,0.85)";
    const lbr = Math.max(labelBoxH * 0.2, 3);
    ctx.beginPath();
    ctx.moveTo(labelBoxX + lbr, labelBoxY);
    ctx.lineTo(labelBoxX + labelBoxW - lbr, labelBoxY);
    ctx.quadraticCurveTo(labelBoxX + labelBoxW, labelBoxY, labelBoxX + labelBoxW, labelBoxY + lbr);
    ctx.lineTo(labelBoxX + labelBoxW, labelBoxY + labelBoxH - lbr);
    ctx.quadraticCurveTo(labelBoxX + labelBoxW, labelBoxY + labelBoxH, labelBoxX + labelBoxW - lbr, labelBoxY + labelBoxH);
    ctx.lineTo(labelBoxX + lbr, labelBoxY + labelBoxH);
    ctx.quadraticCurveTo(labelBoxX, labelBoxY + labelBoxH, labelBoxX, labelBoxY + labelBoxH - lbr);
    ctx.lineTo(labelBoxX, labelBoxY + lbr);
    ctx.quadraticCurveTo(labelBoxX, labelBoxY, labelBoxX + lbr, labelBoxY);
    ctx.closePath();
    ctx.fill();

    // Label text
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.fillText(label, labelBoxX + labelPadX, ly + 1);
  }

  return canvas.toDataURL("image/jpeg", 0.92);
}

/** Get anatomical zone name for a location */
function getZoneName(loc: { x3d?: number; y3d?: number; z3d?: number; view?: "front" | "back"; name?: string }): string {
  if (loc.x3d != null && loc.y3d != null && loc.z3d != null && loc.view) {
    const germanName = getAnatomicalName(
      Number(loc.x3d),
      Number(loc.y3d),
      Number(loc.z3d),
      loc.view,
    );
    return translateAnatomyName(germanName);
  }
  return translateAnatomyName(loc.name) || loc.name || "–";
}

/* ─── Colors ──────────────────────────────────────────── */

const C = {
  headerBg: [20, 33, 52] as [number, number, number],
  headerAccent: [0, 166, 153] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  textPrimary: [30, 41, 59] as [number, number, number],
  textSecondary: [100, 116, 139] as [number, number, number],
  textMuted: [148, 163, 184] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  cardBg: [248, 250, 252] as [number, number, number],
  summaryBg: [240, 249, 255] as [number, number, number],
  summaryBorder: [186, 230, 253] as [number, number, number],
  riskLow: [22, 163, 74] as [number, number, number],
  riskMed: [202, 138, 4] as [number, number, number],
  riskHigh: [220, 38, 38] as [number, number, number],
  abcdeBg: [245, 243, 255] as [number, number, number],
  abcdeKey: [109, 40, 217] as [number, number, number],
  overviewBg: [236, 253, 245] as [number, number, number],    // emerald-50
  overviewBorder: [167, 243, 208] as [number, number, number], // emerald-200
  zoneBg: [241, 245, 249] as [number, number, number],         // slate-100
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
  const imageCache: Record<string, string | null> = {};
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  registerFonts(doc);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = 0;

  // Separate overview and spot locations
  const allLocations = patient.locations ?? [];
  const overviewLocations = allLocations.filter(l => l.type === "overview");
  const spotLocations = allLocations.filter(l => l.type !== "overview");

  // Fetch pins for all overview locations
  const overviewPinsMap: Record<number, OverviewPin[]> = {};
  for (const ov of overviewLocations) {
    try {
      overviewPinsMap[ov.id] = await api.getOverviewPins(ov.id);
    } catch {
      overviewPinsMap[ov.id] = [];
    }
  }

  /* ═══ HEADER ═══════════════════════════════════════ */
  const headerH = 28;
  doc.setFillColor(...C.headerBg);
  doc.rect(0, 0, pageW, headerH, "F");

  doc.setFillColor(...C.headerAccent);
  doc.rect(0, headerH, pageW, 0.8, "F");

  doc.setFont("Roboto", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...C.white);
  doc.text("DERM", margin, 12);
  doc.setTextColor(...C.headerAccent);
  doc.text("247", margin + doc.getTextWidth("DERM"), 12);

  doc.setFont("Roboto", "normal");
  doc.setFontSize(7);
  doc.setTextColor(180, 200, 220);
  doc.text(i18n.t('pdf.reportTitle'), margin, 17.5);

  doc.setTextColor(...C.white);
  doc.setFontSize(7.5);
  const dateStr = formatDate(new Date(), "dd. MMMM yyyy, HH:mm");
  doc.text(dateStr, pageW - margin, 10, { align: "right" });

  const resolvedDoctor = resolveDoctorName(doctorName);
  if (resolvedDoctor) {
    doc.setFontSize(7);
    doc.setTextColor(180, 200, 220);
    doc.text(`${i18n.t('pdf.doctor')}: ${resolvedDoctor}`, pageW - margin, 15.5, { align: "right" });
  }

  doc.setFontSize(6.5);
  const typeLabel = options.reportType === "lastVisit" ? i18n.t('pdf.lastVisit') : i18n.t('pdf.fullHistory');
  const badgeW = doc.getTextWidth(typeLabel) + 5;
  doc.setFillColor(...C.headerAccent);
  drawRoundedRect(doc, pageW - margin - badgeW, 19, badgeW, 4.5, 1, "F");
  doc.setTextColor(...C.white);
  doc.text(typeLabel, pageW - margin - badgeW + 2.5, 22);

  y = headerH + 4;

  /* ═══ PATIENT INFO CARD ════════════════════════════ */
  // Calculate dynamic height based on content
  const birthDate = patient.birth_date
    ? formatDate(patient.birth_date, "dd.MM.yyyy")
    : "–";
  const infoLine1: string[] = [`${i18n.t('pdf.birthDate')}: ${birthDate}`];
  if (patient.insurance_number) infoLine1.push(`${i18n.t('pdf.insuranceNumber')}: ${patient.insurance_number}`);
  const infoLine2: string[] = [];
  if (patient.email) infoLine2.push(patient.email);
  if (patient.phone) infoLine2.push(patient.phone);
  const cardH = infoLine2.length > 0 ? 18 : 14;

  doc.setFillColor(...C.cardBg);
  doc.setDrawColor(...C.border);
  drawRoundedRect(doc, margin, y, contentW, cardH, 2, "FD");

  doc.setFont("Roboto", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...C.textPrimary);
  doc.text(patient.name, margin + 4, y + 6.5);

  doc.setFont("Roboto", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.textSecondary);
  doc.text(infoLine1.join("   |   "), margin + 4, y + 11.5);

  if (infoLine2.length > 0) {
    doc.text(infoLine2.join("   |   "), margin + 4, y + 16);
  }

  y += cardH + 4;
  /* ═══ DOCTOR SUMMARY ═══════════════════════════════ */
  if (options.doctorSummary.trim()) {
    const summaryLines = doc.splitTextToSize(clean(options.doctorSummary), contentW - 8);
    const textH = summaryLines.length * 3.8 + 6;
    y = checkPage(doc, y, textH + 2, margin);

    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(253, 230, 138);
    drawRoundedRect(doc, margin, y, contentW, textH, 2, "FD");

    doc.setFont("Roboto", "bold");
    doc.setFontSize(7);
    doc.setTextColor(146, 64, 14);
    doc.text(i18n.t('pdf.doctorSummaryTitle'), margin + 4, y + 4);

    doc.setFont("Roboto", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.textPrimary);
    let ty = y + 8;
    for (const line of summaryLines) {
      doc.text(line, margin + 4, ty);
      ty += 3.8;
    }

    y += textH + 3;
  }

  /* ═══ OVERVIEW PHOTOS ══════════════════════════════ */
  if (options.showImages && overviewLocations.length > 0) {
    for (const ov of overviewLocations) {
      const refImage = ov.images?.length
        ? [...ov.images].sort((a, b) =>
            new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
          )[0]
        : null;
      if (!refImage) continue;

      const pins = overviewPinsMap[ov.id] || [];
      const ovName = ov.name || i18n.t('pdf.overviewPhoto');

      // Need ~100mm height for overview section
      y = checkPage(doc, y, 100, margin);

      // Section header
      doc.setFillColor(...C.headerBg);
      drawRoundedRect(doc, margin, y, contentW, 8, 2, "F");
      doc.setFont("Roboto", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...C.headerAccent);
      doc.text(i18n.t('pdf.overviewPhoto'), margin + 4, y + 5.5);
      doc.setTextColor(...C.white);
      doc.setFontSize(9);
      const nameX = margin + 4 + doc.getTextWidth(i18n.t('pdf.overviewPhoto')) + 6;
      doc.text(ovName, nameX > pageW - margin - 10 ? margin + 4 : nameX, y + 5.5);

      // Pin count badge
      if (pins.length > 0) {
        const pinLabel = `${pins.length} ${i18n.t('pdf.markingCount', { count: pins.length })}`.replace(/^\d+\s*/, '');
        doc.setFont("Roboto", "normal");
        doc.setFontSize(7);
        const plW = doc.getTextWidth(pinLabel) + 5;
        doc.setFillColor(...C.headerAccent);
        drawRoundedRect(doc, pageW - margin - plW - 3, y + 1.5, plW, 5, 1, "F");
        doc.setTextColor(...C.white);
        doc.text(pinLabel, pageW - margin - plW - 0.5, y + 5);
      }

      y += 11;

      // Sort all images chronologically
      const sortedImages = [...(ov.images ?? [])].sort(
        (a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
      );
      const oldestImg = sortedImages[0];
      const newestImg = sortedImages.length > 1 ? sortedImages[sortedImages.length - 1] : null;
      const hasComparison = !!newestImg && newestImg.id !== oldestImg?.id;

      // Load oldest image (with pins composited)
      const oldestUrl = oldestImg ? api.resolveImageSrc(oldestImg) : null;
      let oldestBase64: string | null = null;
      if (oldestUrl) {
        if (pins.length > 0) {
          oldestBase64 = await compositeOverviewWithPins(oldestUrl, pins, spotLocations);
        }
        if (!oldestBase64) {
          oldestBase64 = await loadImageAsBase64(oldestUrl);
        }
      }

      // Load newest image if different (without pins — only reference gets pins)
      let newestBase64: string | null = null;
      if (hasComparison && newestImg) {
        const newestUrl = api.resolveImageSrc(newestImg);
        newestBase64 = await loadImageAsBase64(newestUrl);
      }

      if (hasComparison && oldestBase64 && newestBase64) {
        // ── Side-by-side comparison layout ──
        const gap = 4; // mm between images
        const halfW = (contentW - gap) / 2;
        const maxCompH = 75; // mm

        // Helper to calculate proportional image dimensions
        const calcDims = async (base64: string, maxW: number, maxH: number) => {
          const tmp = await loadHTMLImage(base64);
          let w = maxW, h = maxH;
          if (tmp) {
            const aspect = tmp.naturalWidth / tmp.naturalHeight;
            w = maxW;
            h = w / aspect;
            if (h > maxH) { h = maxH; w = h * aspect; }
          }
          return { w, h };
        };

        const oldDims = await calcDims(oldestBase64, halfW, maxCompH);
        const newDims = await calcDims(newestBase64, halfW, maxCompH);
        const rowH = Math.max(oldDims.h, newDims.h);

        y = checkPage(doc, y, rowH + 20, margin);

        // "Älteste" / "Neueste" labels
        doc.setFont("Roboto", "bold");
        doc.setFontSize(7);

        const leftX = margin;
        const rightX = margin + halfW + gap;

        // Left label badge — "REFERENZ"
        doc.setFillColor(...C.headerAccent);
        const refLabel = i18n.t('pdf.reference');
        const refLabelW = doc.getTextWidth(refLabel) + 5;
        drawRoundedRect(doc, leftX + (halfW - oldDims.w) / 2 + 1.5, y + 1.5, refLabelW, 4.5, 1, "F");
        doc.setTextColor(...C.white);
        doc.text(refLabel, leftX + (halfW - oldDims.w) / 2 + 4, y + 4.5);

        // Right label badge — "AKTUELL"
        doc.setFillColor(59, 130, 246);
        const actLabel = i18n.t('pdf.current');
        const actLabelW = doc.getTextWidth(actLabel) + 5;
        drawRoundedRect(doc, rightX + (halfW - newDims.w) / 2 + 1.5, y + 1.5, actLabelW, 4.5, 1, "F");
        doc.setTextColor(...C.white);
        doc.text(actLabel, rightX + (halfW - newDims.w) / 2 + 4, y + 4.5);

        const imgY = y + 7;

        // Draw oldest (left)
        const oldImgX = leftX + (halfW - oldDims.w) / 2;
        doc.setFillColor(220, 220, 220);
        drawRoundedRect(doc, oldImgX + 0.3, imgY + 0.3, oldDims.w, oldDims.h, 2, "F");
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.4);
        drawRoundedRect(doc, oldImgX, imgY, oldDims.w, oldDims.h, 2, "S");
        try {
          const fmt = oldestBase64.startsWith("data:image/png") ? "PNG" : "JPEG";
          doc.addImage(oldestBase64, fmt, oldImgX + 0.5, imgY + 0.5, oldDims.w - 1, oldDims.h - 1);
          doc.link(oldImgX, imgY, oldDims.w, oldDims.h, { url: api.resolveImageSrc(oldestImg) });
        } catch {}

        // Draw newest (right)
        const newImgX = rightX + (halfW - newDims.w) / 2;
        doc.setFillColor(220, 220, 220);
        drawRoundedRect(doc, newImgX + 0.3, imgY + 0.3, newDims.w, newDims.h, 2, "F");
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.4);
        drawRoundedRect(doc, newImgX, imgY, newDims.w, newDims.h, 2, "S");
        try {
          const fmt = newestBase64.startsWith("data:image/png") ? "PNG" : "JPEG";
          doc.addImage(newestBase64, fmt, newImgX + 0.5, imgY + 0.5, newDims.w - 1, newDims.h - 1);
          if (newestImg) doc.link(newImgX, imgY, newDims.w, newDims.h, { url: api.resolveImageSrc(newestImg) });
        } catch {}

        doc.setLineWidth(0.2);
        y = imgY + rowH + 3;

        // Date labels under each image
        doc.setFont("Roboto", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...C.textSecondary);
        if (oldestImg?.created_at) {
          doc.text(
            formatDate(oldestImg.created_at, "dd.MM.yyyy"),
            leftX + halfW / 2, y, { align: "center" }
          );
        }
        if (newestImg?.created_at) {
          doc.text(
            formatDate(newestImg.created_at, "dd.MM.yyyy"),
            rightX + halfW / 2, y, { align: "center" }
          );
        }

        // Time interval badge between dates
        if (oldestImg?.created_at && newestImg?.created_at) {
          const d1 = new Date(oldestImg.created_at);
          const d2 = new Date(newestImg.created_at);
          const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
          let interval = "";
          if (diffDays < 1) interval = i18n.t('common.sameDay');
          else if (diffDays < 30) interval = i18n.t('common.days', { count: diffDays });
          else if (diffDays < 365) {
            const months = Math.round(diffDays / 30);
            interval = i18n.t('common.months', { count: months });
          } else {
            const years = Math.round(diffDays / 365 * 10) / 10;
            interval = i18n.t('common.years', { count: years });
          }

          doc.setFont("Roboto", "normal");
          doc.setFontSize(6.5);
          const iLabel = `${i18n.t('pdf.timePeriod')}: ${interval}`;
          const iLabelW = doc.getTextWidth(iLabel) + 6;
          const iX = margin + (contentW - iLabelW) / 2;
          doc.setFillColor(...C.cardBg);
          doc.setDrawColor(...C.border);
          drawRoundedRect(doc, iX, y + 2, iLabelW, 5, 1, "FD");
          doc.setTextColor(...C.textSecondary);
          doc.text(iLabel, iX + 3, y + 5.5);
          y += 9;
        } else {
          y += 5;
        }

      } else if (oldestBase64) {
        // ── Single image layout (original behavior) ──
        const maxImgW = contentW;
        const maxImgH = 85;
        const tempImg = await loadHTMLImage(oldestBase64);
        let imgW = maxImgW;
        let imgH = maxImgH;
        if (tempImg) {
          const aspect = tempImg.naturalWidth / tempImg.naturalHeight;
          imgW = maxImgW;
          imgH = imgW / aspect;
          if (imgH > maxImgH) { imgH = maxImgH; imgW = imgH * aspect; }
        }

        y = checkPage(doc, y, imgH + 8, margin);

        const imgX = margin + (contentW - imgW) / 2;
        doc.setFillColor(220, 220, 220);
        drawRoundedRect(doc, imgX + 0.5, y + 0.5, imgW, imgH, 2, "F");
        doc.setDrawColor(...C.border);
        doc.setLineWidth(0.4);
        drawRoundedRect(doc, imgX, y, imgW, imgH, 2, "S");
        doc.setLineWidth(0.2);

        try {
          const fmt = oldestBase64.startsWith("data:image/png") ? "PNG" : "JPEG";
          doc.addImage(oldestBase64, fmt, imgX + 0.5, y + 0.5, imgW - 1, imgH - 1);
          if (oldestImg) doc.link(imgX, y, imgW, imgH, { url: api.resolveImageSrc(oldestImg) });
        } catch {
          doc.setFillColor(...C.cardBg);
          drawRoundedRect(doc, imgX, y, imgW, imgH, 2, "F");
          doc.setFontSize(8);
          doc.setTextColor(...C.textMuted);
          doc.text(i18n.t('pdf.imageNotAvailable'), imgX + imgW / 2, y + imgH / 2, { align: "center" });
        }

        y += imgH + 3;

        if (oldestImg?.created_at) {
          doc.setFont("Roboto", "normal");
          doc.setFontSize(7);
          doc.setTextColor(...C.textSecondary);
          doc.text(
            `${i18n.t('pdf.recording')}: ${formatDate(oldestImg.created_at, "dd.MM.yyyy")}`,
            margin + contentW / 2, y, { align: "center" }
          );
          y += 5;
        }
      }

      // Pin legend below overview image
      if (pins.length > 0) {
        y = checkPage(doc, y, pins.length * 5 + 6, margin);

        doc.setFillColor(...C.overviewBg);
        doc.setDrawColor(...C.overviewBorder);
        drawRoundedRect(doc, margin, y, contentW, pins.length * 5 + 5, 2, "FD");

        doc.setFont("Roboto", "bold");
        doc.setFontSize(7);
        doc.setTextColor(...C.textSecondary);
        doc.text(i18n.t('pdf.markings'), margin + 4, y + 4);
        y += 7;

        for (let pi = 0; pi < pins.length; pi++) {
          const pin = pins[pi];
          const spot = spotLocations.find(s => s.id === pin.linked_location_id);
          const spotName = translateAnatomyName(spot?.name) || spot?.name || pin.label || `Spot ${pi + 1}`;
          const cls = spot?.classification;
          const clsLabel = cls && cls !== "unclassified" ? getClassificationLabel(cls) : null;

          // Number circle
          const cx = margin + 7;
          doc.setFillColor(...C.headerAccent);
          doc.circle(cx, y, 2, "F");
          doc.setFont("Roboto", "bold");
          doc.setFontSize(6.5);
          doc.setTextColor(...C.white);
          doc.text(`${pi + 1}`, cx, y + 0.8, { align: "center" });

          // Spot name
          doc.setFont("Roboto", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...C.textPrimary);
          doc.text(spotName, margin + 12, y + 1);

          // Classification if available
          if (clsLabel) {
            doc.setFont("Roboto", "normal");
            doc.setFontSize(7);
            doc.setTextColor(...C.textSecondary);
            doc.text(`(${clsLabel})`, margin + 12 + doc.getTextWidth(spotName) + 2, y + 1);
          }

          y += 5;
        }
        y += 3;
      }

      y += 4;
    }
  }

  /* ═══ SPOT SECTIONS ════════════════════════════════ */
  for (let si = 0; si < spotLocations.length; si++) {
    const loc = spotLocations[si];
    const spotName = translateAnatomyName(loc.name) || loc.name || `Spot #${loc.id}`;
    const classification = loc.classification
      ? getClassificationLabel(loc.classification)
      : null;
    const zoneName = getZoneName(loc);

    let images = [...(loc.images ?? [])].sort(
      (a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
    );
    if (options.reportType === "lastVisit" && images.length > 0) {
      images = [images[images.length - 1]];
    } else if (images.length > 4) {
      // Show oldest + last 3 to avoid cluttering the page
      const oldest = images[0];
      const lastThree = images.slice(-3);
      images = [oldest, ...lastThree];
    }

    // Check if this spot is linked from any overview zone (to skip body map)
    const isLinkedToZone = overviewLocations.some(ov => {
      const pins = overviewPinsMap[ov.id] || [];
      return pins.some(p => p.linked_location_id === loc.id);
    });
    // Find zone reference info for linked spots
    let zoneRef: { zoneName: string; pinIndex: number } | null = null;
    if (isLinkedToZone) {
      for (const ov of overviewLocations) {
        const pins = overviewPinsMap[ov.id] || [];
        const pinIdx = pins.findIndex(p => p.linked_location_id === loc.id);
        if (pinIdx >= 0) {
          zoneRef = {
            zoneName: translateAnatomyName(ov.name) || ov.name || i18n.t('pdf.overviewPhoto'),
            pinIndex: pinIdx + 1,
          };
          break;
        }
      }
    }

    const estimatedH = 14 + (options.showImages && images.length > 0 ? 45 : 0) +
      (options.showRiskScore ? 10 : 0) + (options.showAbcde ? 16 : 0) + (options.showNotes ? 8 : 0);
    y = checkPage(doc, y, Math.min(estimatedH, 70), margin);

    /* ─── Spot Header ─── */
    const spotHeaderH = 10;
    doc.setFillColor(...C.headerBg);
    drawRoundedRect(doc, margin, y, contentW, spotHeaderH, 2, "F");

    // Spot number circle
    doc.setFillColor(...C.headerAccent);
    doc.circle(margin + 5.5, y + spotHeaderH / 2, 2.8, "F");
    doc.setFont("Roboto", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.white);
    doc.text(`${si + 1}`, margin + 5.5, y + spotHeaderH / 2 + 0.8, { align: "center" });

    // Spot name
    doc.setFont("Roboto", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C.white);
    doc.text(spotName, margin + 11, y + spotHeaderH / 2 + 0.8);

    // Zone name inline after spot name
    if (zoneName && zoneName !== "–") {
      doc.setFont("Roboto", "normal");
      doc.setFontSize(7);
      const nameW = doc.getTextWidth(spotName);
      doc.setTextColor(160, 180, 200);
      doc.text(`  ·  ${zoneName}`, margin + 11 + nameW, y + spotHeaderH / 2 + 0.8);
    }

    // Classification badge (top right)
    if (options.showClassification && classification) {
      const classColor = loc.classification
        ? LESION_CLASSIFICATIONS[loc.classification]?.color ?? "#64748b"
        : "#64748b";
      const badgeText = classification;
      doc.setFont("Roboto", "normal");
      doc.setFontSize(6.5);
      const bw = doc.getTextWidth(badgeText) + 4;
      const bx = pageW - margin - bw - 2;

      const cr = parseInt(classColor.slice(1, 3), 16);
      const cg = parseInt(classColor.slice(3, 5), 16);
      const cb = parseInt(classColor.slice(5, 7), 16);
      doc.setFillColor(cr, cg, cb);
      drawRoundedRect(doc, bx, y + (spotHeaderH - 4.5) / 2, bw, 4.5, 1, "F");
      doc.setTextColor(...C.white);
      doc.text(badgeText, bx + 2, y + spotHeaderH / 2 + 0.6);
    }

    y += spotHeaderH + 3;
    /* ─── Body Map Thumbnail + Images Grid ─── */
    const bodyMapW = 24; // mm width for body map thumbnail
    const bodyMapH = 42; // mm height
    const bodyMapGap = 3;
    // Skip body map for spots linked to a zone — they're already shown in the overview image
    const hasBodyMap = !isLinkedToZone && loc.x != null && loc.y != null;
    const bodyMapReserved = hasBodyMap ? bodyMapW + bodyMapGap : 0;

    if (options.showImages && images.length > 0) {
      const displayImages = images.slice(-4);
      const imgW = 32; // fixed width per image
      const imgMaxH = 42; // max height, will be adjusted by aspect ratio
      const imgGap = 4;
      const imagesAreaRight = pageW - margin - bodyMapReserved;
      let imgX = margin + 2;

      // Pre-load all images to determine aspect ratios
      const imageData: { base64: string | null; aspect: number; img: LocationImage }[] = [];
      for (const img of displayImages) {
        const imgUrl = `https://api.derm247.ch/storage/${img.file_path}?v=${Date.now()}_${img.id}`;
        const cacheKey = `img_${img.id}`;
        if (imageCache[cacheKey] === undefined) {
          imageCache[cacheKey] = await loadImageAsBase64(imgUrl);
        }
        const base64 = imageCache[cacheKey];
        let aspect = 3 / 4; // default portrait
        if (base64) {
          const tmpImg = await loadHTMLImage(base64);
          if (tmpImg) aspect = tmpImg.naturalWidth / tmpImg.naturalHeight;
        }
        imageData.push({ base64, aspect, img });
      }

      // Calculate actual heights based on aspect ratios
      const actualHeights = imageData.map(d => Math.min(imgW / d.aspect, imgMaxH));
      const maxRowH = Math.max(...actualHeights);
      const rowH = Math.max(maxRowH + 8, hasBodyMap ? bodyMapH + 4 : 0);
      y = checkPage(doc, y, rowH, margin);

      const imagesStartY = y;

      for (const { base64, aspect, img } of imageData) {
        let drawW = imgW;
        let drawH = Math.min(drawW / aspect, imgMaxH);
        if (drawH === imgMaxH) drawW = drawH * aspect;

        if (imgX + drawW > imagesAreaRight) {
          imgX = margin + 2;
          y += maxRowH + 8;
          y = checkPage(doc, y, drawH + 8, margin);
        }

        // Center vertically in row
        const yOffset = (maxRowH - drawH) / 2;

        if (base64) {
          try {
            const imageFormat = base64.startsWith("data:image/png") ? "PNG" : "JPEG";
            doc.setDrawColor(...C.border);
            doc.setLineWidth(0.25);
            drawRoundedRect(doc, imgX, y + yOffset, drawW, drawH, 1.5, "S");
            doc.addImage(base64, imageFormat, imgX + 0.3, y + yOffset + 0.3, drawW - 0.6, drawH - 0.6);
            const originalUrl = `https://api.derm247.ch/storage/${img.file_path}`;
            doc.link(imgX, y + yOffset, drawW, drawH, { url: originalUrl });
          } catch {
            doc.setFillColor(...C.cardBg);
            drawRoundedRect(doc, imgX, y + yOffset, drawW, drawH, 1.5, "F");
            doc.setFontSize(6.5);
            doc.setTextColor(...C.textMuted);
            doc.text(i18n.t('pdf.imageNotAvailable'), imgX + drawW / 2, y + yOffset + drawH / 2, { align: "center" });
          }
        } else {
          doc.setFillColor(...C.cardBg);
          doc.setDrawColor(...C.border);
          drawRoundedRect(doc, imgX, y + yOffset, drawW, drawH, 1.5, "FD");
          doc.setFontSize(6.5);
          doc.setTextColor(...C.textMuted);
          doc.text(i18n.t('pdf.imageNotAvailable'), imgX + drawW / 2, y + yOffset + drawH / 2, { align: "center" });
        }

        // Date label
        doc.setFontSize(6);
        doc.setTextColor(...C.textSecondary);
        doc.setFont("Roboto", "normal");
        const imgDate = img.created_at ? formatDate(img.created_at, "dd.MM.yy") : "-";
        doc.text(imgDate, imgX + drawW / 2, y + yOffset + drawH + 3, { align: "center" });

        // Risk score badge
        if (img.risk_score != null) {
          const sc = img.risk_score;
          const badgeR = 3;
          const badgeCx = imgX + drawW - 2;
          const badgeCy = y + yOffset + 2;
          doc.setFillColor(...riskColor(sc));
          doc.circle(badgeCx, badgeCy, badgeR, "F");
          doc.setDrawColor(...C.white);
          doc.setLineWidth(0.4);
          doc.circle(badgeCx, badgeCy, badgeR, "S");
          doc.setLineWidth(0.2);
          doc.setFont("Roboto", "bold");
          doc.setFontSize(7);
          doc.setTextColor(...C.white);
          doc.text(`${sc}`, badgeCx, badgeCy + 0.8, { align: "center" });
        }

        imgX += drawW + imgGap;
      }

      // Draw body map thumbnail on the right
      if (hasBodyMap) {
        const bmX = pageW - margin - bodyMapW;
        const bmY = imagesStartY;
        const locView = loc.view || "front";
        const accentColor = loc.classification && loc.classification !== "unclassified"
          ? LESION_CLASSIFICATIONS[loc.classification]?.color ?? "#00a699"
          : "#00a699";

        const bodyMapBase64 = await renderBodyMap3DThumbnail({
          xPct: loc.x, yPct: loc.y, view: locView, accentColor,
          x3d: loc.x3d, y3d: loc.y3d, z3d: loc.z3d,
          nx: loc.nx, ny: loc.ny, nz: loc.nz,
          gender: patient.gender === "female" ? "female" : "male",
        });
        if (bodyMapBase64) {
          doc.setFillColor(...C.cardBg);
          doc.setDrawColor(...C.border);
          drawRoundedRect(doc, bmX, bmY, bodyMapW, bodyMapH, 2, "FD");
          try {
            doc.addImage(bodyMapBase64, "PNG", bmX + 0.5, bmY + 0.5, bodyMapW - 1, bodyMapH - 1);
          } catch {}
        }
      }

      y += maxRowH + 6;
    } else if (hasBodyMap) {
      y = checkPage(doc, y, bodyMapH + 4, margin);
      const bmX = pageW - margin - bodyMapW;
      const bmY = y;
      const locView = loc.view || "front";
      const accentColor = loc.classification && loc.classification !== "unclassified"
        ? LESION_CLASSIFICATIONS[loc.classification]?.color ?? "#00a699"
        : "#00a699";

      const bodyMapBase64 = await renderBodyMap3DThumbnail({
        xPct: loc.x, yPct: loc.y, view: locView, accentColor,
        x3d: loc.x3d, y3d: loc.y3d, z3d: loc.z3d,
        nx: loc.nx, ny: loc.ny, nz: loc.nz,
        gender: patient.gender === "female" ? "female" : "male",
      });
      if (bodyMapBase64) {
        doc.setFillColor(...C.cardBg);
        doc.setDrawColor(...C.border);
        drawRoundedRect(doc, bmX, bmY, bodyMapW, bodyMapH, 2, "FD");
        try {
          doc.addImage(bodyMapBase64, "PNG", bmX + 0.5, bmY + 0.5, bodyMapW - 1, bodyMapH - 1);
        } catch {}
      }

      y += bodyMapH + 3;
    }

    /* ─── Zone reference (for zone-linked spots) ─── */
    if (zoneRef) {
      y = checkPage(doc, y, 6, margin);
      doc.setFont("Roboto", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...C.textSecondary);
      const refText = `→ ${i18n.t('pdf.overviewPhoto')}: ${zoneRef.zoneName}, Pin #${zoneRef.pinIndex}`;
      doc.text(refText, margin + 2, y + 1);
      y += 5;
    }

    /* ─── ABCDE ─── */
    const latestImg = images[images.length - 1];
    const abcdeRows = latestImg ? getAbcdeLabel(latestImg) : [];
    const hasAbcde = options.showAbcde && abcdeRows.length > 0;

    if (hasAbcde) {
      const sectionH = abcdeRows.length * 4.2 + 6;
      y = checkPage(doc, y, sectionH, margin);

      const abcdeX = margin + 2;
      let abcdeY = y;

      doc.setFont("Roboto", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...C.textSecondary);
      doc.text("ABCDE", abcdeX, abcdeY);
      abcdeY += 3.5;

      for (const row of abcdeRows) {
        doc.setFillColor(...C.abcdeKey);
        doc.circle(abcdeX + 2, abcdeY + 0.3, 1.8, "F");
        doc.setFont("Roboto", "bold");
        doc.setFontSize(6);
        doc.setTextColor(...C.white);
        doc.text(row.key, abcdeX + 2, abcdeY + 1, { align: "center" });

        doc.setFont("Roboto", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...C.textSecondary);
        doc.text(row.label, abcdeX + 6, abcdeY + 1);

        doc.setFont("Roboto", "bold");
        doc.setTextColor(...C.textPrimary);
        doc.text(row.value, abcdeX + 22, abcdeY + 1);

        abcdeY += 4;
      }

      y = abcdeY + 2;
      doc.setTextColor(0, 0, 0);
      y += 1;
    }

    /* ─── Notes ─── */
    if (options.showNotes && latestImg?.note) {
      y = checkPage(doc, y, 8, margin);

      doc.setFont("Roboto", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...C.textSecondary);
      doc.text(i18n.t('pdf.notesTitle'), margin + 2, y);
      y += 3.5;

      doc.setFont("Roboto", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...C.textPrimary);
      const noteLines = doc.splitTextToSize(clean(latestImg.note), contentW - 6);
      for (const nl of noteLines) {
        doc.text(nl, margin + 2, y);
        y += 3.5;
      }
      y += 2;
    }

    /* ─── Spot Separator ─── */
    if (si < spotLocations.length - 1) {
      y += 1;
      doc.setDrawColor(...C.border);
      doc.setLineWidth(0.15);
      let dx = margin;
      while (dx < pageW - margin) {
        doc.line(dx, y, Math.min(dx + 1.5, pageW - margin), y);
        dx += 3;
      }
      doc.setLineWidth(0.2);
      y += 4;
    }
  }

  /* ═══ FOOTER ON EACH PAGE ══════════════════════════ */
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const fY = pageH - 10;

    doc.setDrawColor(...C.headerAccent);
    doc.setLineWidth(0.4);
    doc.line(margin, fY - 2, pageW - margin, fY - 2);
    doc.setLineWidth(0.2);

    doc.setFont("Roboto", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...C.headerBg);
    doc.text("DERM", margin, fY + 1);
    doc.setTextColor(...C.headerAccent);
    doc.text("247", margin + doc.getTextWidth("DERM"), fY + 1);

    doc.setFont("Roboto", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...C.textMuted);
    doc.text(i18n.t('pdf.confidentialFooter'), pageW / 2, fY + 1, { align: "center" });

    doc.setFont("Roboto", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.textSecondary);
    doc.text(`${i} / ${totalPages}`, pageW - margin, fY + 1, { align: "right" });
  }

  /* ═══ OUTPUT ════════════════════════════════════════ */
  const filename = `Derm247_${patient.name.replace(/\s+/g, "_")}_${formatDate(new Date(), "yyyy-MM-dd")}.pdf`;
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
  return `Derm247_${patient.name.replace(/\s+/g, "_")}_${formatDate(new Date(), "yyyy-MM-dd")}.pdf`;
}
