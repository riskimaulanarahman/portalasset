<?php

namespace App\Models;

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

// #7 FIX: SoftDeletes mencegah data material dan history transaksi hilang permanen
// #8 FIX: Auditable mencatat setiap perubahan material ke audit_logs
class Material extends Model
{
    use SoftDeletes, Auditable;
    protected $primaryKey = 'code';
    public $incrementing = false;
    protected $keyType = 'string';

    const CREATED_AT = 'create_date';
    const UPDATED_AT = 'update_date';

    protected $casts = [
        'stock'     => 'float',
        'min_stock' => 'float',
        'price'     => 'float',
        'not_active' => 'boolean',
    ];

    protected $fillable = [
        'code',
        'nama',
        'type',
        'category_id',
        'unit_id',
        'matcode',
        'sn',
        'min_stock',
        'price',
        'stock',
        'pt',
        'section_id',
        'estate_id',
        'not_active',
        'create_by',
        'update_by',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class);
    }

    public function estate()
    {
        return $this->belongsTo(Estate::class);
    }
}
