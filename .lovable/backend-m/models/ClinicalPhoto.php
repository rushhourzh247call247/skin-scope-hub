<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ClinicalPhoto extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'company_id', 'patient_id', 'file_path', 'body_region',
        'taken_at', 'created_by', 'notes',
    ];

    protected $casts = [
        'taken_at' => 'datetime',
    ];

    public function lesions()
    {
        return $this->hasMany(Lesion::class);
    }
}
