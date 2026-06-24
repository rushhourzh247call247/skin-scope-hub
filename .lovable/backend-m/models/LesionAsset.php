<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LesionAsset extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'lesion_id', 'kind', 'file_path', 'payload_json',
        'taken_at', 'sort_order',
        'created_by', 'updated_by', 'deleted_by',
    ];

    protected $casts = [
        'payload_json' => 'array',
        'taken_at' => 'datetime',
    ];

    public function lesion()
    {
        return $this->belongsTo(Lesion::class);
    }
}
