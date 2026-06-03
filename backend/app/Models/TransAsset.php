<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class TransAsset extends Model
{
    use SoftDeletes;

    protected $table = 'trans_assets';

    public $timestamps = false;

    protected $fillable = [
        'reg_id',
        'date',
        'sap1',
        'nama1',
        'from_',
        'sap2',
        'nama2',
        'section',
        'estate',
        'attachment',
        'keterangan',
        'kondisi',
        'process',
        'date_return',
        'ep',
        'ep_date',
        'rm',
        'rm_date',
        'cost_center',
        'replace_asset',
        'create_by',
        'create_date',
        'update_by',
        'update_date',
    ];

    protected $casts = [
        'date' => 'date',
        'date_return' => 'date',
        'ep_date' => 'datetime',
        'rm_date' => 'datetime',
        'create_date' => 'datetime',
        'update_date' => 'datetime',
    ];

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class, 'reg_id', 'reg_id');
    }

    public function approvalRequests(): MorphMany
    {
        return $this->morphMany(ApprovalRequest::class, null, 'reference_table', 'reference_id');
    }

    public function getApprovalEstateId(): ?int
    {
        return $this->asset?->estate_id;
    }

    public function scopeWriteOff($query)
    {
        return $query->where('process', 'Write Off');
    }
}
