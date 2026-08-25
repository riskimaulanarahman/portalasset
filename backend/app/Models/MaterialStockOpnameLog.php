<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MaterialStockOpnameLog extends Model
{
    protected $fillable = [
        'opname_id',
        'item_id',
        'action',
        'actor',
        'old_values',
        'new_values',
        'notes',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
    ];

    public function opname()
    {
        return $this->belongsTo(MaterialStockOpname::class, 'opname_id');
    }

    public function item()
    {
        return $this->belongsTo(MaterialStockOpnameItem::class, 'item_id');
    }
}
