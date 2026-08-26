<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DataResetLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'username',
        'domains',
        'deleted_counts',
        'total_deleted',
        'backup_path',
        'backup_success',
        'ip_address',
        'user_agent',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'domains' => 'array',
            'deleted_counts' => 'array',
            'backup_success' => 'boolean',
            'created_at' => 'datetime',
        ];
    }
}
