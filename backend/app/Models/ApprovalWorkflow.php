<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApprovalWorkflow extends Model
{
    protected $fillable = [
        'name',
        'module_name',
        'description',
        'is_active',
        'estate_id',
    ];

    public function estate()
    {
        return $this->belongsTo(Estate::class);
    }

    public function steps()
    {
        return $this->hasMany(ApprovalStep::class, 'workflow_id')->orderBy('sequence');
    }
}
