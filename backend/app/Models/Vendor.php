<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Vendor extends Model
{
    protected $fillable = ['nama', 'alamat', 'telepon', 'email', 'pic'];

    public function assets()
    {
        return $this->hasMany(Asset::class);
    }

    public function software()
    {
        return $this->hasMany(Software::class);
    }
}
