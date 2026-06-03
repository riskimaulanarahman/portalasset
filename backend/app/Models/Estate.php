<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Estate extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'estate_id',
        'estate',
        'estate_join',
        'business_unit_id',
        'region',
    ];

    public function businessUnit()
    {
        return $this->belongsTo(BusinessUnit::class);
    }

    public function users()
    {
        return $this->hasMany(User::class, 'estate_id');
    }
}
