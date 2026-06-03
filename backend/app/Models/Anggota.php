<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Estate;

class Anggota extends Model
{
    protected $table = 'anggotas';
    protected $primaryKey = 'sap_id';
    public $incrementing = false;
    protected $keyType = 'string';

    const CREATED_AT = 'create_date';
    const UPDATED_AT = 'update_date';

    protected $fillable = [
        'sap_id',
        'login_name',
        'nik',
        'nama',
        'position',
        'supervisor',
        'email',
        'section_id',
        'estate_id',
        'company_code',
        'cost_center',
        'contract_status',
        'join_date',
        'gender',
        'not_active',
        'create_by',
        'update_by',
    ];

    public function section()
    {
        return $this->belongsTo(Section::class);
    }

    public function estate()
    {
        return $this->belongsTo(Estate::class);
    }
}
