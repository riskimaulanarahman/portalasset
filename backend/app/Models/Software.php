<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Software extends Model
{
    protected $table = 'software';

    protected $fillable = [
        'name',
        'vendor_id',
        'estate_id',
        'asset_id',         // #19 FIX: FK ke asset fisik host software ini (nullable)
        'license_key',
        'expiry_date',
        'status',
    ];

    public function vendor()
    {
        return $this->belongsTo(Vendor::class);
    }

    public function estate()
    {
        return $this->belongsTo(Estate::class);
    }

    /**
     * #19 FIX: Relasi ke Asset fisik host software ini.
     * Software di-install pada asset tertentu (PC, server, laptop, dsb).
     */
    public function asset()
    {
        return $this->belongsTo(Asset::class, 'asset_id', 'reg_id');
    }
}
