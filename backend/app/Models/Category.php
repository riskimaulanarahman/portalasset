<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    const CREATED_AT = 'create_date';
    const UPDATED_AT = 'update_date';

    protected $fillable = [
        'category',
        'section_id',
        'not_active',
        'create_by',
        'update_by',
    ];

    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    public function materials()
    {
        return $this->hasMany(Material::class);
    }
}
