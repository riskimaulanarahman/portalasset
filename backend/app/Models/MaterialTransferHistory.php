<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MaterialTransferHistory extends Model
{
    protected $fillable = [
        'transfer_id',
        'transfer_item_id',
        'source_material_code',
        'destination_material_code',
        'from_estate_id',
        'to_estate_id',
        'qty',
        'destination_created',
        'source_stock_before',
        'source_stock_after',
        'destination_stock_before',
        'destination_stock_after',
        'notes',
        'processed_by',
        'processed_at',
    ];

    protected $casts = [
        'destination_created' => 'boolean',
        'qty' => 'decimal:1',
        'source_stock_before' => 'decimal:1',
        'source_stock_after' => 'decimal:1',
        'destination_stock_before' => 'decimal:1',
        'destination_stock_after' => 'decimal:1',
        'processed_at' => 'datetime',
    ];

    public function transfer()
    {
        return $this->belongsTo(Transfer::class);
    }

    public function item()
    {
        return $this->belongsTo(TransferItem::class, 'transfer_item_id');
    }

    public function fromEstate()
    {
        return $this->belongsTo(Estate::class, 'from_estate_id');
    }

    public function toEstate()
    {
        return $this->belongsTo(Estate::class, 'to_estate_id');
    }
}
