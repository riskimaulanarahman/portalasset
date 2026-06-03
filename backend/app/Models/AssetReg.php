<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AssetReg extends Model
{
    const CREATED_AT = 'create_date';
    const UPDATED_AT = 'update_date';

    protected $fillable = [
        'asset_type_id',
        'manufacturer_id',
        'series',
        'matcode',
        'description',
        'section_id',
        'not_active',
        'create_by',
        'update_by',
    ];

    public function manufacturer()
    {
        return $this->belongsTo(Manufacturer::class);
    }

    public function assetType()
    {
        return $this->belongsTo(AssetType::class);
    }

    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    public function assets()
    {
        return $this->hasMany(Asset::class, 'type_id');
    }
}
