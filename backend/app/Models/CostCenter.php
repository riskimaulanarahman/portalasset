<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CostCenter extends Model
{
    protected $table = 'cost_centers';

    const CREATED_AT = 'created_date';
    const UPDATED_AT = 'update_date';

    protected $fillable = [
        'cost_center',
        'dept',
        'estate',
        'join_estate',
        'estate_id',
        'created_by',
        'update_by',
    ];

    public function mappedEstate()
    {
        return $this->belongsTo(Estate::class, 'estate_id');
    }
}
