<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AssetTransferHistory extends Model
{
    protected $fillable = [
        'transfer_id',
        'transfer_item_id',
        'asset_id',
        'from_estate_id',
        'to_estate_id',
        'previous_unit_id',
        'new_unit_id',
        'previous_anggota_id',
        'target_anggota_id',
        'notes',
        'processed_by',
        'processed_at',
    ];

    protected $casts = [
        'processed_at' => 'datetime',
    ];

    public function transfer()
    {
        return $this->belongsTo(Transfer::class);
    }

    public function transferItem()
    {
        return $this->belongsTo(TransferItem::class);
    }

    public function asset()
    {
        return $this->belongsTo(Asset::class, 'asset_id', 'reg_id');
    }

    public function fromEstate()
    {
        return $this->belongsTo(Estate::class, 'from_estate_id');
    }

    public function toEstate()
    {
        return $this->belongsTo(Estate::class, 'to_estate_id');
    }

    public function previousAnggota()
    {
        return $this->belongsTo(Anggota::class, 'previous_anggota_id', 'sap_id');
    }

    public function targetAnggota()
    {
        return $this->belongsTo(Anggota::class, 'target_anggota_id', 'sap_id');
    }
}
