<?php
// In routes/api.php innerhalb der Sanctum-geschützten Gruppe einfügen:

use App\Http\Controllers\MobileMarkerController;

Route::middleware(['auth:sanctum'])->prefix('m')->group(function () {
    // Clinical Photos
    Route::get('patients/{patientId}/clinical-photos', [MobileMarkerController::class, 'indexPhotos']);
    Route::post('patients/{patientId}/clinical-photos', [MobileMarkerController::class, 'storePhoto']);
    Route::get('clinical-photos/{id}', [MobileMarkerController::class, 'showPhoto']);
    Route::delete('clinical-photos/{id}', [MobileMarkerController::class, 'destroyPhoto']);

    // Lesions
    Route::get('patients/{patientId}/lesions', [MobileMarkerController::class, 'indexLesions']);
    Route::post('clinical-photos/{photoId}/lesions', [MobileMarkerController::class, 'storeLesion']);
    Route::get('lesions/{id}', [MobileMarkerController::class, 'showLesion']);
    Route::patch('lesions/{id}', [MobileMarkerController::class, 'updateLesion']);
    Route::delete('lesions/{id}', [MobileMarkerController::class, 'destroyLesion']);

    // Lesion Assets
    Route::post('lesions/{lesionId}/assets', [MobileMarkerController::class, 'storeAsset']);
    Route::delete('lesion-assets/{id}', [MobileMarkerController::class, 'destroyAsset']);
});
