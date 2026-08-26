<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TransferItem extends Model
{
    protected $fillable = [
        'transfer_id',
        'item_type',
        'item_id',
        'qty',
        'notes',
    ];

    public function transfer()
    {
        return $this->belongsTo(Transfer::class);
    }

    public function materialHistories()
    {
        return $this->hasMany(MaterialTransferHistory::class, 'transfer_item_id');
    }

    public function assetHistories()
    {
        return $this->hasMany(AssetTransferHistory::class, 'transfer_item_id');
    }
}
