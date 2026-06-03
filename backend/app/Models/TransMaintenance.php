<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class TransMaintenance extends Model
{
    use SoftDeletes;

    protected $table = 'trans_maintenances';

    public $timestamps = false;

    protected $fillable = [
        'reg_id',
        'terima',
        'target',
        'selesai',
        'sap1',
        'nama1',
        'sap2',
        'nama2',
        'sap3',
        'nama3',
        'sent_',
        'kondisi',
        'keterangan',
        'action_remark',
        'attachment',
        'status',
        'validasi',
        'create_by',
        'create_date',
        'update_by',
        'update_date',
    ];

    protected $casts = [
        'terima' => 'date',
        'target' => 'date',
        'selesai' => 'date',
        'validasi' => 'boolean',
        'create_date' => 'datetime',
        'update_date' => 'datetime',
    ];

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class, 'reg_id', 'reg_id');
    }
}
