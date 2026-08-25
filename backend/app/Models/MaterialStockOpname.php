<?php

namespace App\Models;

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class MaterialStockOpname extends Model
{
    use SoftDeletes, Auditable;

    protected $fillable = [
        'opname_code',
        'estate_id',
        'section_id',
        'opname_date',
        'snapshot_at',
        'status',
        'total_items',
        'counted_items',
        'total_variance_qty',
        'total_variance_value',
        'notes',
        'created_by',
        'submitted_by',
        'submitted_at',
        'posted_by',
        'posted_at',
    ];

    protected $casts = [
        'opname_date' => 'date',
        'snapshot_at' => 'datetime',
        'submitted_at' => 'datetime',
        'posted_at' => 'datetime',
        'total_variance_qty' => 'float',
        'total_variance_value' => 'float',
    ];

    public function estate()
    {
        return $this->belongsTo(Estate::class);
    }

    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    public function items()
    {
        return $this->hasMany(MaterialStockOpnameItem::class, 'opname_id');
    }

    public function logs()
    {
        return $this->hasMany(MaterialStockOpnameLog::class, 'opname_id')->latest();
    }

    public function approvalRequests()
    {
        return $this->hasMany(ApprovalRequest::class, 'reference_id')
            ->where('reference_table', 'material_stock_opnames');
    }

    public function getApprovalEstateId(): ?int
    {
        return $this->estate_id ? (int) $this->estate_id : null;
    }
}
