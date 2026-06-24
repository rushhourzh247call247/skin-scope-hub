<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('clinical_photos', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('patient_id');
            $table->string('file_path');
            $table->string('body_region')->nullable();
            $table->timestamp('taken_at')->useCurrent();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['company_id', 'patient_id']);
            $table->foreign('patient_id')->references('id')->on('patients')->cascadeOnDelete();
        });

        Schema::create('lesions', function (Blueprint $table) {
            // UUID-PK: dauerhafte Identität (L5 bleibt L5, ID ändert sich nie)
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('company_id');
            $table->unsignedBigInteger('patient_id');
            $table->unsignedBigInteger('clinical_photo_id');
            $table->string('label'); // L1, L2, ... – beim Anlegen einmal vergeben
            $table->float('x_pct');  // 0..1
            $table->float('y_pct');  // 0..1
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->unsignedBigInteger('deleted_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['company_id', 'patient_id']);
            $table->index(['patient_id', 'label']);
            $table->foreign('patient_id')->references('id')->on('patients')->cascadeOnDelete();
            $table->foreign('clinical_photo_id')->references('id')->on('clinical_photos')->cascadeOnDelete();
        });

        Schema::create('lesion_assets', function (Blueprint $table) {
            $table->id();
            $table->uuid('lesion_id');
            $table->string('kind'); // clinical|dermoscopy|finding|abcde|ai
            $table->string('file_path')->nullable();
            $table->json('payload_json')->nullable();
            $table->timestamp('taken_at')->useCurrent();
            $table->integer('sort_order')->default(0);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->unsignedBigInteger('deleted_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['lesion_id', 'sort_order']);
            $table->foreign('lesion_id')->references('id')->on('lesions')->cascadeOnDelete();
        });

        // Historie-Hülle – in Stufe 1 wird hier nur 'created' geschrieben.
        Schema::create('lesion_events', function (Blueprint $table) {
            $table->id();
            $table->uuid('lesion_id');
            $table->string('event_type'); // created|moved|relabeled|deleted|restored
            $table->json('payload_json')->nullable();
            $table->unsignedBigInteger('actor_user_id')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['lesion_id', 'created_at']);
            $table->foreign('lesion_id')->references('id')->on('lesions')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lesion_events');
        Schema::dropIfExists('lesion_assets');
        Schema::dropIfExists('lesions');
        Schema::dropIfExists('clinical_photos');
    }
};
