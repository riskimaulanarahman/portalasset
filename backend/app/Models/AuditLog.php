<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// #8 FIX: Model untuk menyimpan audit trail perubahan data
class AuditLog extends Model
{
    protected $fillable = [
        'model_type',
        'model_id',
        'action',
        'user_id',
        'username',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
    ];

    /**
     * Relasi ke user yang melakukan perubahan
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
