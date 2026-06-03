<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BusinessUnit extends Model
{
    protected $fillable = ['bu_code', 'bu_name'];

    public function estates()
    {
        return $this->hasMany(Estate::class);
    }
}
