<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UnmappedCostCenter extends Model
{
    public const SOURCE_ERP_LOGIN = 'erp_login';

    public const STATUS_PENDING = 'pending';
    public const STATUS_RESOLVED = 'resolved';
    public const STATUS_IGNORED = 'ignored';

    protected $fillable = [
        'cost_center',
        'employee_sap_id',
        'employee_name',
        'login_name',
        'source',
        'status',
        'resolved_by',
        'resolved_at',
        'last_seen_at',
        'notes',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
        'last_seen_at' => 'datetime',
    ];

    public function resolvedBy()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
