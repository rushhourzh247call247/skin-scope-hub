<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Lesion extends Model
{
    use SoftDeletes;

    // UUID-PK – Identität bleibt dauerhaft, niemals neu vergeben.
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'company_id', 'patient_id', 'clinical_photo_id',
        'label', 'x_pct', 'y_pct', 'notes',
        'created_by', 'updated_by', 'deleted_by',
    ];

    protected $casts = [
        'x_pct' => 'float',
        'y_pct' => 'float',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }
        });
    }

    public function assets()
    {
        return $this->hasMany(LesionAsset::class);
    }

    public function clinicalPhoto()
    {
        return $this->belongsTo(ClinicalPhoto::class);
    }
}
