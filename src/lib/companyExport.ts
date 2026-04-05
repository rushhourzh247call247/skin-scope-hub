import JSZip from "jszip";
import i18n from "@/i18n";
import { saveAs } from "file-saver";
import { api } from "./api";

interface ExportProgress {
  phase: string;
  current: number;
  total: number;
}

export async function exportCompanyData(
  companyId: number,
  companyName: string,
  onProgress?: (p: ExportProgress) => void
) {
  const t = i18n.t.bind(i18n);
  const zip = new JSZip();
  const imagesFolder = zip.folder("images")!;

  // 1. Fetch all patients for this company
  onProgress?.({ phase: t('companyExport.loadingPatients'), current: 0, total: 1 });
  let patients: any[];
  try {
    patients = await api.getPatientsByCompany(companyId);
  } catch {
    patients = await api.getPatients();
  }

  // 2. Fetch full data for each patient
  const fullPatients: any[] = [];
  for (let i = 0; i < patients.length; i++) {
    onProgress?.({ phase: t('companyExport.loadingPatientData'), current: i + 1, total: patients.length });
    try {
      const full = await api.getFullPatient(patients[i].id);
      fullPatients.push(full);
    } catch {
      fullPatients.push({ ...patients[i], locations: [] });
    }
  }

  // 3. Collect all image URLs and download them
  const imageEntries: { path: string; url: string }[] = [];
  for (const patient of fullPatients) {
    for (const loc of patient.locations || []) {
      for (const img of loc.images || []) {
        const url = api.resolveImageSrc(img);
        if (!url) continue;
        const ext = url.split(".").pop()?.split("?")[0] || "jpg";
        const imgPath = `patient_${patient.id}/${loc.type || "spot"}_${loc.id}/img_${img.id}.${ext}`;
        imageEntries.push({ path: imgPath, url });
        img._export_path = `images/${imgPath}`;
      }
    }
  }

  // Download images in batches of 5
  const batchSize = 5;
  for (let i = 0; i < imageEntries.length; i += batchSize) {
    onProgress?.({ phase: t('companyExport.downloadingImages'), current: Math.min(i + batchSize, imageEntries.length), total: imageEntries.length });
    const batch = imageEntries.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (entry) => {
        const res = await fetch(entry.url);
        if (!res.ok) throw new Error(`Failed: ${entry.url}`);
        return { path: entry.path, blob: await res.blob() };
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled") {
        imagesFolder.file(r.value.path, r.value.blob);
      }
    }
  }

  // 4. Build manifest
  const manifest = {
    export_version: "1.0",
    exported_at: new Date().toISOString(),
    company: { id: companyId, name: companyName },
    patient_count: fullPatients.length,
    image_count: imageEntries.length,
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // 5. Build patients.json
  const exportData = fullPatients.map((p) => ({
    id: p.id,
    name: p.name,
    birth_date: p.birth_date,
    gender: p.gender,
    email: p.email,
    phone: p.phone,
    insurance_number: p.insurance_number,
    notes: p.notes,
    created_at: p.created_at,
    locations: (p.locations || []).map((loc: any) => ({
      id: loc.id,
      name: loc.name,
      type: loc.type,
      x: loc.x,
      y: loc.y,
      view: loc.view,
      classification: loc.classification,
      op_status: loc.op_status,
      x3d: loc.x3d, y3d: loc.y3d, z3d: loc.z3d,
      nx: loc.nx, ny: loc.ny, nz: loc.nz,
      width: loc.width, height: loc.height,
      created_at: loc.created_at,
      images: (loc.images || []).map((img: any) => ({
        id: img.id,
        note: img.note,
        export_path: img._export_path,
        abc_asymmetry: img.abc_asymmetry,
        abc_border: img.abc_border,
        abc_color: img.abc_color,
        abc_diameter: img.abc_diameter,
        abc_evolution: img.abc_evolution,
        risk_score: img.risk_score,
        risk_level: img.risk_level,
        ai_analysis: img.ai_analysis,
        created_at: img.created_at,
      })),
      findings: (loc.findings || []).map((f: any) => ({
        id: f.id,
        description: f.description,
        user_name: f.user_name,
        created_at: f.created_at,
      })),
    })),
  }));
  zip.file("patients.json", JSON.stringify(exportData, null, 2));

  // 6. Generate ZIP
  onProgress?.({ phase: t('companyExport.creatingZip'), current: 1, total: 1 });
  const blob = await zip.generateAsync({ type: "blob" });
  const safeName = companyName.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, "_");
  const date = new Date().toISOString().slice(0, 10);
  saveAs(blob, `export_${safeName}_${date}.zip`);
}
