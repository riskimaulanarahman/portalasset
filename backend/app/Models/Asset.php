<?php

namespace App\Models;

use App\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

// #7 FIX: SoftDeletes mencegah data asset hilang permanen
// #8 FIX: Auditable mencatat setiap perubahan asset ke audit_logs
class Asset extends Model
{
    use SoftDeletes, Auditable;
    protected $primaryKey = 'reg_id';
    public $incrementing = false;
    protected $keyType = 'string';

    const CREATED_AT = 'create_date';
    const UPDATED_AT = 'update_date';

    protected $fillable = [
        'reg_id',
        'asset_no',
        'unit_id',
        'date',
        'serial_no',
        'type_id',
        'type',
        'manufacture',
        'series',
        'section_id',
        'alokasi',
        'keterangan',
        'vendor_id',
        'estate_id',
        'attachment',
        'not_active',
        'create_by',
        'update_by',
        'source',
    ];

    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    public function assetReg()
    {
        return $this->belongsTo(AssetReg::class, 'type_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(TransAsset::class, 'reg_id', 'reg_id');
    }

    public function maintenances(): HasMany
    {
        return $this->hasMany(TransMaintenance::class, 'reg_id', 'reg_id');
    }

    public function conditions(): HasMany
    {
        return $this->hasMany(TransCondition::class, 'reg_id', 'reg_id')->orderByDesc('date');
    }

    public function latestCondition(): HasOne
    {
        return $this->hasOne(TransCondition::class, 'reg_id', 'reg_id')->latestOfMany('date');
    }

    public function writeOffRequests(): HasMany
    {
        return $this->hasMany(TransAsset::class, 'reg_id', 'reg_id')->writeOff();
    }

    public function vendor()
    {
        return $this->belongsTo(Vendor::class);
    }

    public function estate()
    {
        return $this->belongsTo(Estate::class);
    }
}
