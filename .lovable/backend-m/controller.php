<?php

namespace App\Http\Controllers;

use App\Models\ClinicalPhoto;
use App\Models\Lesion;
use App\Models\LesionAsset;
use App\Models\Patient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Mobile-Marker-Workflow (FotoFinder-Prinzip).
 * Strikte Multi-Tenancy: jede Query filtert auf company_id des Auth-Users.
 *
 * Marker-ID (UUID) bleibt dauerhaft – Verschieben ändert nur x_pct/y_pct.
 * Label wird beim Anlegen einmalig vergeben (max(label)+1) und NIE
 * automatisch verändert. Auch nicht beim Löschen anderer Marker.
 */
class MobileMarkerController extends Controller
{
    private function user(Request $r)
    {
        return $r->user();
    }

    private function ensurePatient(Request $r, int $patientId): Patient
    {
        $u = $this->user($r);
        $p = Patient::where('id', $patientId)
            ->where('company_id', $u->company_id)
            ->firstOrFail();
        return $p;
    }

    // -------- Clinical Photos --------

    public function indexPhotos(Request $r, int $patientId)
    {
        $this->ensurePatient($r, $patientId);
        $u = $this->user($r);
        return ClinicalPhoto::where('patient_id', $patientId)
            ->where('company_id', $u->company_id)
            ->orderByDesc('taken_at')
            ->get()
            ->map(function ($p) {
                $arr = $p->toArray();
                $arr['lesion_count'] = $p->lesions()->count();
                return $arr;
            });
    }

    public function storePhoto(Request $r, int $patientId)
    {
        $this->ensurePatient($r, $patientId);
        $u = $this->user($r);
        $r->validate([
            'photo' => 'required|file|image|max:20480',
            'body_region' => 'nullable|string|max:120',
        ]);
        $path = $r->file('photo')->store('clinical_photos');
        $photo = ClinicalPhoto::create([
            'company_id' => $u->company_id,
            'patient_id' => $patientId,
            'file_path' => basename($path),
            'body_region' => $r->input('body_region'),
            'taken_at' => now(),
            'created_by' => $u->id,
        ]);
        return $photo;
    }

    public function showPhoto(Request $r, int $id)
    {
        $u = $this->user($r);
        $photo = ClinicalPhoto::where('id', $id)
            ->where('company_id', $u->company_id)
            ->firstOrFail();
        $lesions = Lesion::where('clinical_photo_id', $id)
            ->where('company_id', $u->company_id)
            ->orderBy('created_at')
            ->get();
        return ['photo' => $photo, 'lesions' => $lesions];
    }

    public function destroyPhoto(Request $r, int $id)
    {
        $u = $this->user($r);
        $photo = ClinicalPhoto::where('id', $id)
            ->where('company_id', $u->company_id)
            ->firstOrFail();
        $photo->delete();
        return response()->noContent();
    }

    // -------- Lesions --------

    public function indexLesions(Request $r, int $patientId)
    {
        $this->ensurePatient($r, $patientId);
        $u = $this->user($r);
        return Lesion::where('patient_id', $patientId)
            ->where('company_id', $u->company_id)
            ->orderBy('created_at')
            ->get()
            ->map(function ($l) {
                $arr = $l->toArray();
                $arr['asset_count'] = $l->assets()->count();
                return $arr;
            });
    }

    public function showLesion(Request $r, string $id)
    {
        $u = $this->user($r);
        $lesion = Lesion::where('id', $id)
            ->where('company_id', $u->company_id)
            ->firstOrFail();
        $assets = LesionAsset::where('lesion_id', $id)
            ->orderBy('sort_order')
            ->orderBy('taken_at')
            ->get();
        return ['lesion' => $lesion, 'assets' => $assets];
    }

    public function storeLesion(Request $r, int $photoId)
    {
        $u = $this->user($r);
        $photo = ClinicalPhoto::where('id', $photoId)
            ->where('company_id', $u->company_id)
            ->firstOrFail();
        $r->validate([
            'x_pct' => 'required|numeric|min:0|max:1',
            'y_pct' => 'required|numeric|min:0|max:1',
        ]);

        // Label-Nummer: max(numeric label) + 1 pro Patient.
        // Hinweis: gelöschte Marker werden mitgezählt -> Nummern recyclen NIE.
        $maxNum = DB::table('lesions')
            ->where('patient_id', $photo->patient_id)
            ->select(DB::raw('MAX(CAST(SUBSTR(label, 2) AS INTEGER)) as max_num'))
            ->value('max_num');
        $next = (int) ($maxNum ?? 0) + 1;

        $lesion = Lesion::create([
            'company_id' => $u->company_id,
            'patient_id' => $photo->patient_id,
            'clinical_photo_id' => $photo->id,
            'label' => 'L' . $next,
            'x_pct' => (float) $r->input('x_pct'),
            'y_pct' => (float) $r->input('y_pct'),
            'created_by' => $u->id,
        ]);

        DB::table('lesion_events')->insert([
            'lesion_id' => $lesion->id,
            'event_type' => 'created',
            'payload_json' => json_encode(['x' => $lesion->x_pct, 'y' => $lesion->y_pct]),
            'actor_user_id' => $u->id,
            'created_at' => now(),
        ]);

        return $lesion;
    }

    public function updateLesion(Request $r, string $id)
    {
        $u = $this->user($r);
        $lesion = Lesion::where('id', $id)
            ->where('company_id', $u->company_id)
            ->firstOrFail();
        $r->validate([
            'x_pct' => 'nullable|numeric|min:0|max:1',
            'y_pct' => 'nullable|numeric|min:0|max:1',
            'label' => 'nullable|string|max:32',
            'notes' => 'nullable|string',
        ]);
        // ID bleibt unverändert! Nur Position/Label/Notes anpassbar.
        $lesion->fill($r->only(['x_pct', 'y_pct', 'label', 'notes']));
        $lesion->updated_by = $u->id;
        $lesion->save();
        return $lesion;
    }

    public function destroyLesion(Request $r, string $id)
    {
        $u = $this->user($r);
        $lesion = Lesion::where('id', $id)
            ->where('company_id', $u->company_id)
            ->firstOrFail();
        $lesion->deleted_by = $u->id;
        $lesion->save();
        $lesion->delete(); // SoftDelete – Label-Nummer wird NICHT recycelt
        return response()->noContent();
    }

    // -------- Lesion Assets --------

    public function storeAsset(Request $r, string $lesionId)
    {
        $u = $this->user($r);
        $lesion = Lesion::where('id', $lesionId)
            ->where('company_id', $u->company_id)
            ->firstOrFail();
        $r->validate([
            'file' => 'required|file|image|max:20480',
            'kind' => 'required|string|in:clinical,dermoscopy',
        ]);
        $path = $r->file('file')->store('lesion_assets');
        $maxSort = LesionAsset::where('lesion_id', $lesion->id)->max('sort_order') ?? 0;
        return LesionAsset::create([
            'lesion_id' => $lesion->id,
            'kind' => $r->input('kind'),
            'file_path' => basename($path),
            'taken_at' => now(),
            'sort_order' => $maxSort + 1,
            'created_by' => $u->id,
        ]);
    }

    public function destroyAsset(Request $r, int $id)
    {
        $u = $this->user($r);
        $asset = LesionAsset::where('id', $id)->firstOrFail();
        $lesion = Lesion::where('id', $asset->lesion_id)
            ->where('company_id', $u->company_id)
            ->firstOrFail();
        $asset->deleted_by = $u->id;
        $asset->save();
        $asset->delete();
        unset($lesion);
        return response()->noContent();
    }
}
