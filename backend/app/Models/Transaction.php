<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

// #7 FIX: SoftDeletes untuk menjaga histori transaksi material
class Transaction extends Model
{
    use SoftDeletes;

    public $timestamps = false;

    const CREATED_AT = 'create_date';
    const UPDATED_AT = 'update_date';

    protected $fillable = [
        'date',
        'code',
        'type',
        'qty',
        'uav_id',
        'sap1',
        'nama1',
        'sap2',
        'nama2',
        'section',
        'estate',
        'attachment',
        'keterangan',
        'store',
        'create_by',
        'update_by',
        'create_date',
        'update_date',
    ];

    public function material()
    {
        return $this->belongsTo(Material::class, 'code', 'code');
    }

    public function getApprovalEstateId()
    {
        return $this->estate;
    }
}
