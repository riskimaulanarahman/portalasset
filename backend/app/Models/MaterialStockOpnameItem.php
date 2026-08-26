<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MaterialStockOpnameItem extends Model
{
    protected $fillable = [
        'opname_id',
        'material_code',
        'material_name',
        'category_id',
        'unit_id',
        'section_id',
        'system_stock_snapshot',
        'physical_stock',
        'recount_stock',
        'final_physical_stock',
        'variance_qty',
        'price_snapshot',
        'variance_value',
        'variance_type',
        'status',
        'variance_reason',
        'condition_note',
        'stock_before_posting',
        'stock_after_posting',
        'transaction_id',
        'counted_by',
        'counted_at',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'system_stock_snapshot' => 'float',
        'physical_stock' => 'float',
        'recount_stock' => 'float',
        'final_physical_stock' => 'float',
        'variance_qty' => 'float',
        'price_snapshot' => 'float',
        'variance_value' => 'float',
        'counted_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    public function opname()
    {
        return $this->belongsTo(MaterialStockOpname::class, 'opname_id');
    }

    public function material()
    {
        return $this->belongsTo(Material::class, 'material_code', 'code');
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class);
    }

    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    public function transaction()
    {
        return $this->belongsTo(Transaction::class);
    }
}
