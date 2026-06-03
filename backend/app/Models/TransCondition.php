<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransCondition extends Model
{
    protected $table = 'trans_conditions';

    public $timestamps = false;

    protected $fillable = [
        'reg_id',
        'date',
        'kondisi',
        'remarks',
        'create_by',
        'create_date',
        'update_by',
        'update_date',
    ];

    protected $casts = [
        'date' => 'date',
        'create_date' => 'datetime',
        'update_date' => 'datetime',
    ];

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class, 'reg_id', 'reg_id');
    }
}
