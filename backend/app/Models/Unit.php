<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Unit extends Model
{
    protected $fillable = ['nama', 'keterangan'];

    public function materials()
    {
        return $this->hasMany(Material::class, 'unit_id', 'id');
    }
}
