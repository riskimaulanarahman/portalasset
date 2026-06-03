<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Section extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'section',
        'section_full',
        'keterangan',
        'not_active',
    ];

    public function categories()
    {
        return $this->hasMany(Category::class);
    }

    public function materials()
    {
        return $this->hasMany(Material::class);
    }
}
