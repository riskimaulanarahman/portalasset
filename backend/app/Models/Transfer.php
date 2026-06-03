<?php

namespace App\Models;

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

// #7 FIX: SoftDeletes untuk menjaga histori transfer
// #8 FIX: Auditable mencatat setiap perubahan transfer ke audit_logs
class Transfer extends Model
{
    use SoftDeletes, Auditable;
    protected $fillable = [
        'transfer_code',
        'type',
        'from_estate_id',
        'to_estate_id',
        'anggota_id',
        'status',
        'transfer_date',
        'receive_date',
        'notes',
        'created_by',
    ];

    public function items()
    {
        return $this->hasMany(TransferItem::class);
    }

    public function fromEstate()
    {
        return $this->belongsTo(Estate::class, 'from_estate_id');
    }

    public function toEstate()
    {
        return $this->belongsTo(Estate::class, 'to_estate_id');
    }

    public function approvalRequests()
    {
        return $this->morphMany(ApprovalRequest::class, 'reference', 'reference_table', 'reference_id');
    }

    public function materialHistories()
    {
        return $this->hasMany(MaterialTransferHistory::class)->latest('processed_at');
    }

    public function anggotaPenerima()
    {
        return $this->belongsTo(Anggota::class, 'anggota_id', 'sap_id');
    }

    public function getApprovalEstateId()
    {
        return $this->to_estate_id;
    }
}
